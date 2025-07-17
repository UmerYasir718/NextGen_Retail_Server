const express = require('express');
const {
  getBins,
  getBin,
  createBin,
  updateBin,
  deleteBin,
  getBinInventory,
  updateBinCapacity
} = require('../controllers/bin.controller');

const router = express.Router({ mergeParams: true });

// Import middleware
const { protect, authorize, companyScope } = require('../middlewares/auth.middleware');

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Bin routes
router.route('/')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getBins)
  .post(authorize('Admin', 'SuperAdmin', 'Manager'), createBin);

router.route('/:id')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getBin)
  .put(authorize('Admin', 'SuperAdmin', 'Manager'), updateBin)
  .delete(authorize('Admin', 'SuperAdmin'), deleteBin);

router.route('/:id/inventory')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getBinInventory);

router.route('/:id/capacity')
  .put(authorize('Admin', 'SuperAdmin', 'Manager'), updateBinCapacity);

module.exports = router;
