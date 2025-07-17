const express = require('express');
const {
  getAuditLogs,
  getAuditLog,
  createAuditLog,
  getAuditLogStats,
  cleanupAuditLogs
} = require('../controllers/auditLog.controller');

const router = express.Router();

// Import middleware
const { protect, authorize, companyScope } = require('../middlewares/auth.middleware');

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Audit log routes
router.route('/')
  .get(authorize('Admin', 'SuperAdmin', 'Auditor'), getAuditLogs)
  .post(createAuditLog);

router.route('/stats')
  .get(authorize('Admin', 'SuperAdmin', 'Auditor'), getAuditLogStats);

router.route('/cleanup')
  .delete(authorize('SuperAdmin'), cleanupAuditLogs);

router.route('/:id')
  .get(authorize('Admin', 'SuperAdmin', 'Auditor'), getAuditLog);

module.exports = router;
