const express = require("express");
const {
  getBins,
  getBin,
  createBin,
  updateBin,
  deleteBin,
  getBinInventory,
  updateBinCapacity,
  getSimpleBins,
} = require("../controllers/bin.controller");

const router = express.Router({ mergeParams: true });

// Import middleware
const {
  protect,
  authorize,
  companyScope,
} = require("../middlewares/auth.middleware");

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Bin routes
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
    getBins
  )
  .post(authorize("company_admin", "super_admin", "store_manager"), createBin);

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
    getSimpleBins
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
    getBin
  )
  .put(authorize("company_admin", "super_admin", "store_manager"), updateBin)
  .delete(authorize("company_admin", "super_admin"), deleteBin);

router
  .route("/:id/inventory")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getBinInventory
  );

router
  .route("/:id/capacity")
  .put(
    authorize("company_admin", "super_admin", "store_manager"),
    updateBinCapacity
  );

module.exports = router;
