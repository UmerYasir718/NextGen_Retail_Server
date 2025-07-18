const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up storage for CSV files
const csvStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "csv",
      resource_type: "raw", // important for non-image files like CSV
      public_id: file.originalname.split(".")[0], // optional
      format: file.originalname.split(".").pop(), // to preserve extension
    };
  },
});

// Create multer upload instance for CSV files
const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    // Check if file is a CSV or acceptable format
    console.log("File mimetype:", file?.mimetype);
    console.log("File originalname:", file?.originalname);

    // Accept various CSV-related mimetypes
    const acceptableMimetypes = [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/excel",
      "application/x-csv",
      "text/x-csv",
      "text/comma-separated-values",
      "text/plain",
    ];

    if (
      acceptableMimetypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Only CSV files are allowed. Received: " + file.mimetype),
        false
      );
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = {
  cloudinary,
  csvUpload,
};
