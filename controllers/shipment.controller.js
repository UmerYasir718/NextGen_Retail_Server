const Shipment = require("../models/shipment.model");
const Inventory = require("../models/inventory.model");
const ItemMovement = require("../models/itemMovement.model");
const ErrorResponse = require("../utils/errorResponse");
const cloudinary = require("../utils/cloudinary");

// @desc    Get all shipments
// @route   GET /api/shipments
// @access  Private
exports.getShipments = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.shipmentDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    } else if (req.query.startDate) {
      query.shipmentDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.shipmentDate = { $lte: new Date(req.query.endDate) };
    }

    // Search by reference number or supplier/customer
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { referenceNumber: searchRegex },
        { "supplier.name": searchRegex },
        { "customer.name": searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Shipment.countDocuments(query);

    // Execute query
    const shipments = await Shipment.find(query)
      .populate("createdBy", "name email")
      .skip(startIndex)
      .limit(limit)
      .sort({ shipmentDate: -1 });

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
      count: shipments.length,
      pagination,
      total,
      data: shipments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single shipment
// @route   GET /api/shipments/:id
// @access  Private
exports.getShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).populate("createdBy", "name email");

    if (!shipment) {
      return next(
        new ErrorResponse(`Shipment not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: shipment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create shipment
// @route   POST /api/shipments
// @access  Private
exports.createShipment = async (req, res, next) => {
  try {
    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // Create shipment
    const shipment = await Shipment.create(req.body);

    // If shipment is received, update inventory
    if (req.body.type === "Incoming" && req.body.status === "Received") {
      await processIncomingShipment(shipment, req.user.id);
    }

    // If shipment is shipped, update inventory
    if (req.body.type === "Outgoing" && req.body.status === "Shipped") {
      await processOutgoingShipment(shipment, req.user.id);
    }

    res.status(201).json({
      success: true,
      data: shipment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update shipment
// @route   PUT /api/shipments/:id
// @access  Private
exports.updateShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!shipment) {
      return next(
        new ErrorResponse(`Shipment not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if status is changing to Received or Shipped
    const statusChanging =
      req.body.status && req.body.status !== shipment.status;
    const becomingReceived =
      statusChanging &&
      req.body.status === "Received" &&
      shipment.type === "Incoming";
    const becomingShipped =
      statusChanging &&
      req.body.status === "Shipped" &&
      shipment.type === "Outgoing";

    // Update shipment
    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    // Process inventory changes if status changed to Received or Shipped
    if (becomingReceived) {
      await processIncomingShipment(updatedShipment, req.user.id);
    }

    if (becomingShipped) {
      await processOutgoingShipment(updatedShipment, req.user.id);
    }

    res.status(200).json({
      success: true,
      data: updatedShipment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete shipment
// @route   DELETE /api/shipments/:id
// @access  Private/Admin
exports.deleteShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!shipment) {
      return next(
        new ErrorResponse(`Shipment not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if shipment has been received or shipped
    if (
      (shipment.type === "Incoming" && shipment.status === "Received") ||
      (shipment.type === "Outgoing" && shipment.status === "Shipped")
    ) {
      return next(
        new ErrorResponse(
          `Cannot delete a shipment that has been ${shipment.status.toLowerCase()}`,
          400
        )
      );
    }

    await shipment.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload shipment document
// @route   PUT /api/shipments/:id/document
// @access  Private
exports.uploadShipmentDocument = async (req, res, next) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!shipment) {
      return next(
        new ErrorResponse(`Shipment not found with id of ${req.params.id}`, 404)
      );
    }

    if (!req.files || !req.files.document) {
      return next(new ErrorResponse("Please upload a document", 400));
    }

    const file = req.files.document;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return next(new ErrorResponse("File size cannot exceed 5MB", 400));
    }

    // Check file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return next(
        new ErrorResponse("Please upload a PDF, JPEG, or PNG file", 400)
      );
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "shipment_documents",
      resource_type: "auto",
    });

    // Add document to shipment
    const document = {
      name: file.name,
      url: result.secure_url,
      type: file.mimetype,
      uploadedAt: Date.now(),
      uploadedBy: req.user.id,
    };

    shipment.documents.push(document);
    await shipment.save();

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get shipment statistics
// @route   GET /api/shipments/stats
// @access  Private/Admin
exports.getShipmentStats = async (req, res, next) => {
  try {
    // Set time range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));

    // Get counts by type and status
    const typeCounts = await Shipment.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          shipmentDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get daily shipment counts
    const dailyShipments = await Shipment.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          shipmentDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$shipmentDate" },
            },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Format the results
    const stats = {
      incoming: {
        total: 0,
        pending: 0,
        received: 0,
        cancelled: 0,
      },
      outgoing: {
        total: 0,
        pending: 0,
        shipped: 0,
        cancelled: 0,
      },
      daily: {},
    };

    // Process type counts
    typeCounts.forEach((item) => {
      const type = item._id.type.toLowerCase();
      const status = item._id.status.toLowerCase();

      stats[type].total += item.count;
      stats[type][status] += item.count;
    });

    // Process daily counts
    dailyShipments.forEach((item) => {
      const date = item._id.date;
      const type = item._id.type.toLowerCase();

      if (!stats.daily[date]) {
        stats.daily[date] = { incoming: 0, outgoing: 0 };
      }

      stats.daily[date][type] = item.count;
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to process incoming shipment
async function processIncomingShipment(shipment, userId) {
  // Update inventory for each item in the shipment
  for (const item of shipment.items) {
    // Find inventory item by SKU
    let inventoryItem = await Inventory.findOne({
      sku: item.sku,
      companyId: shipment.companyId,
    });

    if (inventoryItem) {
      // Store original quantity for notification check
      const originalQuantity = inventoryItem.quantity;

      // Update existing inventory
      inventoryItem.quantity += item.quantity;
      await inventoryItem.save();

      // Check for low stock notification (only if quantity was previously low)
      if (
        originalQuantity <= inventoryItem.threshold &&
        inventoryItem.quantity > inventoryItem.threshold
      ) {
        // Reset the alert flag since quantity is now above threshold
        inventoryItem.lowStockAlertSent = false;
        await inventoryItem.save();
        console.log(
          `Low stock alert flag reset for item: ${inventoryItem.name} (${inventoryItem.sku}) - quantity restored`
        );
      }
    } else {
      // Create new inventory item
      inventoryItem = await Inventory.create({
        name: item.name,
        sku: item.sku,
        description: item.description || "",
        category: item.category || "General",
        quantity: item.quantity,
        threshold: item.threshold || 5,
        price: {
          cost: item.cost || 0,
          retail: item.retail || 0,
        },
        supplier: {
          name: shipment.supplier ? shipment.supplier.name : "",
          contactInfo: shipment.supplier ? shipment.supplier.contactInfo : "",
        },
        companyId: shipment.companyId,
        createdBy: userId,
      });
    }

    // Create item movement record
    await ItemMovement.create({
      itemId: inventoryItem._id,
      quantity: item.quantity,
      type: "In",
      reason: `Incoming Shipment: ${shipment.referenceNumber}`,
      destination: shipment.destination,
      companyId: shipment.companyId,
      movedBy: userId,
      shipmentId: shipment._id,
    });
  }
}

// Helper function to process outgoing shipment
async function processOutgoingShipment(shipment, userId) {
  // Update inventory for each item in the shipment
  for (const item of shipment.items) {
    // Find inventory item by SKU
    const inventoryItem = await Inventory.findOne({
      sku: item.sku,
      companyId: shipment.companyId,
    });

    if (!inventoryItem) {
      throw new Error(`Inventory item with SKU ${item.sku} not found`);
    }

    // Check if there's enough quantity
    if (inventoryItem.quantity < item.quantity) {
      throw new Error(
        `Not enough quantity for item ${item.name} (SKU: ${item.sku})`
      );
    }

    // Store original quantity for notification check
    const originalQuantity = inventoryItem.quantity;

    // Update inventory
    inventoryItem.quantity -= item.quantity;
    await inventoryItem.save();

    // Check for low stock notification after quantity reduction
    try {
      // Check if quantity is now below or equal to threshold
      const isLowStock = inventoryItem.quantity <= inventoryItem.threshold;

      if (isLowStock && !inventoryItem.lowStockAlertSent) {
        // Mark the item with a flag indicating an alert was sent
        inventoryItem.lowStockAlertSent = true;
        await inventoryItem.save();

        // Create notification
        const Notification = require("../models/notification.model");
        const User = require("../models/user.model");
        const firebaseNotification = require("../utils/firebaseNotification");

        const notification = await Notification.create({
          title: `Low Stock Alert`,
          message: `Item ${inventoryItem.name} (SKU: ${inventoryItem.sku}) is now below threshold. Current quantity: ${inventoryItem.quantity}, Threshold: ${inventoryItem.threshold}`,
          type: "Stock",
          priority: inventoryItem.quantity === 0 ? "High" : "Medium",
          relatedTo: {
            model: "Inventory",
            id: inventoryItem._id,
          },
          recipients: [], // Will be populated with admins and inventory managers
          companyId: shipment.companyId,
        });

        // Find admins and inventory managers to notify
        const recipients = await User.find({
          companyId: shipment.companyId,
          role: { $in: ["Admin", "InventoryManager"] },
        }).select("_id");

        // Add recipients to notification
        notification.recipients = recipients.map((user) => ({
          userId: user._id,
          read: false,
        }));
        await notification.save();

        // Send Firebase push notification to offline users
        try {
          await firebaseNotification.sendLowStockAlert(
            inventoryItem,
            shipment.companyId
          );
          console.log(
            `Firebase notification sent for low stock alert: ${inventoryItem.name} (${inventoryItem.sku})`
          );
        } catch (error) {
          console.error("Error sending Firebase notification:", error);
        }

        console.log(
          `Low stock notification sent for item: ${inventoryItem.name} (${inventoryItem.sku})`
        );
      }
      // Reset the alert flag if quantity goes above threshold
      else if (!isLowStock && inventoryItem.lowStockAlertSent) {
        inventoryItem.lowStockAlertSent = false;
        await inventoryItem.save();
        console.log(
          `Low stock alert flag reset for item: ${inventoryItem.name} (${inventoryItem.sku})`
        );
      }
    } catch (notificationError) {
      console.error(
        "Error processing low stock notification:",
        notificationError
      );
      // Don't fail the main operation if notification fails
    }

    // Create item movement record
    await ItemMovement.create({
      itemId: inventoryItem._id,
      quantity: item.quantity,
      type: "Out",
      reason: `Outgoing Shipment: ${shipment.referenceNumber}`,
      source: shipment.source,
      companyId: shipment.companyId,
      movedBy: userId,
      shipmentId: shipment._id,
    });
  }
}
