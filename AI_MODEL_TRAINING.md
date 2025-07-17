# Inventory Fields for AI Model Training

This document provides a comprehensive list of all inventory fields available for AI model training in the Windsurf Warehouse Inventory Management System.

## Inventory Schema

The following fields are available in the inventory schema and can be used for AI model training:

### Basic Information
- `name` (String): Name of the inventory item
- `sku` (String): Stock Keeping Unit, unique identifier for the item
- `tagId` (String): RFID/UHF tag identifier
- `description` (String): Description of the item
- `category` (String): Category of the item

### Quantity and Status
- `quantity` (Number): Current quantity in stock
- `threshold` (Number): Reorder threshold/low stock level
- `status` (String): Item availability status - Available, Low Stock, Out of Stock, Discontinued
- `inventoryStatus` (String): Inventory lifecycle status - purchase, sale_pending, sale

### Location
- `location.warehouseId` (ObjectId): Reference to warehouse
- `location.zoneId` (ObjectId): Reference to zone within warehouse
- `location.shelfId` (ObjectId): Reference to shelf within zone
- `location.binId` (ObjectId): Reference to bin within shelf

### Price Information
- `price.cost` (Number): Cost price of the item
- `price.retail` (Number): Retail price of the item

### Media
- `images` (Array of Strings): URLs to item images

### Supplier Information
- `supplier.name` (String): Supplier name
- `supplier.contactInfo` (String): Supplier contact information

### Metadata
- `companyId` (ObjectId): Reference to company that owns the item
- `isActive` (Boolean): Whether the item is active
- `createdBy` (ObjectId): Reference to user who created the item
- `updatedBy` (ObjectId): Reference to user who last updated the item
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last update timestamp

## Inventory Status Transitions

The inventory status transitions follow this pattern:

1. **purchase**: Initial status when items are added to inventory after shipment
2. **sale_pending**: Status when item is timed out from UFH/RFID detection
   - Returns to **purchase** if detected again
   - Moves to **sale** if sale is approved
3. **sale**: Final status when sale is completed

## Recommended Features for AI Models

When building AI models for inventory management, consider the following features:

### For Demand Forecasting
- Historical quantity changes
- Category
- Price points
- Seasonal patterns (derived from timestamps)
- Status transition frequency

### For Inventory Optimization
- Time spent in each inventory status
- Correlation between price and status transitions
- Location data and movement patterns
- Threshold effectiveness (how often items reach "Low Stock")

### For Anomaly Detection
- Unusual status transitions
- Unexpected location changes
- Price fluctuations
- Quantity discrepancies

## Data Preprocessing Recommendations

1. **Normalization**: Normalize numerical fields like price and quantity
2. **Encoding**: Use one-hot encoding for categorical fields like status and category
3. **Timestamps**: Convert timestamps to cyclical features (day of week, month, etc.)
4. **Missing Values**: Handle missing values appropriately based on field type
5. **Feature Engineering**: Create derived features like days_in_inventory, price_change_rate, etc.

## API Endpoints for Data Collection

The following API endpoints can be used to collect data for AI model training:

- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/status/purchase` - Get inventory items with purchase status
- `GET /api/inventory/status/sale-pending` - Get inventory items with sale_pending status
- `GET /api/inventory/status/sale` - Get inventory items with sale status

## Example Data Format

```json
{
  "name": "Wireless Headphones",
  "sku": "WH-001",
  "tagId": "RF-12345",
  "description": "Premium wireless headphones with noise cancellation",
  "category": "Electronics",
  "quantity": 15,
  "threshold": 5,
  "status": "Available",
  "inventoryStatus": "purchase",
  "location": {
    "warehouseId": "60a1b2c3d4e5f6g7h8i9j0",
    "zoneId": "60a1b2c3d4e5f6g7h8i9j1",
    "shelfId": "60a1b2c3d4e5f6g7h8i9j2",
    "binId": "60a1b2c3d4e5f6g7h8i9j3"
  },
  "price": {
    "cost": 75.00,
    "retail": 129.99
  },
  "images": [
    "https://example.com/images/headphones1.jpg",
    "https://example.com/images/headphones2.jpg"
  ],
  "supplier": {
    "name": "AudioTech Inc.",
    "contactInfo": "supplier@audiotech.com"
  },
  "companyId": "60a1b2c3d4e5f6g7h8i9j4",
  "isActive": true,
  "createdAt": "2023-01-15T08:30:00.000Z",
  "updatedAt": "2023-01-20T14:45:00.000Z"
}
```
