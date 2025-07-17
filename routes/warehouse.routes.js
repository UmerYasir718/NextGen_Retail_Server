const express = require("express");
const {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStructure,
  getWarehouseStats,
  getZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,
} = require("../controllers/warehouse.controller");

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

// Warehouse routes
router
  .route("/")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "compan_manager",
      "Staff",
      "Auditor"
    ),
    getWarehouses
  )
  .post(
    authorize("company_admin", "super_admin", "compan_manager"),
    createWarehouse
  );

router
  .route("/:id")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "compan_manager",
      "Staff",
      "Auditor"
    ),
    getWarehouse
  )
  .put(
    authorize("company_admin", "super_admin", "compan_manager"),
    updateWarehouse
  )
  .delete(authorize("company_admin", "super_admin"), deleteWarehouse);

router
  .route("/:id/structure")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "compan_manager",
      "Staff",
      "Auditor"
    ),
    getWarehouseStructure
  );

router
  .route("/:id/stats")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "compan_manager",
      "Staff",
      "Auditor"
    ),
    getWarehouseStats
  );

// Zone routes (nested under warehouses)
router
  .route("/:warehouseId/zones")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "compan_manager",
      "Staff",
      "Auditor"
    ),
    getZones
  )
  .post(
    authorize("company_admin", "super_admin", "compan_manager"),
    createZone
  );

router
  .route("/:warehouseId/zones/:id")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "compan_manager",
      "Staff",
      "Auditor"
    ),
    getZone
  )
  .put(authorize("company_admin", "super_admin", "compan_manager"), updateZone)
  .delete(authorize("company_admin", "super_admin"), deleteZone);

module.exports = router;
