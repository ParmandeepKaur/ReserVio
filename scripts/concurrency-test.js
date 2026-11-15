const bookingRequests = [
  {
    roomId: 4,
    guestName: "Guest One",
    guestEmail: "guest1@example.com",
    checkIn: "2026-12-01",
    checkOut: "2026-12-04",
  },
  {
    roomId: 4,
    guestName: "Guest Two",
    guestEmail: "guest2@example.com",
    checkIn: "2026-11-25",
    checkOut: "2026-11-28",
  },
];

const results = await Promise.all(
  bookingRequests.map(async (booking) => {
    const response = await fetch("http://localhost:3000/api/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(booking),
    });

    return {
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
  console.error("\nFAIL: Unexpected concurrency test result.");
  process.exitCode = 1;
}