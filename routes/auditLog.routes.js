const express = require("express");
const {
  getAuditLogs,
  getAuditLog,
  createAuditLog,
  getAuditLogStats,
  cleanupAuditLogs,
  getInventoryLocationAuditLogs
} = require("../controllers/auditLog.controller");

const router = express.Router();

// Import middleware
const {
  protect,
  authorize,
  companyScope,
} = require("../middlewares/auth.middleware");

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Audit log routes
router
  .route("/")
  .get(authorize("company_admin", "super_admin", "auditor"), getAuditLogs)
  .post(createAuditLog);

router
  .route("/stats")
  .get(authorize("company_admin", "super_admin", "auditor"), getAuditLogStats);

router
  .route("/inventory-location")
  .get(authorize("company_admin", "super_admin", "auditor"), getInventoryLocationAuditLogs);

router.route("/cleanup").delete(authorize("super_admin"), cleanupAuditLogs);

router
  .route("/:id")
  .get(authorize("company_admin", "super_admin", "auditor"), getAuditLog);

module.exports = router;
