import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { prisma } from "@bahau/database";

const PORT = Number(process.env["PORT"]) || 4000;

const server = app.listen(PORT, () => {
  console.log(`[BAHAU API] Server listening on port ${PORT} (PID: ${process.pid})`);
});

// Graceful shutdown handling
function handleShutdown(signal: string): void {
  console.log(`[BAHAU API] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    console.log("[BAHAU API] HTTP server closed.");
    try {
      await prisma.$disconnect();
      console.log("[BAHAU API] Database disconnected.");
    } catch (err) {
      console.error("[BAHAU API] Error during database disconnect:", err);
    }
    process.exit(0);
  });

  // Force shutdown if taking longer than 5 seconds
  setTimeout(() => {
    console.error("[BAHAU API] Forced shutdown after timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

export default server;
