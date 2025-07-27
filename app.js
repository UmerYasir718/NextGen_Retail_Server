const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Database connection
// const connectDB = require('./config/db');
// connectDB();

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const companyRoutes = require("./routes/company.routes");
const planRoutes = require("./routes/plan.routes");
const warehouseRoutes = require("./routes/warehouse.routes");
const zoneRoutes = require("./routes/zone.routes");
const shelfRoutes = require("./routes/shelf.routes");
const binRoutes = require("./routes/bin.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const shipmentRoutes = require("./routes/shipment.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const notificationRoutes = require("./routes/notification.routes");
const reportRoutes = require("./routes/report.routes");
const forecastRoutes = require("./routes/forecast.routes");
const fileRoutes = require("./routes/file.routes");
const uhfReaderRoutes = require("./routes/uhfReader.routes");
const uhfTagRoutes = require("./routes/uhfTag.routes");
const fcmTokenRoutes = require("./routes/fcmToken.routes");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/uhf-readers", uhfReaderRoutes);
app.use("/api/uhf-tags", uhfTagRoutes);
app.use("/api", fcmTokenRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to Windsurf Warehouse Inventory Management System API");
});

// Socket.IO setup for UHF/RFID integration
require("./sockets/uhf")(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .send({ message: "Something went wrong!", error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
