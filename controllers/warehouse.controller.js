const Warehouse = require("../models/warehouse.model");
const Zone = require("../models/zone.model");
const Shelf = require("../models/shelf.model");
const Bin = require("../models/bin.model");
const Inventory = require("../models/inventory.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
exports.getWarehouses = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

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
    const warehouses = await Warehouse.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: warehouses.length,
      data: warehouses,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single warehouse
// @route   GET /api/warehouses/:id
// @access  Private
exports.getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create warehouse
// @route   POST /api/warehouses
// @access  Private/Admin
exports.createWarehouse = async (req, res, next) => {
  try {
    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // Check if warehouse with this name already exists
    const existingWarehouse = await Warehouse.findOne({
      name: req.body.name,
      companyId: req.user.companyId,
    });

    if (existingWarehouse) {
      return next(
        new ErrorResponse(
          `Warehouse with name ${req.body.name} already exists`,
          400
        )
      );
    }

    // Create warehouse
    const warehouse = await Warehouse.create(req.body);
    console.log("object", warehouse);
    res.status(201).json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private/Admin
exports.updateWarehouse = async (req, res, next) => {
  try {
    // Set updated by
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();

    // Find and update warehouse
    const warehouse = await Warehouse.findOneAndUpdate(
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

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private/Admin
exports.deleteWarehouse = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if warehouse has zones
    const zoneCount = await Zone.countDocuments({ warehouseId: req.params.id });

    if (zoneCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete warehouse as it contains ${zoneCount} zones`,
          400
        )
      );
    }

    // Check if inventory is assigned to this warehouse
    const inventoryCount = await Inventory.countDocuments({
      "location.warehouseId": req.params.id,
    });

    if (inventoryCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete warehouse as it contains ${inventoryCount} inventory items`,
          400
        )
      );
    }

    await warehouse.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get warehouse structure (zones, shelves, bins)
// @route   GET /api/warehouses/:id/structure
// @access  Private
exports.getWarehouseStructure = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Get zones in warehouse
    const zones = await Zone.find({ warehouseId: req.params.id });

    // Build structure with zones, shelves, and bins
    const structure = {
      warehouse: {
        _id: warehouse._id,
        name: warehouse.name,
        address: warehouse.address,
        contactPerson: warehouse.contactPerson,
        isActive: warehouse.isActive,
      },
      zones: [],
    };

    // For each zone, get shelves
    for (const zone of zones) {
      const shelves = await Shelf.find({ zoneId: zone._id });

      const zoneData = {
        _id: zone._id,
        name: zone.name,
        description: zone.description,
        isActive: zone.isActive,
        shelves: [],
      };

      // For each shelf, get bins
      for (const shelf of shelves) {
        const bins = await Bin.find({ shelfId: shelf._id });

        const shelfData = {
          _id: shelf._id,
          name: shelf.name,
          description: shelf.description,
          capacity: shelf.capacity,
          isActive: shelf.isActive,
          bins: bins.map((bin) => ({
            _id: bin._id,
            name: bin.name,
            description: bin.description,
            capacity: bin.capacity,
            currentItems: bin.currentItems,
            isActive: bin.isActive,
          })),
        };

        zoneData.shelves.push(shelfData);
      }

      structure.zones.push(zoneData);
    }

    res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get warehouse statistics
// @route   GET /api/warehouses/:id/stats
// @access  Private
exports.getWarehouseStats = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Count zones, shelves, bins
    const zoneCount = await Zone.countDocuments({ warehouseId: req.params.id });
    const shelfCount = await Shelf.countDocuments({
      warehouseId: req.params.id,
    });
    const binCount = await Bin.countDocuments({ warehouseId: req.params.id });

    // Count inventory items
    const inventoryCount = await Inventory.countDocuments({
      "location.warehouseId": req.params.id,
    });

    // Count low stock and out of stock items
    const lowStockCount = await Inventory.countDocuments({
      "location.warehouseId": req.params.id,
      status: "Low Stock",
    });

    const outOfStockCount = await Inventory.countDocuments({
      "location.warehouseId": req.params.id,
      status: "Out of Stock",
    });

    // Calculate bin utilization
    const bins = await Bin.find({ warehouseId: req.params.id });
    let totalCapacity = 0;
    let totalUsed = 0;

    bins.forEach((bin) => {
      totalCapacity += bin.capacity;
      totalUsed += bin.currentItems;
    });

    const utilizationRate =
      totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        zoneCount,
        shelfCount,
        binCount,
        inventoryCount,
        lowStockCount,
        outOfStockCount,
        totalCapacity,
        totalUsed,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Zone Controller Methods
// @desc    Get all zones in a warehouse
// @route   GET /api/warehouses/:warehouseId/zones
// @access  Private
exports.getZones = async (req, res, next) => {
  try {
    // Check if warehouse exists and belongs to company
    const warehouse = await Warehouse.findOne({
      _id: req.params.warehouseId,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.warehouseId}`,
          404
        )
      );
    }

    // Get zones
    const zones = await Zone.find({ warehouseId: req.params.warehouseId });

    res.status(200).json({
      success: true,
      count: zones.length,
      data: zones,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single zone
// @route   GET /api/warehouses/:warehouseId/zones/:id
// @access  Private
exports.getZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({
      _id: req.params.id,
      warehouseId: req.params.warehouseId,
      companyId: req.user.companyId,
    });

    if (!zone) {
      return next(
        new ErrorResponse(`Zone not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create zone
// @route   POST /api/warehouses/:warehouseId/zones
// @access  Private/Admin
exports.createZone = async (req, res, next) => {
  try {
    // Check if warehouse exists and belongs to company
    const warehouse = await Warehouse.findOne({
      _id: req.params.warehouseId,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.params.warehouseId}`,
          404
        )
      );
    }

    // Set warehouse and company IDs
    req.body.warehouseId = req.params.warehouseId;
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // Check if zone with this name already exists in the warehouse
    const existingZone = await Zone.findOne({
      name: req.body.name,
      warehouseId: req.params.warehouseId,
    });

    if (existingZone) {
      return next(
        new ErrorResponse(
          `Zone with name ${req.body.name} already exists in this warehouse`,
          400
        )
      );
    }

    // Create zone
    const zone = await Zone.create(req.body);

    res.status(201).json({
      success: true,
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update zone
// @route   PUT /api/warehouses/:warehouseId/zones/:id
// @access  Private/Admin
exports.updateZone = async (req, res, next) => {
  try {
    // Set updated by
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();

    // Find and update zone
    const zone = await Zone.findOneAndUpdate(
      {
        _id: req.params.id,
        warehouseId: req.params.warehouseId,
        companyId: req.user.companyId,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!zone) {
      return next(
        new ErrorResponse(`Zone not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete zone
// @route   DELETE /api/warehouses/:warehouseId/zones/:id
// @access  Private/Admin
exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({
      _id: req.params.id,
      warehouseId: req.params.warehouseId,
      companyId: req.user.companyId,
    });

    if (!zone) {
      return next(
        new ErrorResponse(`Zone not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if zone has shelves
    const shelfCount = await Shelf.countDocuments({ zoneId: req.params.id });

    if (shelfCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete zone as it contains ${shelfCount} shelves`,
          400
        )
      );
    }

    // Check if inventory is assigned to this zone
    const inventoryCount = await Inventory.countDocuments({
      "location.zoneId": req.params.id,
    });

    if (inventoryCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete zone as it contains ${inventoryCount} inventory items`,
          400
        )
      );
    }
    await Zone.findByIdAndDelete(zone._id);
    // await zone.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: "Zone deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
