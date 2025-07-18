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
    const endIndex = page * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

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
      count: inventory.length,
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
    const endIndex = page * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

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
      count: inventory.length,
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
    const endIndex = page * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

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
      count: inventory.length,
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
    console.log("DG SAB");
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
    const endIndex = page * limit;
    const total = await Inventory.countDocuments(query);

    // Execute query
    const inventory = await Inventory.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

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
      count: inventory.length,
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
        const inventoryItems = await Inventory.find({ "location.binId": bin._id });
        let totalQuantity = 0;
        inventoryItems.forEach(invItem => {
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

    // Check if location has changed
    const locationChanged = (
      (originalItem.location?.binId?.toString() !== item.location?.binId?.toString()) ||
      (originalItem.location?.shelfId?.toString() !== item.location?.shelfId?.toString()) ||
      (originalItem.location?.zoneId?.toString() !== item.location?.zoneId?.toString()) ||
      (originalItem.location?.warehouseId?.toString() !== item.location?.warehouseId?.toString()) ||
      (originalItem.quantity !== item.quantity)
    );

    // If location or quantity changed, update utilization for both old and new locations
    if (locationChanged) {
      // Update old bin utilization if it existed
      if (originalItem.location && originalItem.location.binId) {
        // No need to update bin directly as utilization is calculated on-the-fly in GET APIs
      }

      // Update new bin utilization if it exists
      if (item.location && item.location.binId) {
        // No need to update bin directly as utilization is calculated on-the-fly in GET APIs
      }
      
      // Create audit log for location change
      try {
        // Get warehouse, zone, shelf, bin names for better readability in logs
        const oldLocationDetails = await getLocationDetails(originalItem.location);
        const newLocationDetails = await getLocationDetails(item.location);
        
        // Create audit log entry
        await AuditLog.create({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'Update',
          module: 'Inventory',
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
              quantity: originalItem.quantity
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
              quantity: item.quantity
            },
            changedBy: {
              userId: req.user.id,
              userName: req.user.name,
              userRole: req.user.role,
              timestamp: Date.now()
            }
          },
          ipAddress: req.ip,
          companyId: req.user.companyId,
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the main operation if audit logging fails
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
          // Create new inventory item
          await Inventory.create({
            name: tempItem.name,
            sku: tempItem.sku,
            tagId: tempItem.tagId,
            description: tempItem.description,
            category: tempItem.category,
            quantity: tempItem.quantity,
            threshold: tempItem.threshold,
            location: tempItem.location,
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
