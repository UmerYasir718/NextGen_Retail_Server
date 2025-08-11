const mongoose = require("mongoose");
const UHFReader = require("../models/uhfReader.model");
const AuditLog = require("../models/auditLog.model");
const asyncHandler = require("../middlewares/async");
const ErrorResponse = require("../utils/errorResponse");

/**
 * @desc    Get all UHF readers for a company
 * @route   GET /api/v1/uhf-readers
 * @access  Private
 */
exports.getUHFReaders = asyncHandler(async (req, res, next) => {
  const { companyId } = req.user;

  // Build query
  const query = { companyId };

  // Add filters if provided
  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.locationType) {
    query["location.type"] = req.query.locationType;
  }

  if (req.query.warehouseId && req.query.warehouseId.trim() !== "") {
    // Validate ObjectId format
    if (mongoose.Types.ObjectId.isValid(req.query.warehouseId)) {
      query["location.warehouseId"] = req.query.warehouseId;
    }
  }

  if (req.query.zoneId && req.query.zoneId.trim() !== "") {
    // Validate ObjectId format
    if (mongoose.Types.ObjectId.isValid(req.query.zoneId)) {
      query["location.zoneId"] = req.query.zoneId;
    }
  }

  if (req.query.shelfId && req.query.shelfId.trim() !== "") {
    // Validate ObjectId format
    if (mongoose.Types.ObjectId.isValid(req.query.shelfId)) {
      query["location.shelfId"] = req.query.shelfId;
    }
  }

  if (req.query.binId && req.query.binId.trim() !== "") {
    // Validate ObjectId format
    if (mongoose.Types.ObjectId.isValid(req.query.binId)) {
      query["location.binId"] = req.query.binId;
    }
  }

  // Execute query with pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const readers = await UHFReader.find(query)
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate([
      { path: "location.warehouseId", select: "name" },
      { path: "location.zoneId", select: "name" },
      { path: "location.shelfId", select: "name" },
      { path: "location.binId", select: "name" },
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);

  // Get total count
  const total = await UHFReader.countDocuments(query);

  // Pagination result
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };

  res.status(200).json({
    success: true,
    count: readers.length,
    pagination,
    data: readers,
  });
});

/**
 * @desc    Get single UHF reader
 * @route   GET /api/v1/uhf-readers/:id
 * @access  Private
 */
exports.getUHFReader = asyncHandler(async (req, res, next) => {
  const { companyId } = req.user;

  const reader = await UHFReader.findOne({
    _id: req.params.id,
    companyId,
  }).populate([
    { path: "location.warehouseId", select: "name" },
    { path: "location.zoneId", select: "name" },
    { path: "location.shelfId", select: "name" },
    { path: "location.binId", select: "name" },
    { path: "createdBy", select: "name" },
    { path: "updatedBy", select: "name" },
  ]);

  if (!reader) {
    return next(
      new ErrorResponse(`UHF reader not found with id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: reader,
  });
});

/**
 * @desc    Create new UHF reader
 * @route   POST /api/v1/uhf-readers
 * @access  Private
 */
exports.createUHFReader = asyncHandler(async (req, res, next) => {
  const { companyId, _id: userId, name: userName, role: userRole } = req.user;

  // Add company ID and created by to request body
  req.body.companyId = companyId;
  req.body.createdBy = userId;

  // Check if UHF ID already exists
  const existingReader = await UHFReader.findOne({ uhfId: req.body.uhfId });
  if (existingReader) {
    return next(
      new ErrorResponse(
        `UHF reader with ID ${req.body.uhfId} already exists`,
        400
      )
    );
  }

  // Create UHF reader
  const reader = await UHFReader.create(req.body);

  // Log the action
  await AuditLog.create({
    userId,
    userName,
    userRole,
    action: "Create",
    module: "UHF Reader",
    description: `Created UHF reader: ${reader.name}`,
    details: {
      readerId: reader._id,
      readerName: reader.name,
      uhfId: reader.uhfId,
      locationType: reader.location.type,
    },
    companyId,
  });

  res.status(201).json({
    success: true,
    data: reader,
  });
});

/**
 * @desc    Update UHF reader
 * @route   PUT /api/v1/uhf-readers/:id
 * @access  Private
 */
exports.updateUHFReader = asyncHandler(async (req, res, next) => {
  const { companyId, _id: userId, name: userName, role: userRole } = req.user;

  // Add updated by to request body
  req.body.updatedBy = userId;
  req.body.updatedAt = Date.now();

  // Find reader to update
  let reader = await UHFReader.findOne({
    _id: req.params.id,
    companyId,
  });

  if (!reader) {
    return next(
      new ErrorResponse(`UHF reader not found with id ${req.params.id}`, 404)
    );
  }

  // If UHF ID is being updated, check if it already exists
  if (req.body.uhfId && req.body.uhfId !== reader.uhfId) {
    const existingReader = await UHFReader.findOne({ uhfId: req.body.uhfId });
    if (existingReader) {
      return next(
        new ErrorResponse(
          `UHF reader with ID ${req.body.uhfId} already exists`,
          400
        )
      );
    }
  }

  // Store previous state for audit log
  const previousState = {
    name: reader.name,
    uhfId: reader.uhfId,
    status: reader.status,
    locationType: reader.location.type,
    warehouseId: reader.location.warehouseId,
    zoneId: reader.location.zoneId,
    shelfId: reader.location.shelfId,
    binId: reader.location.binId,
  };

  // Update reader
  reader = await UHFReader.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Log the action
  await AuditLog.create({
    userId,
    userName,
    userRole,
    action: "Update",
    module: "UHF Reader",
    description: `Updated UHF reader: ${reader.name}`,
    details: {
      readerId: reader._id,
      readerName: reader.name,
      uhfId: reader.uhfId,
      previous: previousState,
      current: {
        name: reader.name,
        uhfId: reader.uhfId,
        status: reader.status,
        locationType: reader.location.type,
        warehouseId: reader.location.warehouseId,
        zoneId: reader.location.zoneId,
        shelfId: reader.location.shelfId,
        binId: reader.location.binId,
      },
    },
    companyId,
  });

  res.status(200).json({
    success: true,
    data: reader,
  });
});

/**
 * @desc    Delete UHF reader
 * @route   DELETE /api/v1/uhf-readers/:id
 * @access  Private
 */
exports.deleteUHFReader = asyncHandler(async (req, res, next) => {
  const { companyId, _id: userId, name: userName, role: userRole } = req.user;

  // Find reader to delete
  const reader = await UHFReader.findOne({
    _id: req.params.id,
    companyId,
  });

  if (!reader) {
    return next(
      new ErrorResponse(`UHF reader not found with id ${req.params.id}`, 404)
    );
  }

  // Delete reader
  await reader.remove();

  // Log the action
  await AuditLog.create({
    userId,
    userName,
    userRole,
    action: "Delete",
    module: "UHF Reader",
    description: `Deleted UHF reader: ${reader.name}`,
    details: {
      readerId: reader._id,
      readerName: reader.name,
      uhfId: reader.uhfId,
    },
    companyId,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get UHF reader by UHF ID
 * @route   GET /api/v1/uhf-readers/uhf/:uhfId
 * @access  Private
 */
exports.getUHFReaderByUhfId = asyncHandler(async (req, res, next) => {
  const { companyId } = req.user;

  const reader = await UHFReader.findOne({
    uhfId: req.params.uhfId,
    companyId,
  }).populate([
    { path: "location.warehouseId", select: "name" },
    { path: "location.zoneId", select: "name" },
    { path: "location.shelfId", select: "name" },
    { path: "location.binId", select: "name" },
  ]);

  if (!reader) {
    return next(
      new ErrorResponse(
        `UHF reader not found with UHF ID ${req.params.uhfId}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: reader,
  });
});
