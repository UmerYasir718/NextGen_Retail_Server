const Warehouse = require('../models/warehouse.model');
const Zone = require('../models/zone.model');
const Shelf = require('../models/shelf.model');
const Bin = require('../models/bin.model');

/**
 * Get location details (names) from location IDs
 * @param {Object} location - Location object with IDs
 * @returns {Object} - Location details with names
 */
async function getLocationDetails(location) {
  const details = {
    warehouseName: '',
    zoneName: '',
    shelfName: '',
    binName: ''
  };

  try {
    // Get warehouse name if warehouseId exists
    if (location?.warehouseId) {
      const warehouse = await Warehouse.findById(location.warehouseId);
      if (warehouse) {
        details.warehouseName = warehouse.name;
      }
    }

    // Get zone name if zoneId exists
    if (location?.zoneId) {
      const zone = await Zone.findById(location.zoneId);
      if (zone) {
        details.zoneName = zone.name;
      }
    }

    // Get shelf name if shelfId exists
    if (location?.shelfId) {
      const shelf = await Shelf.findById(location.shelfId);
      if (shelf) {
        details.shelfName = shelf.name;
      }
    }

    // Get bin name if binId exists
    if (location?.binId) {
      const bin = await Bin.findById(location.binId);
      if (bin) {
        details.binName = bin.name;
      }
    }
  } catch (error) {
    console.error('Error getting location details:', error);
  }

  return details;
}

module.exports = {
  getLocationDetails
};
