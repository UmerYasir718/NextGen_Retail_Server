const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file to Cloudinary
 * @param {String} filePath - Path to the file to upload
 * @param {String} folder - Folder in Cloudinary to upload to
 * @returns {Promise} - Cloudinary upload result
 */
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto'
    });
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Error uploading file to cloud storage');
  }
};

/**
 * Delete a file from Cloudinary
 * @param {String} publicId - Public ID of the file to delete
 * @returns {Promise} - Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new Error('Error deleting file from cloud storage');
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary
};
