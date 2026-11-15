import test, { after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/config/database.js";

const testEmail = "reservio-api-test@example.com";
const testDates = {
  checkIn: "2098-11-10",
  checkOut: "2098-11-12",
};

let testRoomId;

test("GET /api/health returns healthy status", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "healthy");
  assert.equal(response.body.service, "ReserVio API");
});

test("GET /api/ready confirms database connection", async () => {
  const response = await request(app).get("/api/ready");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ready");
  assert.equal(response.body.database, "connected");
});

test("Availability rejects invalid dates", async () => {
  const response = await request(app)
    .get("/api/rooms/availability")
    .query({
      checkIn: "2026-11-25",
      checkOut: "2026-11-20",
    });

  assert.equal(response.status, 400);
});

test("Availability rejects invalid room types", async () => {
  const response = await request(app)
    .get("/api/rooms/availability")
    .query({
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
      roomType: "presidential",
    });

  assert.equal(response.status, 400);
});

test("A valid reservation is created and overlapping booking is rejected", async () => {
  const roomResult = await pool.query(
    `INSERT INTO rooms
      (room_number, room_type, capacity, price_per_night)
     VALUES ($1, 'single', 1, 1000)
     RETURNING id`,
    [`TEST-${Date.now()}`]
  );

  testRoomId = roomResult.rows[0].id;

  const bookingDetails = {
    roomId: testRoomId,
    guestName: "API Test Guest",
    guestEmail: testEmail,
    checkIn: testDates.checkIn,
    checkOut: testDates.checkOut,
  };

  const firstResponse = await request(app)
    .post("/api/reservations")
    .send(bookingDetails);

  assert.equal(firstResponse.status, 201);
  assert.equal(firstResponse.body.reservation.status, "confirmed");
  assert.ok(firstResponse.body.reservation.booking_reference);

  const secondResponse = await request(app)
    .post("/api/reservations")
    .send({
      ...bookingDetails,
      guestName: "Second API Test Guest",
      guestEmail: "reservio-api-test-second@example.com",
    });

  assert.equal(secondResponse.status, 409);
});

after(async () => {
  if (testRoomId) {
    await pool.query(
      "DELETE FROM reservations WHERE room_id = $1",
      [testRoomId]
    );

    await pool.query(
      "DELETE FROM rooms WHERE id = $1",
      [testRoomId]
    );
  }

  await pool.end();
});
