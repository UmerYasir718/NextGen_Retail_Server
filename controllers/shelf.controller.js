const Shelf = require("../models/shelf.model");
const Bin = require("../models/bin.model");
const Zone = require("../models/zone.model");
const Warehouse = require("../models/warehouse.model");
const Inventory = require("../models/inventory.model");
const ErrorResponse = require("../utils/errorResponse");
const {
  logEntityCreation,
  logEntityUpdate,
  logEntityDeletion,
} = require("../utils/auditLogger");

// @desc    Get all shelves in a zone
// @route   GET /api/shelves
// @route   GET /api/zones/:zoneId/shelves
// @access  Private
exports.getShelves = async (req, res, next) => {
  try {
    let query = { companyId: req.user.companyId };

    // If zoneId is provided in params, filter by zone
    if (req.params.zoneId) {
      // Check if zone exists and belongs to company
      const zone = await Zone.findOne({
        _id: req.params.zoneId,
        companyId: req.user.companyId,
      });

      if (!zone) {
        return next(
          new ErrorResponse(
            `Zone not found with id of ${req.params.zoneId}`,
            404
          )
        );
      }

      query.zoneId = req.params.zoneId;
    }

    // Filter by warehouse if provided in query
    if (req.query.warehouseId) {
      query.warehouseId = req.query.warehouseId;
    }

    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    // Search by name
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.name = searchRegex;
    }

    // Execute query
    const shelves = await Shelf.find(query).sort({ name: 1 });

    // Get inventory counts and utilization for each shelf
    const shelvesWithUtilization = await Promise.all(
      shelves.map(async (shelf) => {
        // Get total inventory items in this shelf
        const inventoryCount = await Inventory.countDocuments({
          "location.shelfId": shelf._id,
        });

        // Get total bins in this shelf
        const binCount = await Bin.countDocuments({
          shelfId: shelf._id,
        });

        // Calculate utilization percentage
        let capacityValue = shelf.capacity || 0;
        let utilizationPercentage =
          capacityValue > 0 ? (inventoryCount / capacityValue) * 100 : 0;

        // Format to 2 decimal places and ensure it doesn't exceed 100%
        utilizationPercentage = Math.min(
          parseFloat(utilizationPercentage.toFixed(2)),
          100
        );

        // Convert the Mongoose document to a plain JavaScript object
        const shelfObj = shelf.toObject();

        // Add utilization data
        return {
          ...shelfObj,
          utilization: {
            inventoryCount,
            binCount,
            capacityValue,
            utilizationPercentage,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: shelvesWithUtilization.length,
      data: shelvesWithUtilization,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single shelf
// @route   GET /api/shelves/:id
// @route   GET /api/zones/:zoneId/shelves/:id
// @access  Private
exports.getShelf = async (req, res, next) => {
  try {
    let query = {
      _id: req.params.id,
      companyId: req.user.companyId,
    };

    // If zoneId is provided in params, add to query
    if (req.params.zoneId) {
      query.zoneId = req.params.zoneId;
    }

    const shelf = await Shelf.findOne(query);

    if (!shelf) {
      return next(
        new ErrorResponse(`Shelf not found with id of ${req.params.id}`, 404)
      );
    }

    // Get inventory counts and utilization
    const inventoryCount = await Inventory.countDocuments({
      "location.shelfId": shelf._id,
    });

    // Get total bins in this shelf
    const binCount = await Bin.countDocuments({
      shelfId: shelf._id,
    });

    // Calculate utilization percentage
    let capacityValue = shelf.capacity || 0;
    let utilizationPercentage =
      capacityValue > 0 ? (inventoryCount / capacityValue) * 100 : 0;

    // Format to 2 decimal places and ensure it doesn't exceed 100%
    utilizationPercentage = Math.min(
      parseFloat(utilizationPercentage.toFixed(2)),
      100
    );

    // Convert the Mongoose document to a plain JavaScript object
    const shelfObj = shelf.toObject();

    // Add utilization data
    const shelfWithUtilization = {
      ...shelfObj,
      utilization: {
        inventoryCount,
        binCount,
        capacityValue,
        utilizationPercentage,
      },
    };

    res.status(200).json({
      success: true,
      data: shelfWithUtilization,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create shelf
// @route   POST /api/shelves
// @route   POST /api/zones/:zoneId/shelves
// @access  Private/Admin
exports.createShelf = async (req, res, next) => {
  try {
    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // If zoneId is provided in params, use it
    if (req.params.zoneId) {
      req.body.zoneId = req.params.zoneId;
    }

    // Check if zone exists and belongs to company
    const zone = await Zone.findOne({
      _id: req.body.zoneId,
      companyId: req.user.companyId,
    });

    if (!zone) {
      return next(
        new ErrorResponse(`Zone not found with id of ${req.body.zoneId}`, 404)
      );
    }

    // Set warehouse ID from zone
    req.body.warehouseId = zone.warehouseId;

    // Check if shelf with this name already exists in the zone
    const existingShelf = await Shelf.findOne({
      name: req.body.name,
      zoneId: req.body.zoneId,
    });

    if (existingShelf) {
      return next(
        new ErrorResponse(
          `Shelf with name ${req.body.name} already exists in this zone`,
          400
        )
      );
    }

    // Create shelf
    const shelf = await Shelf.create(req.body);

    // Create audit log
    await logEntityCreation(req, shelf, "Shelf", "shelf");

    res.status(201).json({
      success: true,
      data: shelf,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update shelf
// @route   PUT /api/shelves/:id
// @route   PUT /api/zones/:zoneId/shelves/:id
// @access  Private/Admin
exports.updateShelf = async (req, res, next) => {
  try {
    // Set updated by
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();

    let query = {
      _id: req.params.id,
      companyId: req.user.companyId,
    };

    // If zoneId is provided in params, add to query
    if (req.params.zoneId) {
      query.zoneId = req.params.zoneId;
    }

    // Get original shelf for audit log
    const originalShelf = await Shelf.findOne(query);

    if (!originalShelf) {
      return next(
        new ErrorResponse(`Shelf not found with id of ${req.params.id}`, 404)
      );
    }

    // Find and update shelf
    const shelf = await Shelf.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    });

    // Create audit log
    await logEntityUpdate(req, originalShelf, shelf, "Shelf", "shelf");

    res.status(200).json({
      success: true,
      data: shelf,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete shelf
// @route   DELETE /api/shelves/:id
// @route   DELETE /api/zones/:zoneId/shelves/:id
// @access  Private/Admin
exports.deleteShelf = async (req, res, next) => {
  try {
    let query = {
      _id: req.params.id,
      companyId: req.user.companyId,
    };

    // If zoneId is provided in params, add to query
    if (req.params.zoneId) {
      query.zoneId = req.params.zoneId;
    }

    const shelf = await Shelf.findOne(query);

    if (!shelf) {
      return next(
        new ErrorResponse(`Shelf not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if shelf has bins
    const binCount = await Bin.countDocuments({ shelfId: req.params.id });

    if (binCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete shelf as it contains ${binCount} bins`,
          400
        )
      );
    }

    // Check if inventory is assigned to this shelf
    const inventoryCount = await Inventory.countDocuments({
      "location.shelfId": req.params.id,
    });

    if (inventoryCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete shelf as it contains ${inventoryCount} inventory items`,
          400
        )
      );
    }

    // Create audit log before deletion
    await logEntityDeletion(req, shelf, "Shelf", "shelf");

    await Shelf.findByIdAndDelete(shelf._id);

    res.status(200).json({
      success: true,
      data: {},
      message: "Shelf deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get shelf utilization
// @route   GET /api/shelves/:id/utilization
// @access  Private
exports.getShelfUtilization = async (req, res, next) => {
  try {
    const shelf = await Shelf.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!shelf) {
      return next(
        new ErrorResponse(`Shelf not found with id of ${req.params.id}`, 404)
      );
    }

    // Get bins in this shelf
    const bins = await Bin.find({ shelfId: req.params.id });

    // Calculate utilization
    let totalCapacity = shelf.capacity;
    let totalUsed = 0;
    let binUtilization = [];

    bins.forEach((bin) => {
      totalUsed += bin.currentItems;
      binUtilization.push({
        binId: bin._id,
        name: bin.name,
        capacity: bin.capacity,
        used: bin.currentItems,
        utilizationRate:
          bin.capacity > 0 ? (bin.currentItems / bin.capacity) * 100 : 0,
      });
    });

    const utilizationRate =
      totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        shelfId: shelf._id,
        name: shelf.name,
        totalCapacity,
        totalUsed,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        binCount: bins.length,
        binUtilization,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get simplified shelf list (id and name only)
// @route   GET /api/shelves/simple
// @access  Private
exports.getSimpleShelves = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by zone if provided
    if (req.query.zoneId) {
      query.zoneId = req.query.zoneId;
    }

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query.warehouseId = req.query.warehouseId;
    }

    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    // Execute query and select only id, name, and zoneId
    const shelves = await Shelf.find(query)
      .select("_id name zoneId warehouseId")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: shelves.length,
      data: shelves,
    });
  } catch (err) {
    next(err);
  }
};
