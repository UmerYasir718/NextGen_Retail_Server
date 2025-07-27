const express = require('express');
const {
  getUHFReaders,
  getUHFReader,
  createUHFReader,
  updateUHFReader,
  deleteUHFReader,
  getUHFReaderByUhfId
} = require('../controllers/uhfReader.controller');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middlewares/auth');

// Apply protection to all routes
router.use(protect);

// Routes
router.route('/')
  .get(authorize('Admin', 'Manager', 'Staff'), getUHFReaders)
  .post(authorize('Admin', 'Manager'), createUHFReader);

router.route('/:id')
  .get(authorize('Admin', 'Manager', 'Staff'), getUHFReader)
  .put(authorize('Admin', 'Manager'), updateUHFReader)
  .delete(authorize('Admin'), deleteUHFReader);

router.route('/uhf/:uhfId')
  .get(authorize('Admin', 'Manager', 'Staff'), getUHFReaderByUhfId);

module.exports = router;
