const Bin = require('../models/bin.model');
const Shelf = require('../models/shelf.model');
const Zone = require('../models/zone.model');
const Warehouse = require('../models/warehouse.model');
const Inventory = require('../models/inventory.model');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all bins in a shelf
// @route   GET /api/bins
// @route   GET /api/shelves/:shelfId/bins
// @access  Private
exports.getBins = async (req, res, next) => {
  try {
    let query = { companyId: req.user.companyId };

    // If shelfId is provided in params, filter by shelf
    if (req.params.shelfId) {
      // Check if shelf exists and belongs to company
      const shelf = await Shelf.findOne({
        _id: req.params.shelfId,
        companyId: req.user.companyId
      });

      if (!shelf) {
        return next(
          new ErrorResponse(`Shelf not found with id of ${req.params.shelfId}`, 404)
        );
      }

      query.shelfId = req.params.shelfId;
    }

    // Filter by warehouse if provided in query
    if (req.query.warehouseId) {
      query.warehouseId = req.query.warehouseId;
    }

    // Filter by zone if provided in query
    if (req.query.zoneId) {
      query.zoneId = req.query.zoneId;
    }

    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Search by name
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.name = searchRegex;
    }

    // Execute query
    const bins = await Bin.find(query).sort({ name: 1 });

    // Get inventory counts and utilization for each bin
    const binsWithUtilization = await Promise.all(
      bins.map(async (bin) => {
        // Get total inventory items in this bin
        const inventoryCount = await Inventory.countDocuments({
          "location.binId": bin._id,
        });

        // Calculate total quantity of items in the bin
        const inventoryItems = await Inventory.find({ "location.binId": bin._id });
        let totalQuantity = 0;
        inventoryItems.forEach(item => {
          totalQuantity += item.quantity || 0;
        });

        // Calculate utilization percentage
        let capacityValue = bin.capacity || 0;
        let utilizationPercentage = capacityValue > 0 ? (totalQuantity / capacityValue) * 100 : 0;
        
        // Format to 2 decimal places and ensure it doesn't exceed 100%
        utilizationPercentage = Math.min(parseFloat(utilizationPercentage.toFixed(2)), 100);

        // Convert the Mongoose document to a plain JavaScript object
        const binObj = bin.toObject();
        
        // Add utilization data
        return {
          ...binObj,
          utilization: {
            inventoryCount,
            totalQuantity,
            capacityValue,
            utilizationPercentage,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: binsWithUtilization.length,
      data: binsWithUtilization,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single bin
// @route   GET /api/bins/:id
// @route   GET /api/shelves/:shelfId/bins/:id
// @access  Private
exports.getBin = async (req, res, next) => {
  try {
    let query = { 
      _id: req.params.id,
      companyId: req.user.companyId
    };

    // If shelfId is provided in params, add to query
    if (req.params.shelfId) {
      query.shelfId = req.params.shelfId;
    }

    const bin = await Bin.findOne(query);

    if (!bin) {
      return next(
        new ErrorResponse(`Bin not found with id of ${req.params.id}`, 404)
      );
    }

    // Get inventory counts and utilization
    const inventoryCount = await Inventory.countDocuments({
      "location.binId": bin._id,
    });

    // Calculate total quantity of items in the bin
    const inventoryItems = await Inventory.find({ "location.binId": bin._id });
    let totalQuantity = 0;
    inventoryItems.forEach(item => {
      totalQuantity += item.quantity || 0;
    });

    // Calculate utilization percentage
    let capacityValue = bin.capacity || 0;
    let utilizationPercentage = capacityValue > 0 ? (totalQuantity / capacityValue) * 100 : 0;
    
    // Format to 2 decimal places and ensure it doesn't exceed 100%
    utilizationPercentage = Math.min(parseFloat(utilizationPercentage.toFixed(2)), 100);

    // Convert the Mongoose document to a plain JavaScript object
    const binObj = bin.toObject();
    
    // Add utilization data
    const binWithUtilization = {
      ...binObj,
      utilization: {
        inventoryCount,
        totalQuantity,
        capacityValue,
        utilizationPercentage,
      },
    };

    res.status(200).json({
      success: true,
      data: binWithUtilization
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create bin
// @route   POST /api/bins
// @route   POST /api/shelves/:shelfId/bins
// @access  Private/Admin
exports.createBin = async (req, res, next) => {
  try {
    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // If shelfId is provided in params, use it
    if (req.params.shelfId) {
      req.body.shelfId = req.params.shelfId;
    }

    // Check if shelf exists and belongs to company
    const shelf = await Shelf.findOne({
      _id: req.body.shelfId,
      companyId: req.user.companyId
    });

    if (!shelf) {
      return next(
        new ErrorResponse(`Shelf not found with id of ${req.body.shelfId}`, 404)
      );
    }

    // Set zone and warehouse IDs from shelf
    req.body.zoneId = shelf.zoneId;
    req.body.warehouseId = shelf.warehouseId;

    // Check if bin with this name already exists in the shelf
    const existingBin = await Bin.findOne({
      name: req.body.name,
      shelfId: req.body.shelfId
    });

    if (existingBin) {
      return next(
        new ErrorResponse(`Bin with name ${req.body.name} already exists in this shelf`, 400)
      );
    }

    // Create bin
    const bin = await Bin.create(req.body);

    res.status(201).json({
      success: true,
      data: bin
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update bin
// @route   PUT /api/bins/:id
// @route   PUT /api/shelves/:shelfId/bins/:id
// @access  Private/Admin
exports.updateBin = async (req, res, next) => {
  try {
    // Set updated by
    req.body.updatedBy = req.user.id;
    req.body.updatedAt = Date.now();

    let query = { 
      _id: req.params.id,
      companyId: req.user.companyId
    };

    // If shelfId is provided in params, add to query
    if (req.params.shelfId) {
      query.shelfId = req.params.shelfId;
    }

    // Find and update bin
    const bin = await Bin.findOneAndUpdate(
      query,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!bin) {
      return next(
        new ErrorResponse(`Bin not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: bin
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete bin
// @route   DELETE /api/bins/:id
// @route   DELETE /api/shelves/:shelfId/bins/:id
// @access  Private/Admin
exports.deleteBin = async (req, res, next) => {
  try {
    let query = { 
      _id: req.params.id,
      companyId: req.user.companyId
    };

    // If shelfId is provided in params, add to query
    if (req.params.shelfId) {
      query.shelfId = req.params.shelfId;
    }

    const bin = await Bin.findOne(query);

    if (!bin) {
      return next(
        new ErrorResponse(`Bin not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if inventory is assigned to this bin
    const inventoryCount = await Inventory.countDocuments({ 'location.binId': req.params.id });
    
    if (inventoryCount > 0) {
      return next(
        new ErrorResponse(`Cannot delete bin as it contains ${inventoryCount} inventory items`, 400)
      );
    }

      await Bin.findByIdAndDelete(bin._id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Bins deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory items in a bin
// @route   GET /api/bins/:id/inventory
// @access  Private
exports.getBinInventory = async (req, res, next) => {
  try {
    const bin = await Bin.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!bin) {
      return next(
        new ErrorResponse(`Bin not found with id of ${req.params.id}`, 404)
      );
    }

    // Get inventory items in this bin
    const inventoryItems = await Inventory.find({ 'location.binId': req.params.id });

    res.status(200).json({
      success: true,
      count: inventoryItems.length,
      data: inventoryItems
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update bin capacity and current items
// @route   PUT /api/bins/:id/capacity
// @access  Private/Admin
exports.updateBinCapacity = async (req, res, next) => {
  try {
    const { capacity } = req.body;
    
    if (!capacity || capacity < 0) {
      return next(
        new ErrorResponse('Please provide a valid capacity value', 400)
      );
    }

    const bin = await Bin.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!bin) {
      return next(
        new ErrorResponse(`Bin not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if new capacity is less than current items
    if (capacity < bin.currentItems) {
      return next(
        new ErrorResponse(`Capacity cannot be less than current items count (${bin.currentItems})`, 400)
      );
    }

    // Update bin capacity
    bin.capacity = capacity;
    bin.updatedBy = req.user.id;
    bin.updatedAt = Date.now();
    await bin.save();

    res.status(200).json({
      success: true,
      data: bin
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get simplified bin list (id and name only)
// @route   GET /api/bins/simple
// @access  Private
exports.getSimpleBins = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by shelf if provided
    if (req.query.shelfId) {
      query.shelfId = req.query.shelfId;
    }

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
      query.isActive = req.query.isActive === 'true';
    }

    // Execute query and select only id, name, and parent IDs
    const bins = await Bin.find(query)
      .select('_id name shelfId zoneId warehouseId')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: bins.length,
      data: bins,
    });
  } catch (err) {
    next(err);
  }
};
