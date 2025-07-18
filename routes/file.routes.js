const express = require("express");
const {
  uploadFile,
  getFiles,
  getFile,
  updateFileStatus,
  deleteFile,
} = require("../controllers/file.controller");
const { protect } = require("../middlewares/auth.middleware");
const { csvUpload } = require("../config/cloudinary");

const router = express.Router();

// Protect all routes
router.use(protect);

// File routes
router.post("/upload", csvUpload.single("file"), uploadFile);
router.get("/", getFiles);
router.get("/:id", getFile);
router.put("/:id/status", updateFileStatus);
router.delete("/:id", deleteFile);

module.exports = router;
