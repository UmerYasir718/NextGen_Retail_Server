const express = require("express");
const {
  getUHFReaders,
  getUHFReader,
  createUHFReader,
  updateUHFReader,
  deleteUHFReader,
  getUHFReaderByUhfId,
} = require("../controllers/uhfReader.controller");

const router = express.Router();

// Import middleware
const { protect, authorize } = require("../middlewares/auth");

// Apply protection to all routes
router.use(protect);

// Routes
router
  .route("/")
  .get(
    authorize("company_admin", "store_manager", "store_staff"),
    getUHFReaders
  )
  .post(authorize("company_admin", "store_manager"), createUHFReader);

router
  .route("/:id")
  .get(authorize("company_admin", "store_manager", "store_staff"), getUHFReader)
  .put(authorize("company_admin", "store_manager"), updateUHFReader)
  .delete(authorize("company_admin"), deleteUHFReader);

router
  .route("/uhf/:uhfId")
  .get(
    authorize("company_admin", "store_manager", "store_staff"),
    getUHFReaderByUhfId
  );

module.exports = router;
