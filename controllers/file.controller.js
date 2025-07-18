const File = require("../models/file.model");
const ErrorResponse = require("../utils/errorResponse");
const { cloudinary } = require("../config/cloudinary");

// @desc    Upload a CSV file
// @route   POST /api/files/upload
// @access  Private
exports.uploadFile = async (req, res, next) => {
  try {
    // Check if file was uploaded successfully
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV file",
        error: "No file uploaded",
      });
    }

    console.log("File upload details:", {
      path: req.file.path,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Get file type from request body
    const { fileType } = req.body;

    if (
      !fileType ||
      !["sale_forecasting", "purchase_inventory", "other"].includes(fileType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid file type",
        error: "Invalid file type",
      });
    }

    // Create file record in database
    const file = await File.create({
      name: req.file.originalname,
      originalName: req.file.originalname,
      fileType,
      fileUrl: req.file.path,
      cloudinaryPublicId:
        req.file.filename || req.file.public_id || `csv_${Date.now()}`,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      companyId: req.user.companyId,
      status: "pending",
      metadata: {
        mimetype: req.file.mimetype,
        uploadDate: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: file,
    });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong!",
      error: err.message,
    });
  }
};

// @desc    Get all files for a company
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res, next) => {
  try {
    console.log(req.query);
    const files = await File.find({
      companyId: req.user.companyId,
      fileType: req.query.fileType,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single file
// @route   GET /api/files/:id
// @access  Private
exports.getFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return next(
        new ErrorResponse(`File not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user belongs to file's company
    if (
      file.companyId.toString() !== req.user.companyId.toString() &&
      req.user.role !== "super_admin"
    ) {
      return next(new ErrorResponse("Not authorized to access this file", 403));
    }

    res.status(200).json({
      success: true,
      data: file,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update file status
// @route   PUT /api/files/:id/status
// @access  Private
exports.updateFileStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (
      !status ||
      !["pending", "process", "processing", "approved", "rejected"].includes(
        status
      )
    ) {
      return next(new ErrorResponse("Please provide a valid status", 400));
    }

    let file = await File.findById(req.params.id);

    if (!file) {
      return next(
        new ErrorResponse(`File not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user belongs to file's company
    if (
      file.companyId.toString() !== req.user.companyId.toString() &&
      req.user.role !== "super_admin"
    ) {
      return next(new ErrorResponse("Not authorized to update this file", 403));
    }

    file.status = status;
    file.updatedAt = Date.now();
    await file.save();

    res.status(200).json({
      success: true,
      data: file,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return next(
        new ErrorResponse(`File not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user belongs to file's company
    if (
      file.companyId.toString() !== req.user.companyId.toString() &&
      req.user.role !== "super_admin"
    ) {
      return next(new ErrorResponse("Not authorized to delete this file", 403));
    }

    // Delete file from Cloudinary
    if (file.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: "raw",
      });
    }

    // Delete file from database
    await file.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
