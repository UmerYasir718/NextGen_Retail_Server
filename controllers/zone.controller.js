const Zone = require("../models/zone.model");
const Shelf = require("../models/shelf.model");
const Inventory = require("../models/inventory.model");
const Warehouse = require("../models/warehouse.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all zones
// @route   GET /api/zones
// @access  Private
exports.getZones = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by warehouse if provided
    if (req.params.warehouseId) {
      query.warehouseId = req.params.warehouseId;
    } else if (req.query.warehouseId) {
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
    const zones = await Zone.find(query).sort({ createdAt: -1 });

    // Get inventory counts and utilization for each zone
    const zonesWithUtilization = await Promise.all(
      zones.map(async (zone) => {
        // Get total inventory items in this zone
        const inventoryCount = await Inventory.countDocuments({
          "location.zoneId": zone._id,
        });

        // Get total shelves and bins in this zone
        const shelfCount = await Shelf.countDocuments({
          zoneId: zone._id,
        });

        // Calculate utilization percentage based on inventory count
        // Since zones don't have a capacity field, we'll use a different approach
        // We'll calculate utilization as the percentage of shelves that contain inventory
        let utilizationPercentage = 0;
        
        if (shelfCount > 0) {
          // Count shelves that have inventory items
          const shelvesWithInventory = await Shelf.distinct('_id', { 
            zoneId: zone._id,
            _id: { $in: await Inventory.distinct('location.shelfId', { "location.zoneId": zone._id }) }
          });
          
          utilizationPercentage = (shelvesWithInventory.length / shelfCount) * 100;
        }
        
        // Format to 2 decimal places and ensure it doesn't exceed 100%
        utilizationPercentage = Math.min(parseFloat(utilizationPercentage.toFixed(2)), 100);

        // Convert the Mongoose document to a plain JavaScript object
        const zoneObj = zone.toObject();
        
        // Add utilization data
        return {
          ...zoneObj,
          utilization: {
            inventoryCount,
            shelfCount,
            utilizationPercentage,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: zonesWithUtilization.length,
      data: zonesWithUtilization,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single zone
// @route   GET /api/zones/:id
// @access  Private
exports.getZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!zone) {
      return next(
        new ErrorResponse(`Zone not found with id of ${req.params.id}`, 404)
      );
    }

    // Get inventory counts and utilization
    const inventoryCount = await Inventory.countDocuments({
      "location.zoneId": zone._id,
    });

    // Get total shelves in this zone
    const shelfCount = await Shelf.countDocuments({
      zoneId: zone._id,
    });

    // Calculate utilization percentage based on inventory count
    // Since zones don't have a capacity field, we'll use a different approach
    // We'll calculate utilization as the percentage of shelves that contain inventory
    let utilizationPercentage = 0;
    
    if (shelfCount > 0) {
      // Count shelves that have inventory items
      const shelvesWithInventory = await Shelf.distinct('_id', { 
        zoneId: zone._id,
        _id: { $in: await Inventory.distinct('location.shelfId', { "location.zoneId": zone._id }) }
      });
      
      utilizationPercentage = (shelvesWithInventory.length / shelfCount) * 100;
    }
    
    // Format to 2 decimal places and ensure it doesn't exceed 100%
    utilizationPercentage = Math.min(parseFloat(utilizationPercentage.toFixed(2)), 100);

    // Convert the Mongoose document to a plain JavaScript object
    const zoneObj = zone.toObject();
    
    // Add utilization data
    const zoneWithUtilization = {
      ...zoneObj,
      utilization: {
        inventoryCount,
        shelfCount,
        utilizationPercentage,
      },
    };

    res.status(200).json({
      success: true,
      data: zoneWithUtilization,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create zone
// @route   POST /api/zones
// @access  Private/Admin
exports.createZone = async (req, res, next) => {
  try {
    // Check if warehouse exists and belongs to company
    const warehouse = await Warehouse.findOne({
      _id: req.body.warehouseId,
      companyId: req.user.companyId,
    });

    if (!warehouse) {
      return next(
        new ErrorResponse(
          `Warehouse not found with id of ${req.body.warehouseId}`,
          404
        )
      );
    }

    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // Check if zone with this name already exists in the warehouse
    const existingZone = await Zone.findOne({
      name: req.body.name,
      warehouseId: req.body.warehouseId,
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
// @route   PUT /api/zones/:id
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
// @route   DELETE /api/zones/:id
// @access  Private/Admin
exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({
      _id: req.params.id,
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

    res.status(200).json({
      success: true,
      data: {},
      message: "Zone deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get simplified zone list (id and name only)
// @route   GET /api/zones/simple
// @access  Private
exports.getSimpleZones = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query.warehouseId = req.query.warehouseId;
    }

    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    // Execute query and select only id and name
    const zones = await Zone.find(query)
      .select('_id name warehouseId')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: zones.length,
      data: zones,
    });
  } catch (err) {
    next(err);
  }
};
