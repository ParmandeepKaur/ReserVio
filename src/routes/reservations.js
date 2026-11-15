
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";

const router = Router();

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

router.post("/", async (req, res) => {
  const { roomId, guestName, guestEmail, checkIn, checkOut } = req.body ?? {};

  if (
    !Number.isInteger(roomId) ||
    roomId <= 0 ||
    typeof guestName !== "string" ||
    !guestName.trim() ||
    guestName.trim().length > 100 ||
    typeof guestEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) ||
    guestEmail.length > 255 ||
    !isValidDate(checkIn) ||
    !isValidDate(checkOut) ||
    checkOut <= checkIn
  ) {
    return res.status(400).json({
      error: "Invalid reservation details. Check roomId, guest details, and dates.",
    });
  }

  const bookingReference = `RSV-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 12)
    .toUpperCase()}`;

  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    // Serialize reservation creation for the same room.
    const roomResult = await client.query(
      `SELECT id
       FROM rooms
       WHERE id = $1 AND is_active = TRUE
       FOR UPDATE`,
      [roomId]
    );

    if (roomResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Room not found or inactive.",
      });
    }

    const result = await client.query(
      `INSERT INTO reservations
        (booking_reference, room_id, guest_name, guest_email, check_in, check_out)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, booking_reference, room_id, guest_name,
                 guest_email, check_in, check_out, status, created_at`,
      [
        bookingReference,
        roomId,
        guestName.trim(),
        guestEmail.trim(),
        checkIn,
        checkOut,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Reservation created successfully.",
      reservation: result.rows[0],
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Reservation rollback error:", rollbackError.message);
      }
    }

    if (error.code === "23P01") {
      return res.status(409).json({
        error: "This room is already booked for the selected dates.",
      });
    }

    console.error("Reservation creation error:", error.message);

    return res.status(500).json({
      error: "Unable to create reservation.",
    });
  } finally {
    client?.release();
  }
});

export default router;
