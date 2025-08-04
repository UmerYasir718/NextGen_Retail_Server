const express = require("express");
const {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  uploadInventoryCSV,
  getInventoryUploads,
  getInventoryUpload,
  reviewInventoryUpload,
  getPurchaseInventory,
  getSalePendingInventory,
  getSaleInventory,
  updateInventoryStatus,
  getInventoryByFileId,
  getTempInventoryByFileId,
  processTempInventory,
} = require("../controllers/inventory.controller");

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

// Inventory item routes
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
    getInventoryItems
  )
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    createInventoryItem
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
    getInventoryItem
  )
  .put(
    authorize("company_admin", "super_admin", "store_manager"),
    updateInventoryItem
  )
  .delete(authorize("company_admin", "super_admin"), deleteInventoryItem);

// CSV upload routes
router
  .route("/upload")
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    uploadInventoryCSV
  );

router
  .route("/uploads")
  .get(
    authorize("company_admin", "super_admin", "store_manager"),
    getInventoryUploads
  );

router
  .route("/uploads/:id")
  .get(
    authorize("company_admin", "super_admin", "store_manager"),
    getInventoryUpload
  );

router
  .route("/uploads/:id/review")
  .put(authorize("company_admin", "super_admin"), reviewInventoryUpload);

// Inventory status routes
router
  .route("/status/purchase")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getPurchaseInventory
  );

router
  .route("/status/sale-pending")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getSalePendingInventory
  );

router
  .route("/status/sale")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getSaleInventory
  );

router
  .route("/:id/status")
  .put(
    authorize("company_admin", "super_admin", "store_manager"),
    updateInventoryStatus
  );

// File-based inventory routes
router
  .route("/file/:fileId")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getInventoryByFileId
  );

router
  .route("/temp/file/:fileId")
  .get(
    authorize(
      "company_admin",
      "super_admin",
      "store_manager",
      "analyst",
      "auditor"
    ),
    getTempInventoryByFileId
  );

// Process temp inventory route
router
  .route("/process-temp")
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    processTempInventory
  );

module.exports = router;
