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
  processTempInventoryByFile,
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

// CSV upload routes (specific routes first)
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

// Inventory status routes (specific routes first)
router
  .route("/purchase")
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
  .route("/sale-pending")
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
  .route("/sale")
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

// File-based inventory routes (specific routes first)
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

// Process temp inventory route (specific routes first)
router
  .route("/process-temp")
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    processTempInventory
  );

router
  .route("/process-temp-file")
  .post(
    authorize("company_admin", "super_admin", "store_manager"),
    processTempInventoryByFile
  );

// Generic inventory item routes (should come after specific routes)
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

router
  .route("/:id/status")
  .put(
    authorize("company_admin", "super_admin", "store_manager"),
    updateInventoryStatus
  );

module.exports = router;
