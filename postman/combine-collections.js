const fs = require('fs');
const path = require('path');

// Base collection with authentication section
const baseCollection = require('./nextgen-retail-complete-collection.json');

// Read other section files
const inventorySection = require('./nextgen-retail-inventory-section.json');
const shipmentSection = require('./nextgen-retail-shipment-section.json');
const userSection = require('./nextgen-retail-user-section.json');
const dashboardSection = require('./nextgen-retail-dashboard-section.json');

// Add sections to the base collection
baseCollection.item.push(inventorySection);
baseCollection.item.push(shipmentSection);
baseCollection.item.push(userSection);
baseCollection.item.push(dashboardSection);

// Write the combined collection to a new file
fs.writeFileSync(
  path.join(__dirname, 'nextgen-retail-complete-collection-final.json'),
  JSON.stringify(baseCollection, null, 2)
);

console.log('Combined collection created successfully!');
