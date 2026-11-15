
import { Router } from "express";
import { pool } from "../config/database.js";

const router = Router();

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

router.get("/availability", async (req, res) => {
  try {
    const { checkIn, checkOut, roomType } = req.query;

    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
      return res.status(400).json({
        error: "Valid checkIn and checkOut dates are required (YYYY-MM-DD).",
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        error: "Check-out date must be after check-in date.",
      });
    }

    const allowedTypes = ["single", "double", "deluxe", "suite"];

    if (roomType && !allowedTypes.includes(roomType)) {
      return res.status(400).json({
        error: "Invalid room type.",
        allowedTypes,
      });
    }

    const result = await pool.query(
      `SELECT
          r.id,
          r.room_number,
          r.room_type,
          r.capacity,
          r.price_per_night
       FROM rooms r
       WHERE r.is_active = TRUE
         AND ($3::varchar IS NULL OR r.room_type = $3)
         AND NOT EXISTS (
           SELECT 1
           FROM reservations b
           WHERE b.room_id = r.id
             AND b.status = 'confirmed'
             AND daterange(b.check_in, b.check_out, '[)')
                 && daterange($1::date, $2::date, '[)')
         )
       ORDER BY r.price_per_night ASC`,
      [checkIn, checkOut, roomType || null]
    );

    res.status(200).json({
      checkIn,
      checkOut,
      availableCount: result.rows.length,
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Room availability error:", error.message);

    res.status(500).json({
      error: "Unable to fetch room availability.",
    });
  }
});

export default router;
