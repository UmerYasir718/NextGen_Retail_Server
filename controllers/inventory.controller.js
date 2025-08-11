const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const Inventory = require("../models/inventory.model");
const InventoryUpload = require("../models/inventoryUpload.model");
const InventoryTemp = require("../models/inventoryTemp.model");
const Warehouse = require("../models/warehouse.model");
const Zone = require("../models/zone.model");
const Shelf = require("../models/shelf.model");
const Bin = require("../models/bin.model");
const AuditLog = require("../models/auditLog.model");
const ErrorResponse = require("../utils/errorResponse");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const { getLocationDetails } = require("../utils/locationHelper");
const mongoose = require("mongoose");
const asyncHandler = require("../middlewares/async");
const sendLowStockPushNotification =
  require("../utils/firebaseNotification").sendLowStockAlert;

// @desc    Get inventory items with purchase status
// @route   GET /api/inventory/status/purchase
// @access  Private
exports.getPurchaseInventory = async (req, res, next) => {
  try {
    // Build query
    let query = {
      companyId: req.user.companyId,
      inventoryStatus: "purchase",
    };

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query["location.warehouseId"] = req.query.warehouseId;
    }

    // Filter by search term if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { tagId: searchRegex },
        { description: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {
      current: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: inventory.length,
      total,
      pagination,
      data: inventory,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory items with sale_pending status
// @route   GET /api/inventory/status/sale-pending
// @access  Private
exports.getSalePendingInventory = async (req, res, next) => {
  try {
    // Build query
    let query = {
      companyId: req.user.companyId,
      inventoryStatus: "sale_pending",
    };

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query["location.warehouseId"] = req.query.warehouseId;
    }

    // Filter by search term if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { tagId: searchRegex },
        { description: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {
      current: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: inventory.length,
      total,
      pagination,
      data: inventory,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory items with sale status
// @route   GET /api/inventory/status/sale
// @access  Private
exports.getSaleInventory = async (req, res, next) => {
  try {
    // Build query
    let query = {
      companyId: req.user.companyId,
      inventoryStatus: "sale",
    };

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query["location.warehouseId"] = req.query.warehouseId;
    }

    // Filter by search term if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { tagId: searchRegex },
        { description: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {
      current: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: inventory.length,
      total,
      pagination,
      data: inventory,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update inventory status
// @route   PUT /api/inventory/:id/status
// @access  Private
exports.updateInventoryStatus = async (req, res, next) => {
  try {
    const { inventoryStatus } = req.body;

    // Validate status
    if (
      !inventoryStatus ||
      !["purchase", "sale_pending", "sale"].includes(inventoryStatus)
    ) {
      return next(
        new ErrorResponse(
          `Invalid inventory status. Must be one of: purchase, sale_pending, sale`,
          400
        )
      );
    }

    // Find inventory item
    const item = await Inventory.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!item) {
      return next(
        new ErrorResponse(
          `Inventory item not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Update status
    item.inventoryStatus = inventoryStatus;
    item.updatedBy = req.user.id;
    item.updatedAt = Date.now();

    await item.save();

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventoryItems = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query["location.warehouseId"] = req.query.warehouseId;
    }

    // Filter by search term if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { tagId: searchRegex },
        { description: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {
      current: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: inventory.length,
      total,
      pagination,
      data: inventory,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
exports.getInventoryItem = async (req, res, next) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(
        new ErrorResponse(
          `Invalid inventory item ID format: ${req.params.id}`,
          400
        )
      );
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!item) {
      return next(
        new ErrorResponse(
          `Inventory item not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private
exports.createInventoryItem = async (req, res, next) => {
  try {
    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // Validate and clean location fields to prevent ObjectId casting errors
    if (req.body.location) {
      // Handle warehouseId
      if (req.body.location.warehouseId !== undefined) {
        if (
          req.body.location.warehouseId === "" ||
          req.body.location.warehouseId === null
        ) {
          req.body.location.warehouseId = undefined;
        } else if (
          !mongoose.Types.ObjectId.isValid(req.body.location.warehouseId)
        ) {
          return next(new ErrorResponse("Invalid warehouse ID format", 400));
        }
      }

      // Handle zoneId
      if (req.body.location.zoneId !== undefined) {
        if (
          req.body.location.zoneId === "" ||
          req.body.location.zoneId === null
        ) {
          req.body.location.zoneId = undefined;
        } else if (!mongoose.Types.ObjectId.isValid(req.body.location.zoneId)) {
          return next(new ErrorResponse("Invalid zone ID format", 400));
        }
      }

      // Handle shelfId
      if (req.body.location.shelfId !== undefined) {
        if (
          req.body.location.shelfId === "" ||
          req.body.location.shelfId === null
        ) {
          req.body.location.shelfId = undefined;
        } else if (
          !mongoose.Types.ObjectId.isValid(req.body.location.shelfId)
        ) {
          return next(new ErrorResponse("Invalid shelf ID format", 400));
        }
      }

      // Handle binId
      if (req.body.location.binId !== undefined) {
        if (
          req.body.location.binId === "" ||
          req.body.location.binId === null
        ) {
          req.body.location.binId = undefined;
        } else if (!mongoose.Types.ObjectId.isValid(req.body.location.binId)) {
          return next(new ErrorResponse("Invalid bin ID format", 400));
        }
      }
    }

    // Check if item with this SKU already exists
    const existingItem = await Inventory.findOne({
      sku: req.body.sku,
      companyId: req.user.companyId,
    });

    if (existingItem) {
      return next(
        new ErrorResponse(`Item with SKU ${req.body.sku} already exists`, 400)
      );
    }

    // Create inventory item
    const item = await Inventory.create(req.body);

    // Update bin capacity utilization if bin is specified
    if (item.location && item.location.binId) {
      const bin = await Bin.findById(item.location.binId);
      if (bin) {
        // Update bin's current items count
        const inventoryItems = await Inventory.find({
          "location.binId": bin._id,
        });
        let totalQuantity = 0;
        inventoryItems.forEach((invItem) => {
          totalQuantity += invItem.quantity || 0;
        });

        // No need to save bin as we're just updating utilization in the GET APIs
      }
    }

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private
exports.updateInventoryItem = async (req, res, next) => {
  try {
    // Set updated by
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();
    req.body.saleDate = null;
    // Set saleDate if inventory status is changed to sale
    if (req.body.inventoryStatus === "sale") {
      req.body.saleDate = Date.now();
    }

    // Validate and clean location fields to prevent ObjectId casting errors
    if (req.body.location) {
      // Handle warehouseId
      if (req.body.location.warehouseId !== undefined) {
        if (
          req.body.location.warehouseId === "" ||
          req.body.location.warehouseId === null
        ) {
          req.body.location.warehouseId = undefined;
        } else if (
          !mongoose.Types.ObjectId.isValid(req.body.location.warehouseId)
        ) {
          return next(new ErrorResponse("Invalid warehouse ID format", 400));
        }
      }

      // Handle zoneId
      if (req.body.location.zoneId !== undefined) {
        if (
          req.body.location.zoneId === "" ||
          req.body.location.zoneId === null
        ) {
          req.body.location.zoneId = undefined;
        } else if (!mongoose.Types.ObjectId.isValid(req.body.location.zoneId)) {
          return next(new ErrorResponse("Invalid zone ID format", 400));
        }
      }

      // Handle shelfId
      if (req.body.location.shelfId !== undefined) {
        if (
          req.body.location.shelfId === "" ||
          req.body.location.shelfId === null
        ) {
          req.body.location.shelfId = undefined;
        } else if (
          !mongoose.Types.ObjectId.isValid(req.body.location.shelfId)
        ) {
          return next(new ErrorResponse("Invalid shelf ID format", 400));
        }
      }

      // Handle binId
      if (req.body.location.binId !== undefined) {
        if (
          req.body.location.binId === "" ||
          req.body.location.binId === null
        ) {
          req.body.location.binId = undefined;
        } else if (!mongoose.Types.ObjectId.isValid(req.body.location.binId)) {
          return next(new ErrorResponse("Invalid bin ID format", 400));
        }
      }
    }

    // Get the original item before update to track location changes
    const originalItem = await Inventory.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!originalItem) {
      return next(
        new ErrorResponse(
          `Inventory item not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Find and update item
    const item = await Inventory.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    // Check if location or quantity has changed
    const locationChanged =
      originalItem.location?.binId?.toString() !==
        item.location?.binId?.toString() ||
      originalItem.location?.shelfId?.toString() !==
        item.location?.shelfId?.toString() ||
      originalItem.location?.zoneId?.toString() !==
        item.location?.zoneId?.toString() ||
      originalItem.location?.warehouseId?.toString() !==
        item.location?.warehouseId?.toString();

    const quantityChanged = originalItem.quantity !== item.quantity;

    // If location changed, create audit log
    if (locationChanged) {
      try {
        // Get warehouse, zone, shelf, bin names for better readability in logs
        const oldLocationDetails = await getLocationDetails(
          originalItem.location
        );
        const newLocationDetails = await getLocationDetails(item.location);

        // Create audit log entry
        await AuditLog.create({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: "Update",
          module: "Inventory",
          description: `Updated location for inventory item ${item.name} (SKU: ${item.sku})`,
          details: {
            inventoryId: item._id,
            itemName: item.name,
            sku: item.sku,
            previousLocation: {
              warehouseId: originalItem.location?.warehouseId,
              warehouseName: oldLocationDetails.warehouseName,
              zoneId: originalItem.location?.zoneId,
              zoneName: oldLocationDetails.zoneName,
              shelfId: originalItem.location?.shelfId,
              shelfName: oldLocationDetails.shelfName,
              binId: originalItem.location?.binId,
              binName: oldLocationDetails.binName,
              quantity: originalItem.quantity,
            },
            currentLocation: {
              warehouseId: item.location?.warehouseId,
              warehouseName: newLocationDetails.warehouseName,
              zoneId: item.location?.zoneId,
              zoneName: newLocationDetails.zoneName,
              shelfId: item.location?.shelfId,
              shelfName: newLocationDetails.shelfName,
              binId: item.location?.binId,
              binName: newLocationDetails.binName,
              quantity: item.quantity,
            },
            changedBy: {
              userId: req.user.id,
              userName: req.user.name,
              userRole: req.user.role,
              timestamp: Date.now(),
            },
          },
          ipAddress: req.ip,
          companyId: req.user.companyId,
        });
      } catch (auditError) {
        console.error("Error creating audit log:", auditError);
        // Don't fail the main operation if audit logging fails
      }
    }

    // Check for low stock notification after quantity update
    if (quantityChanged) {
      try {
        const Notification = require("../models/notification.model");
        const User = require("../models/user.model");
        const firebaseNotification = require("../utils/firebaseNotification");
        const notificationSocket = require("../sockets/notification");

        // Check if quantity is now below or equal to threshold
        const isLowStock = item.quantity <= item.threshold;

        if (isLowStock && !item.lowStockAlertSent) {
          // Mark the item with a flag indicating an alert was sent
          item.lowStockAlertSent = true;
          await item.save();

          // Create notification
          const notification = await Notification.create({
            title: `Low Stock Alert`,
            message: `Item ${item.name} (SKU: ${item.sku}) is now below threshold. Current quantity: ${item.quantity}, Threshold: ${item.threshold}`,
            type: "Stock",
            priority: item.quantity === 0 ? "High" : "Medium",
            relatedTo: {
              model: "Inventory",
              id: item._id,
            },
            recipients: [], // Will be populated with admins and inventory managers
            companyId: req.user.companyId,
          });

          // Find admins and inventory managers to notify
          const recipients = await User.find({
            companyId: req.user.companyId,
            role: { $in: ["Admin", "InventoryManager"] },
          }).select("_id");

          // Add recipients to notification
          notification.recipients = recipients.map((user) => ({
            userId: user._id,
            read: false,
          }));
          await notification.save();

          // Send real-time notification via WebSocket
          notificationSocket.sendLowStockAlert(item, req.user.companyId);

          // Send Firebase push notification to offline users
          try {
            await firebaseNotification.sendLowStockAlert(
              item,
              req.user.companyId
            );
            console.log(
              `Firebase notification sent for low stock alert: ${item.name} (${item.sku})`
            );
          } catch (error) {
            console.error("Error sending Firebase notification:", error);
          }

          console.log(
            `Low stock alert sent for item: ${item.name} (${item.sku}) - quantity: ${item.quantity}, threshold: ${item.threshold}`
          );
        }
        // Reset the alert flag if quantity goes above threshold
        else if (!isLowStock && item.lowStockAlertSent) {
          item.lowStockAlertSent = false;
          await item.save();
          console.log(
            `Low stock alert flag reset for item: ${item.name} (${item.sku}) - quantity restored above threshold`
          );
        }
      } catch (notificationError) {
        console.error(
          "Error handling low stock notification:",
          notificationError
        );
        // Don't fail the main operation if notification fails
      }
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!item) {
      return next(
        new ErrorResponse(
          `Inventory item not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Store location information before deletion to update utilization
    const locationInfo = item.location;

    // Delete the inventory item
    await Inventory.findByIdAndDelete(item._id);

    // Update bin utilization if bin was specified
    if (locationInfo && locationInfo.binId) {
      // No need to update bin directly as utilization is calculated on-the-fly in GET APIs
    }

    res.status(200).json({
      success: true,
      data: {},
      message: "Inventory item deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload CSV inventory file
// @route   POST /api/inventory/upload
// @access  Private
exports.uploadInventoryCSV = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return next(new ErrorResponse("Please upload a CSV file", 400));
    }

    const file = req.files.file;

    // Check if it's a CSV file
    if (file.mimetype !== "text/csv") {
      return next(new ErrorResponse("Please upload a CSV file", 400));
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return next(new ErrorResponse("File size cannot exceed 2MB", 400));
    }

    // Create unique filename
    const fileName = `inventory_${req.user.companyId}_${Date.now()}${
      path.parse(file.name).ext
    }`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "inventory_uploads",
      resource_type: "raw",
      public_id: fileName.split(".")[0],
    });

    // Create upload record
    const upload = await InventoryUpload.create({
      fileName,
      filePath: result.secure_url,
      companyId: req.user.companyId,
      uploadedBy: req.user.id,
    });

    // Trigger CSV processing (would be handled by a cron job in production)
    // For demo purposes, we'll process it immediately
    processCSV(upload._id);

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory uploads
// @route   GET /api/inventory/uploads
// @access  Private
exports.getInventoryUploads = async (req, res, next) => {
  try {
    const uploads = await InventoryUpload.find({
      companyId: req.user.companyId,
    })
      .sort({ uploadedAt: -1 })
      .populate("uploadedBy", "name email")
      .populate("reviewedBy", "name email");

    res.status(200).json({
      success: true,
      count: uploads.length,
      data: uploads,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory upload details
// @route   GET /api/inventory/uploads/:id
// @access  Private
exports.getInventoryUpload = async (req, res, next) => {
  try {
    const upload = await InventoryUpload.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })
      .populate("uploadedBy", "name email")
      .populate("reviewedBy", "name email");

    if (!upload) {
      return next(
        new ErrorResponse(`Upload not found with id of ${req.params.id}`, 404)
      );
    }

    // Get temp inventory items for this upload
    const tempItems = await InventoryTemp.find({
      uploadId: upload._id,
    }).sort({ rowNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        upload,
        items: tempItems,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Review inventory upload
// @route   PUT /api/inventory/uploads/:id/review
// @access  Private/Admin
exports.reviewInventoryUpload = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return next(new ErrorResponse("Invalid status", 400));
    }

    const upload = await InventoryUpload.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!upload) {
      return next(
        new ErrorResponse(`Upload not found with id of ${req.params.id}`, 404)
      );
    }

    if (upload.status !== "Processing") {
      return next(new ErrorResponse(`Upload is not ready for review`, 400));
    }

    // Update upload status
    upload.status = status;
    upload.reviewedBy = req.user.id;
    upload.reviewedAt = Date.now();
    await upload.save();

    // If approved, move items to main inventory
    if (status === "Approved") {
      const tempItems = await InventoryTemp.find({
        uploadId: upload._id,
        status: "Valid",
      });

      for (const tempItem of tempItems) {
        // Check if item with this SKU already exists
        let existingItem = await Inventory.findOne({
          sku: tempItem.sku,
          companyId: req.user.companyId,
        });

        if (existingItem) {
          // Update existing item
          existingItem.quantity += tempItem.quantity;
          existingItem.updatedBy = req.user.id;
          existingItem.updatedAt = Date.now();
          await existingItem.save();
        } else {
          // Validate and clean location fields to prevent ObjectId casting errors
          let cleanLocation = {};
          if (tempItem.location) {
            // Handle warehouseId
            if (
              tempItem.location.warehouseId &&
              mongoose.Types.ObjectId.isValid(tempItem.location.warehouseId)
            ) {
              cleanLocation.warehouseId = tempItem.location.warehouseId;
            }

            // Handle zoneId
            if (
              tempItem.location.zoneId &&
              mongoose.Types.ObjectId.isValid(tempItem.location.zoneId)
            ) {
              cleanLocation.zoneId = tempItem.location.zoneId;
            }

            // Handle shelfId
            if (
              tempItem.location.shelfId &&
              mongoose.Types.ObjectId.isValid(tempItem.location.shelfId)
            ) {
              cleanLocation.shelfId = tempItem.location.shelfId;
            }

            // Handle binId
            if (
              tempItem.location.binId &&
              mongoose.Types.ObjectId.isValid(tempItem.location.binId)
            ) {
              cleanLocation.binId = tempItem.location.binId;
            }
          }

          // Create new inventory item
          await Inventory.create({
            name: tempItem.name,
            sku: tempItem.sku,
            tagId: tempItem.tagId,
            description: tempItem.description,
            category: tempItem.category,
            quantity: tempItem.quantity,
            threshold: tempItem.threshold,
            location: cleanLocation,
            price: tempItem.price,
            supplier: tempItem.supplier,
            companyId: req.user.companyId,
            createdBy: req.user.id,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to process CSV file
async function processCSV(uploadId) {
  try {
    const upload = await InventoryUpload.findById(uploadId);

    if (!upload) {
      console.error(`Upload not found with id of ${uploadId}`);
      return;
    }

    // Update status to Processing
    upload.status = "Processing";
    await upload.save();

    // Download CSV file from Cloudinary
    const response = await axios.get(upload.filePath, {
      responseType: "stream",
    });

    let rowNumber = 0;
    let validItems = 0;
    let errorItems = 0;

    // Process CSV stream
    response.data
      .pipe(csv())
      .on("data", async (row) => {
        rowNumber++;

        try {
          // Validate required fields
          if (!row.name || !row.sku || !row.category || !row.quantity) {
            throw new Error("Missing required fields");
          }

          // Create temp inventory item
          const tempItem = await InventoryTemp.create({
            uploadId,
            rowNumber,
            name: row.name,
            sku: row.sku,
            tagId: row.tagId || "",
            description: row.description || "",
            category: row.category,
            quantity: parseInt(row.quantity) || 0,
            threshold: parseInt(row.threshold) || 5,
            location: {
              warehouseName: row.warehouseName || "",
              zoneName: row.zoneName || "",
              shelfName: row.shelfName || "",
              binName: row.binName || "",
            },
            price: {
              cost: parseFloat(row.cost) || 0,
              retail: parseFloat(row.retail) || 0,
            },
            supplier: {
              name: row.supplierName || "",
              contactInfo: row.supplierContact || "",
            },
            companyId: upload.companyId,
            status: "Valid",
          });

          // Try to resolve location IDs
          if (row.warehouseName) {
            const warehouse = await Warehouse.findOne({
              name: row.warehouseName,
              companyId: upload.companyId,
            });

            if (warehouse) {
              tempItem.location.warehouseId = warehouse._id;

              if (row.zoneName) {
                const zone = await Zone.findOne({
                  name: row.zoneName,
                  warehouseId: warehouse._id,
                });

                if (zone) {
                  tempItem.location.zoneId = zone._id;

                  if (row.shelfName) {
                    const shelf = await Shelf.findOne({
                      name: row.shelfName,
                      zoneId: zone._id,
                    });

                    if (shelf) {
                      tempItem.location.shelfId = shelf._id;

                      if (row.binName) {
                        const bin = await Bin.findOne({
                          name: row.binName,
                          shelfId: shelf._id,
                        });

                        if (bin) {
                          tempItem.location.binId = bin._id;
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          await tempItem.save();
          validItems++;
        } catch (error) {
          // Create error record
          await InventoryTemp.create({
            uploadId,
            rowNumber,
            name: row.name || "",
            sku: row.sku || "",
            companyId: upload.companyId,
            status: "Invalid",
            errors: [
              {
                field: "general",
                message: error.message,
              },
            ],
          });

          errorItems++;
        }
      })
      .on("end", async () => {
        // Update upload record with results
        upload.totalItems = rowNumber;
        upload.processedItems = validItems;
        upload.errorItems = errorItems;
        await upload.save();
      });
  } catch (error) {
    console.error("CSV processing error:", error);
  }
}

// @desc    Get inventory records by file ID
// @route   GET /api/inventory/file/:fileId
// @access  Private
exports.getInventoryByFileId = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { type = "inventory" } = req.query; // 'inventory' or 'temp'

    // Validate fileId
    if (!fileId) {
      return next(new ErrorResponse("File ID is required", 400));
    }

    // Build query
    let query = {
      fileId: fileId,
      companyId: req.user.companyId,
    };

    let records;
    let total;

    if (type === "temp") {
      // Get temp inventory records
      total = await InventoryTemp.countDocuments(query);
      records = await InventoryTemp.find(query)
        .sort({ rowNumber: 1 })
        .populate("fileId", "name originalName fileType status");
    } else {
      // Get regular inventory records
      total = await Inventory.countDocuments(query);
      records = await Inventory.find(query)
        .sort({ createdAt: -1 })
        .populate("fileId", "name originalName fileType status")
        .populate("location.warehouseId", "name")
        .populate("location.zoneId", "name")
        .populate("location.shelfId", "name")
        .populate("location.binId", "name");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedRecords = records.slice(startIndex, endIndex);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: paginatedRecords.length,
      total,
      pagination,
      type,
      fileId,
      data: paginatedRecords,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get temp inventory records by file ID
// @route   GET /api/inventory/temp/file/:fileId
// @access  Private
exports.getTempInventoryByFileId = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    // Validate fileId
    if (!fileId) {
      return next(new ErrorResponse("File ID is required", 400));
    }

    // Validate ObjectId format for fileId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return next(new ErrorResponse(`Invalid file ID format: ${fileId}`, 400));
    }

    // Build query
    let query = {
      fileId: fileId,
      companyId: req.user.companyId,
    };

    // Filter by processing status if provided
    if (req.query.processStatus) {
      query.processStatus = req.query.processStatus;
    }

    // Filter by isProcessed if provided
    if (req.query.isProcessed !== undefined) {
      query.isProcessed = req.query.isProcessed === "true";
    }

    // Search by name, sku, or description if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { description: searchRegex },
      ];
    }

    // Get total count
    const total = await InventoryTemp.countDocuments(query);

    // Get all records without pagination
    const records = await InventoryTemp.find(query)
      .sort({ rowNumber: 1, createdAt: -1 })
      .populate("fileId", "name originalName fileType status");

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      fileId,
      data: records,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process temp inventory records and move to purchase inventory
// @route   POST /api/inventory/process-temp
// @access  Private
exports.processTempInventory = async (req, res, next) => {
  try {
    const { fileId, uuids, status } = req.body;

    // Validate required fields
    if (!fileId || !uuids || !Array.isArray(uuids) || !status) {
      return next(
        new ErrorResponse("File ID, UUIDs array, and status are required", 400)
      );
    }

    // Validate status
    if (!["approved", "rejected"].includes(status.toLowerCase())) {
      return next(
        new ErrorResponse("Status must be either 'approved' or 'rejected'", 400)
      );
    }

    // Find temp inventory records by UUIDs and fileId
    const tempRecords = await InventoryTemp.find({
      _id: { $in: uuids },
      fileId: fileId,
      companyId: req.user.companyId,
    });

    if (tempRecords.length === 0) {
      return next(
        new ErrorResponse(
          "No temp inventory records found with the provided UUIDs and file ID",
          404
        )
      );
    }

    const processedRecords = [];
    const errors = [];

    // Process each temp record - with timeout protection
    for (let i = 0; i < tempRecords.length; i++) {
      const tempRecord = tempRecords[i];
      try {
        console.log(
          `📝 Processing temp record ${i + 1}/${tempRecords.length}: ${
            tempRecord._id
          } - ${tempRecord.sku} - ${tempRecord.name}`
        );

        // Mark as processed regardless of status
        tempRecord.isProcessed = true;
        tempRecord.processedAt = Date.now();
        tempRecord.processedBy = req.user.id;
        tempRecord.processStatus = status.toLowerCase();

        // Handle uploadId - create a dummy upload record if needed
        if (!tempRecord.uploadId) {
          try {
            // Check if a "cron" upload record already exists for this company
            let cronUpload = await InventoryUpload.findOne({
              fileName: "cron",
              companyId: req.user.companyId,
            });

            if (!cronUpload) {
              // Create a dummy upload record for cron processing
              cronUpload = await InventoryUpload.create({
                fileName: "cron",
                filePath: "cron://temp-inventory-processing",
                status: "Approved",
                totalItems: 0,
                processedItems: 0,
                errorItems: 0,
                companyId: req.user.companyId,
                uploadedBy: req.user.id,
                uploadedAt: Date.now(),
              });
            }

            tempRecord.uploadId = cronUpload._id;
          } catch (uploadError) {
            console.error("❌ Error creating cron upload record:", uploadError);
          }
        }

        // Update status to "Valid" for approved records, "Invalid" for rejected records
        if (status.toLowerCase() === "approved") {
          tempRecord.status = "Valid";
        } else {
          tempRecord.status = "Invalid";
        }

        // Save temp record first
        await tempRecord.save();

        if (status.toLowerCase() === "approved") {
          approvedCount++;

          // Check if item with this SKU already exists in purchase inventory
          let existingItem = await Inventory.findOne({
            sku: tempRecord.sku,
            companyId: req.user.companyId,
          });

          if (existingItem) {
            // Update existing item quantity
            existingItem.quantity += tempRecord.quantity || 0;
            existingItem.updatedBy = req.user.id;
            existingItem.updatedAt = Date.now();
            await existingItem.save();

            processedRecords.push({
              uuid: tempRecord._id,
              action: "updated",
              sku: tempRecord.sku,
              name: tempRecord.name,
              quantity: tempRecord.quantity,
              message: "Existing inventory item updated",
            });
          } else {
            // Validate and clean location fields to prevent ObjectId casting errors
            let cleanLocation = {};
            if (tempRecord.location) {
              // Handle warehouseId
              if (
                tempRecord.location.warehouseId &&
                mongoose.Types.ObjectId.isValid(tempRecord.location.warehouseId)
              ) {
                cleanLocation.warehouseId = tempRecord.location.warehouseId;
              }

              // Handle zoneId
              if (
                tempRecord.location.zoneId &&
                mongoose.Types.ObjectId.isValid(tempRecord.location.zoneId)
              ) {
                cleanLocation.zoneId = tempRecord.location.zoneId;
              }

              // Handle shelfId
              if (
                tempRecord.location.shelfId &&
                mongoose.Types.ObjectId.isValid(tempRecord.location.shelfId)
              ) {
                cleanLocation.shelfId = tempRecord.location.shelfId;
              }

              // Handle binId
              if (
                tempRecord.location.binId &&
                mongoose.Types.ObjectId.isValid(tempRecord.location.binId)
              ) {
                cleanLocation.binId = tempRecord.location.binId;
              }
            }

            // Create new inventory item
            const newInventoryItem = await Inventory.create({
              name: tempRecord.name,
              sku: tempRecord.sku,
              tagId: tempRecord.tagId || "",
              description: tempRecord.description || "",
              category: tempRecord.category,
              quantity: tempRecord.quantity || 0,
              threshold: tempRecord.threshold || 5,
              location: cleanLocation,
              price: tempRecord.price || {},
              supplier: tempRecord.supplier || {},
              companyId: req.user.companyId,
              fileId: fileId,
              createdBy: req.user.id,
              inventoryStatus: "purchase",
            });

            processedRecords.push({
              uuid: tempRecord._id,
              action: "created",
              sku: tempRecord.sku,
              name: tempRecord.name,
              quantity: tempRecord.quantity,
              newInventoryId: newInventoryItem._id,
              message: "New inventory item created",
            });
          }
        } else {
          // Status is rejected - only mark as processed
          rejectedCount++;
          processedRecords.push({
            uuid: tempRecord._id,
            action: "rejected",
            sku: tempRecord.sku,
            name: tempRecord.name,
            message: "Record rejected and marked as processed",
          });
        }
      } catch (error) {
        console.error(
          `❌ Error processing temp record ${tempRecord._id}:`,
          error.message
        );
        errors.push({
          uuid: tempRecord._id,
          sku: tempRecord.sku,
          name: tempRecord.name,
          error: error.message,
        });
      }
    }

    // Create audit log for the processing
    try {
      await AuditLog.create({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: "Process",
        module: "Inventory",
        description: `Processed ${tempRecords.length} temp inventory records from file ${fileId}`,
        details: {
          fileId: fileId,
          status: status.toLowerCase(),
          totalRecords: tempRecords.length,
          processedRecords: processedRecords.length,
          errors: errors.length,
          processedBy: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            timestamp: Date.now(),
          },
        },
        ipAddress: req.ip,
        companyId: req.user.companyId,
      });
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
      // Don't fail the main operation if audit logging fails
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed ${processedRecords.length} records`,
      data: {
        fileId: fileId,
        status: status.toLowerCase(),
        totalRecords: tempRecords.length,
        processedRecords: processedRecords.length,
        errors: errors.length,
        results: processedRecords,
        errors: errors,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process all temp inventory records for a file by status
// @route   POST /api/inventory/process-temp-file
// @access  Private
exports.processTempInventoryByFile = async (req, res, next) => {
  try {
    console.log("🚀 Starting processTempInventoryByFile with:", {
      fileId: req.body.fileId,
      status: req.body.status,
    });

    const { fileId, status } = req.body;

    // Validate required fields
    if (!fileId || !status) {
      console.log("❌ Missing required fields:", { fileId, status });
      return next(new ErrorResponse("File ID and status are required", 400));
    }

    // Validate status
    if (!["approved", "rejected"].includes(status.toLowerCase())) {
      console.log("❌ Invalid status:", status);
      return next(
        new ErrorResponse("Status must be either 'approved' or 'rejected'", 400)
      );
    }

    // Validate ObjectId format for fileId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      console.log("❌ Invalid fileId format:", fileId);
      return next(new ErrorResponse(`Invalid file ID format: ${fileId}`, 400));
    }

    // Find the file first
    const File = require("../models/file.model");
    const file = await File.findOne({
      _id: fileId,
      companyId: req.user.companyId,
    });

    if (!file) {
      console.log("❌ File not found:", {
        fileId,
        companyId: req.user.companyId,
      });
      return next(new ErrorResponse(`File not found with ID: ${fileId}`, 404));
    }

    console.log("✅ File found:", {
      fileName: file.name,
      fileStatus: file.status,
    });

    // Find all temp inventory records for this file
    const tempRecords = await InventoryTemp.find({
      fileId: fileId,
      companyId: req.user.companyId,
    });

    console.log("📊 Found temp records:", {
      count: tempRecords.length,
      fileId,
    });

    if (tempRecords.length === 0) {
      console.log("❌ No temp records found for file:", fileId);
      return next(
        new ErrorResponse(
          `No temp inventory records found for file ID: ${fileId}`,
          404
        )
      );
    }

    const processedRecords = [];
    const errors = [];
    let approvedCount = 0;
    let rejectedCount = 0;

    // Get or create cron upload record
    let cronUpload = null;
    try {
      cronUpload = await InventoryUpload.findOne({
        fileName: "cron",
        companyId: req.user.companyId,
      });

      if (!cronUpload) {
        cronUpload = await InventoryUpload.create({
          fileName: "cron",
          filePath: "cron://temp-inventory-processing",
          status: "Approved",
          totalItems: 0,
          processedItems: 0,
          errorItems: 0,
          companyId: req.user.companyId,
          uploadedBy: req.user.id,
          uploadedAt: Date.now(),
        });
        console.log("✅ Created new cron upload record:", cronUpload._id);
      }
    } catch (uploadError) {
      console.error("❌ Error handling cron upload record:", uploadError);
    }

    // Process records in batches
    const batchSize = 10;
    for (let i = 0; i < tempRecords.length; i += batchSize) {
      const batch = tempRecords.slice(i, i + batchSize);
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          tempRecords.length / batchSize
        )}`
      );

      for (const tempRecord of batch) {
        try {
          // Mark as processed
          tempRecord.isProcessed = true;
          tempRecord.processedAt = Date.now();
          tempRecord.processedBy = req.user.id;
          tempRecord.processStatus = status.toLowerCase();
          tempRecord.uploadId = cronUpload?._id || tempRecord.uploadId;
          tempRecord.status =
            status.toLowerCase() === "approved" ? "Valid" : "Invalid";

          await tempRecord.save();

          if (status.toLowerCase() === "approved") {
            approvedCount++;

            // Check for existing inventory
            let existingItem = await Inventory.findOne({
              sku: tempRecord.sku,
              companyId: req.user.companyId,
            });

            if (existingItem) {
              // Update existing item
              existingItem.quantity += tempRecord.quantity;
              existingItem.updatedBy = req.user.id;
              existingItem.updatedAt = Date.now();
              await existingItem.save();

              processedRecords.push({
                uuid: tempRecord._id,
                action: "updated",
                sku: tempRecord.sku,
                name: tempRecord.name,
                quantity: tempRecord.quantity,
                message: "Existing inventory item updated",
              });
            } else {
              // Validate and clean location fields to prevent ObjectId casting errors
              let cleanLocation = {};
              if (tempRecord.location) {
                // Handle warehouseId
                if (
                  tempRecord.location.warehouseId &&
                  mongoose.Types.ObjectId.isValid(
                    tempRecord.location.warehouseId
                  )
                ) {
                  cleanLocation.warehouseId = tempRecord.location.warehouseId;
                }

                // Handle zoneId
                if (
                  tempRecord.location.zoneId &&
                  mongoose.Types.ObjectId.isValid(tempRecord.location.zoneId)
                ) {
                  cleanLocation.zoneId = tempRecord.location.zoneId;
                }

                // Handle shelfId
                if (
                  tempRecord.location.shelfId &&
                  mongoose.Types.ObjectId.isValid(tempRecord.location.shelfId)
                ) {
                  cleanLocation.shelfId = tempRecord.location.shelfId;
                }

                // Handle binId
                if (
                  tempRecord.location.binId &&
                  mongoose.Types.ObjectId.isValid(tempRecord.location.binId)
                ) {
                  cleanLocation.binId = tempRecord.location.binId;
                }
              }

              // Create new inventory item
              const newInventoryItem = await Inventory.create({
                name: tempRecord.name,
                sku: tempRecord.sku,
                tagId: tempRecord.tagId,
                description: tempRecord.description,
                category: tempRecord.category,
                quantity: tempRecord.quantity,
                threshold: tempRecord.threshold,
                location: cleanLocation,
                price: tempRecord.price,
                supplier: tempRecord.supplier,
                companyId: req.user.companyId,
                fileId: fileId,
                createdBy: req.user.id,
                inventoryStatus: "purchase",
              });

              processedRecords.push({
                uuid: tempRecord._id,
                action: "created",
                sku: tempRecord.sku,
                name: tempRecord.name,
                quantity: tempRecord.quantity,
                newInventoryId: newInventoryItem._id,
                message: "New inventory item created",
              });
            }
          } else {
            rejectedCount++;
            processedRecords.push({
              uuid: tempRecord._id,
              action: "rejected",
              sku: tempRecord.sku,
              name: tempRecord.name,
              message: "Record rejected and marked as processed",
            });
          }
        } catch (error) {
          console.error(
            `❌ Error processing temp record ${tempRecord._id}:`,
            error.message
          );
          errors.push({
            uuid: tempRecord._id,
            sku: tempRecord.sku,
            name: tempRecord.name,
            error: error.message,
          });
        }
      }
    }

    // Update file status
    try {
      file.status = status.toLowerCase();
      file.updatedAt = Date.now();
      await file.save();
      console.log(`✅ File status updated to: ${status.toLowerCase()}`);
    } catch (fileError) {
      console.error("❌ Error updating file status:", fileError);
      errors.push({
        type: "file_status_update",
        error: fileError.message,
      });
    }

    // Create audit log
    try {
      await AuditLog.create({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: "Process",
        module: "Inventory",
        description: `Processed ${tempRecords.length} temp inventory records from file ${fileId} with status: ${status}`,
        details: {
          fileId: fileId,
          fileName: file.name,
          status: status.toLowerCase(),
          totalRecords: tempRecords.length,
          approvedCount: approvedCount,
          rejectedCount: rejectedCount,
          processedRecords: processedRecords.length,
          errors: errors.length,
          processedBy: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            timestamp: Date.now(),
          },
        },
        ipAddress: req.ip,
        companyId: req.user.companyId,
      });
    } catch (auditError) {
      console.error("❌ Error creating audit log:", auditError);
    }

    const response = {
      success: true,
      message: `Successfully processed ${processedRecords.length} temp inventory records and updated file status to ${status}`,
      data: {
        fileId: fileId,
        fileName: file.name,
        fileStatus: file.status,
        status: status.toLowerCase(),
        totalRecords: tempRecords.length,
        approvedCount: approvedCount,
        rejectedCount: rejectedCount,
        processedRecords: processedRecords.length,
        errors: errors.length,
        results: processedRecords,
        errors: errors,
      },
    };

    console.log("🎉 ProcessTempInventoryByFile completed successfully");
    res.status(200).json(response);
  } catch (err) {
    console.error("❌ ProcessTempInventoryByFile error:", err);
    next(err);
  }
};

/**
 * @desc    Test low stock notification (for frontend debugging)
 * @route   POST /api/inventory/test-low-stock
 * @access  Private
 */
exports.testLowStockNotification = asyncHandler(async (req, res, next) => {
  const { itemId, quantity, threshold } = req.body;

  // Validate required fields
  if (!itemId || quantity === undefined || threshold === undefined) {
    return next(
      new ErrorResponse("Item ID, quantity, and threshold are required", 400)
    );
  }

  try {
    // Find the inventory item
    const item = await Inventory.findById(itemId);

    if (!item) {
      return next(
        new ErrorResponse(`Inventory item not found with id ${itemId}`, 404)
      );
    }

    // Check if item belongs to user's company
    if (item.companyId.toString() !== req.user.companyId.toString()) {
      return next(
        new ErrorResponse("Not authorized to access this inventory item", 401)
      );
    }

    // Store original values
    const originalQuantity = item.quantity;
    const originalThreshold = item.threshold;

    // Temporarily update the item to trigger low stock notification
    item.quantity = quantity;
    item.threshold = threshold;
    item.lowStockAlertSent = false; // Reset alert flag for testing

    // Check if this should trigger a low stock alert
    const isLowStock = item.quantity <= item.threshold;

    if (isLowStock) {
      // Create notification
      const notificationData = {
        title: "Low Stock Alert (TEST)",
        message: `TEST: Item ${item.name} (SKU: ${item.sku}) is now below threshold. Current quantity: ${item.quantity}, Threshold: ${item.threshold}`,
        type: "Stock",
        priority: item.quantity === 0 ? "High" : "Medium",
        relatedTo: {
          model: "Inventory",
          id: item._id,
        },
        companyId: req.user.companyId,
        createdBy: req.user.id,
        isTest: true, // Mark as test notification
      };

      const notification = await Notification.create(notificationData);

      // Send real-time notification via WebSocket
      const io = req.app.get("io");
      if (io) {
        io.to(`company_${req.user.companyId}`).emit("new_notification", {
          ...notification.toObject(),
          message: `[TEST] ${notification.message}`,
        });
      }

      // Send Firebase push notification
      try {
        await sendLowStockPushNotification(item, req.user.companyId, true);
      } catch (firebaseError) {
        console.log(
          "Firebase notification error (test):",
          firebaseError.message
        );
      }

      // Set alert flag
      item.lowStockAlertSent = true;
    }

    // Save the item
    await item.save();

    // Restore original values
    item.quantity = originalQuantity;
    item.threshold = originalThreshold;
    item.lowStockAlertSent = false;
    await item.save();

    res.status(200).json({
      success: true,
      message: "Low stock notification test completed",
      data: {
        itemId: item._id,
        itemName: item.name,
        testQuantity: quantity,
        testThreshold: threshold,
        isLowStock,
        notificationCreated: isLowStock,
        originalQuantity,
        originalThreshold,
      },
    });
  } catch (error) {
    console.error("Error during low stock notification test:", error);
    return next(
      new ErrorResponse("Failed to test low stock notification", 500)
    );
  }
});
