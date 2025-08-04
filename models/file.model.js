const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a file name"],
    trim: true,
  },
  originalName: {
    type: String,
    required: [true, "Original file name is required"],
  },
  fileType: {
    type: String,
    enum: ["sale_forecasting", "purchase_inventory", "other"],
    required: [true, "Please specify file type"],
  },
  fileUrl: {
    type: String,
    required: [true, "File URL is required"],
  },
  responseFileUrl: {
    type: String,
    required: false,
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, "Cloudinary public ID is required"],
  },
  status: {
    type: String,
    enum: [
      "pending",
      "process",
      "processing",
      "confirmation_pending",
      "approved",
      "rejected",
    ],
    default: "pending",
  },
  fileSize: {
    type: Number,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
FileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("File", FileSchema);
