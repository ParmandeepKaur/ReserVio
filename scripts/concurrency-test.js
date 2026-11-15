
import { randomInt } from "node:crypto";

const checkIn = new Date();
checkIn.setUTCDate(checkIn.getUTCDate() + 90 + randomInt(0, 30000));

const checkOut = new Date(checkIn);
checkOut.setUTCDate(checkOut.getUTCDate() + 3);

const formatDate = (date) => date.toISOString().slice(0, 10);

const bookingRequests = [
  {
    roomId: 4,
    guestName: "Concurrent Guest One",
    guestEmail: "concurrent1@example.com",
    checkIn: formatDate(checkIn),
    checkOut: formatDate(checkOut),
  },
  {
    roomId: 4,
    guestName: "Concurrent Guest Two",
    guestEmail: "concurrent2@example.com",
    checkIn: formatDate(checkIn),
    checkOut: formatDate(checkOut),
  },
];

console.log("Testing overlapping dates:", formatDate(checkIn), "to", formatDate(checkOut));

const results = await Promise.all(
  bookingRequests.map(async (booking) => {
    const response = await fetch("http://127.0.0.1:3000/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });

    return {
      guest: booking.guestName,
      status: response.status,
      body: await response.json(),
    };
  })
);

console.log("Concurrent booking results:");
console.log(JSON.stringify(results, null, 2));

const successCount = results.filter((result) => result.status === 201).length;
const conflictCount = results.filter((result) => result.status === 409).length;

if (successCount === 1 && conflictCount === 1) {
  console.log("\nPASS: Only one overlapping reservation was confirmed.");
} else {
  console.error("\nFAIL: Expected one 201 and one 409 response.");
  process.exitCode = 1;
}
