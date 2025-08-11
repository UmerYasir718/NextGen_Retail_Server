const express = require("express");
const {
  getAdminDashboard,
} = require("../controllers/admin.controller");

const router = express.Router();

// Import middleware
const { protect, authorize } = require("../middlewares/auth.middleware");

// Apply protection to all routes
router.use(protect);

// SuperAdmin only routes
router.route("/dashboard").get(authorize("super_admin"), getAdminDashboard);

module.exports = router; 