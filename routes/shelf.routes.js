const express = require("express");
const {
  getShelves,
  getShelf,
  createShelf,
  updateShelf,
  deleteShelf,
  getShelfUtilization,
  getSimpleShelves,
} = require("../controllers/shelf.controller");

// Include bin routes for nested routing
const binRouter = require("./bin.routes");

const router = express.Router({ mergeParams: true });

// Import middleware
const {
  protect,
  authorize,
  companyScope,
} = require("../middlewares/auth.middleware");

// Re-route into bin router
router.use("/:shelfId/bins", binRouter);

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Shelf routes
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
    getShelves
  )
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    createShelf
  );

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
    getSimpleShelves
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
    getShelf
  )
  .put(authorize("company_admin", "super_admin", "store_manager"), updateShelf)
  .delete(authorize("company_admin", "super_admin"), deleteShelf);

router
  .route("/:id/utilization")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getShelfUtilization
  );

module.exports = router;
