const express = require("express");
const {
  getZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,
  getSimpleZones,
} = require("../controllers/zone.controller");

// Include shelf routes for nested routing
const shelfRouter = require("./shelf.routes");

const router = express.Router({ mergeParams: true });

// Import middleware
const {
  protect,
  authorize,
  companyScope,
} = require("../middlewares/auth.middleware");

// Re-route into shelf router
router.use("/:zoneId/shelves", shelfRouter);

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Zone routes
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
    getZones
  )
  .post(authorize("company_admin", "super_admin", "store_manager"), createZone);

router
  .route("/simple")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getSimpleZones
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
    getZone
  )
  .put(authorize("company_admin", "super_admin", "store_manager"), updateZone)
  .delete(authorize("company_admin", "super_admin"), deleteZone);

module.exports = router;
