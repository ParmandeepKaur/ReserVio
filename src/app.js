
import express from "express";
import helmet from "helmet";
import { pool } from "./config/database.js";
import roomsRouter from "./routes/rooms.js";
import reservationsRouter from "./routes/reservations.js";

const app = express();

app.use(helmet());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "ReserVio API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ready",
      database: "connected",
    });
  } catch (error) {
    console.error("Database readiness check failed:", error.message);

    res.status(503).json({
      status: "not ready",
      database: "disconnected",
    });
  }
});

app.use("/api/rooms", roomsRouter);
app.use("/api/reservations", reservationsRouter);

export default app;
