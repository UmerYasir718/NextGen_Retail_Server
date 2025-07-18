const express = require("express");
const {
  getShipments,
  getShipment,
  createShipment,
  updateShipment,
  deleteShipment,
  uploadShipmentDocument,
  getShipmentStats,
} = require("../controllers/shipment.controller");

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

// Shipment routes
router
  .route("/")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getShipments
  )
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    createShipment
  );

router
  .route("/stats")
  .get(
    authorize("company_admin", "super_admin", "store_manager"),
    getShipmentStats
  );

router
  .route("/:id")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getShipment
  )
  .put(
    authorize("company_admin", "super_admin", "store_manager"),
    updateShipment
  )
  .delete(authorize("company_admin", "super_admin"), deleteShipment);

router
  .route("/:id/document")
  .put(
    authorize("company_admin", "super_admin", "store_manager"),
    uploadShipmentDocument
  );

module.exports = router;
