const express = require('express');
const {
  getShipments,
  getShipment,
  createShipment,
  updateShipment,
  deleteShipment,
  uploadShipmentDocument,
  getShipmentStats
} = require('../controllers/shipment.controller');

const router = express.Router();

// Import middleware
const { protect, authorize, companyScope } = require('../middlewares/auth.middleware');

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Shipment routes
router.route('/')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getShipments)
  .post(authorize('Admin', 'SuperAdmin', 'Manager'), createShipment);

router.route('/stats')
  .get(authorize('Admin', 'SuperAdmin', 'Manager'), getShipmentStats);

router.route('/:id')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getShipment)
  .put(authorize('Admin', 'SuperAdmin', 'Manager'), updateShipment)
  .delete(authorize('Admin', 'SuperAdmin'), deleteShipment);

router.route('/:id/document')
  .put(authorize('Admin', 'SuperAdmin', 'Manager'), uploadShipmentDocument);

module.exports = router;
