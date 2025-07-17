const express = require('express');
const {
  getShelves,
  getShelf,
  createShelf,
  updateShelf,
  deleteShelf,
  getShelfUtilization
} = require('../controllers/shelf.controller');

// Include bin routes for nested routing
const binRouter = require('./bin.routes');

const router = express.Router({ mergeParams: true });

// Import middleware
const { protect, authorize, companyScope } = require('../middlewares/auth.middleware');

// Re-route into bin router
router.use('/:shelfId/bins', binRouter);

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Shelf routes
router.route('/')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getShelves)
  .post(authorize('Admin', 'SuperAdmin', 'Manager'), createShelf);

router.route('/:id')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getShelf)
  .put(authorize('Admin', 'SuperAdmin', 'Manager'), updateShelf)
  .delete(authorize('Admin', 'SuperAdmin'), deleteShelf);

router.route('/:id/utilization')
  .get(authorize('Admin', 'SuperAdmin', 'Manager', 'Staff', 'Auditor'), getShelfUtilization);

module.exports = router;
