const express = require('express');
const {
  detectTag
} = require('../controllers/uhfTag.controller');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middlewares/auth');

// Apply protection to all routes
router.use(protect);

// Routes
router.route('/detect')
  .post(authorize('Admin', 'Manager', 'Staff'), detectTag);

module.exports = router;
