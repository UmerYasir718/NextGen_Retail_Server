# Windsurf Warehouse Inventory Management System - API Testing Instructions

This document provides instructions for testing the Windsurf Warehouse Inventory Management System backend API using the Postman collections provided.

## Prerequisites

1. Node.js and npm installed
2. MongoDB running locally or accessible via connection string
3. Postman application installed
4. Environment variables properly configured in `.env` file

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables in `.env` file
4. Start the server:
   ```
   npm start
   ```

## Postman Collection Setup

1. Open Postman
2. Import the collections from the `postman` directory:
   - `windsurf-api-collection.json` (Main collection with authentication)
   - `user-collection.json`
   - `company-collection.json`
   - `plan-collection.json`
   - `warehouse-collection.json`
   - `shelf-bin-collection.json`
   - `inventory-collection.json`
   - `auditlog-collection.json`
   - `notification-collection.json`
   - `shipment-collection.json`

3. Create a new environment in Postman:
   - Click on "Environments" in the sidebar
   - Click "Add" to create a new environment
   - Name it "Windsurf Local"
   - Add the following variables:
     - `baseUrl`: `http://localhost:5000` (or your server URL)
     - `token`: Leave this empty for now

## Testing Flow

The system supports multiple user roles with different permissions. Below are separate testing flows for each role.

### SuperAdmin Flow

1. **Initial Setup**
   - The SuperAdmin is automatically created on first startup based on your `.env` SUPER_ADMIN variables
   - Use the `Login` request with these credentials:
     ```json
     {
       "email": "your-super-admin-email-from-env",
       "password": "your-super-admin-password-from-env"
     }
     ```
   - Copy the token from the response and set the `token` variable in your Postman environment

2. **SuperAdmin Tasks**
   - Create subscription plans using the `Create Plan` request
   - View system-wide statistics and logs
   - Access and modify any data across all companies
   - Manage all companies and users

### Admin Flow

1. **Admin Registration**
   - Use the `Register with Company` request to create an admin account and company simultaneously
   - Example payload:
     ```json
     {
       "user": {
         "name": "Admin User",
         "email": "admin@example.com",
         "password": "securepassword",
         "role": "Admin",
         "phone": "123-456-7890"
       },
       "company": {
         "name": "Acme Corporation",
         "email": "info@acme.com",
         "phone": "123-456-7890",
         "address": {
           "street": "123 Main St",
           "city": "Anytown",
           "state": "CA",
           "zipCode": "12345",
           "country": "USA"
         },
         "website": "https://acme.com",
         "industry": "Manufacturing",
         "planId": "your-plan-id-here"
       }
     }
     ```

2. **Admin Login**
   - Use the `Login` request with admin credentials
   - Copy the token from the response and set the `token` variable

3. **Admin Tasks**
   - Create users for your company using the `Create User` request
   - Set up warehouses, zones, shelves, and bins
   - Configure inventory settings
   - View company-wide reports and analytics
   - Manage shipments and inventory

### Manager Flow

1. **Manager Login**
   - Use the `Login` request with manager credentials
   - Copy the token from the response and set the `token` variable

2. **Manager Tasks**
   - Manage inventory and stock levels
   - Process incoming and outgoing shipments
   - Generate reports on warehouse operations
   - Assign tasks to staff members
   - View audit logs for operations

### Staff Flow

1. **Staff Login**
   - Use the `Login` request with staff credentials
   - Copy the token from the response and set the `token` variable

2. **Staff Tasks**
   - Record inventory movements
   - Process shipments
   - Update bin contents
   - Scan RFID tags
   - Report issues via the notification system

### Auditor Flow

1. **Auditor Login**
   - Use the `Login` request with auditor credentials
   - Copy the token from the response and set the `token` variable

2. **Auditor Tasks**
   - View audit logs
   - Generate compliance reports
   - Verify inventory counts
   - Track item movements

## Step-by-Step Testing Guide

### 1. System Setup

1. **SuperAdmin Login** (System Administration)
   - Use the `Login` request with SuperAdmin credentials (from .env file)
   - Save the token
   - SuperAdmin is automatically created on first startup

2. **Create Plans** (SuperAdmin)
   - Use the `Create Plan` request to create subscription plans
   - Example payload:
     ```json
     {
       "name": "Enterprise Plan",
       "description": "For large enterprises with multiple warehouses",
       "price": 499.99,
       "billingCycle": "monthly",
       "features": ["Unlimited warehouses", "Unlimited users"],
       "limits": {
         "warehouseCount": -1,
         "userCount": -1,
         "inventoryCount": -1
       },
       "stripePriceId": "price_1234567890",
       "isActive": true
     }
     ```
   - Note the plan ID from the response

3. **Register Admin with Company** (New Company Registration)
   - Use the `Register with Company` request
   - Include the plan ID from the previous step
   - Example payload:
     ```json
     {
       "user": {
         "name": "Admin User",
         "email": "admin@acme.com",
         "password": "securepassword",
         "role": "Admin",
         "phone": "123-456-7890"
       },
       "company": {
         "name": "Acme Corporation",
         "email": "info@acme.com",
         "phone": "123-456-7890",
         "address": {
           "street": "123 Main St",
           "city": "Anytown",
           "state": "CA",
           "zipCode": "12345",
           "country": "USA"
         },
         "website": "https://acme.com",
         "industry": "Manufacturing",
         "planId": "your-plan-id-here"
       }
     }
     ```
   - This creates both the admin user and company in one step
   - Note the company ID and user ID from the response

4. **Admin Login**
   - Use the `Login` request with the admin credentials you just created
   - Save the token for subsequent requests

### 2. Warehouse Setup (Admin)

1. **Login as Company Admin**
   - Use the `Login` request with the admin credentials created earlier
   - Save the token

2. **Create Warehouse**
   - Use the `Create Warehouse` request
   - Example payload:
     ```json
     {
       "name": "Main Warehouse",
       "description": "Primary storage facility",
       "location": {
         "address": "123 Storage Blvd",
         "city": "Warehouse City",
         "state": "WH",
         "zipCode": "12345",
         "country": "USA"
       },
       "contactInfo": {
         "name": "John Manager",
         "email": "manager@example.com",
         "phone": "123-456-7890"
       },
       "capacity": 10000,
       "isActive": true
     }
     ```
   - Note the warehouse ID from the response

3. **Create Zones**
   - Use the `Create Zone in Warehouse` request
   - Include the warehouse ID
   - Example payload:
     ```json
     {
       "name": "Receiving Zone",
       "description": "Area for receiving shipments",
       "category": "Receiving",
       "isActive": true
     }
     ```
   - Note the zone ID from the response

4. **Create Shelves**
   - Use the `Create Shelf` request
   - Include warehouse and zone IDs
   - Example payload:
     ```json
     {
       "name": "Shelf A1",
       "description": "Storage shelf for small items",
       "zoneId": "your-zone-id-here",
       "warehouseId": "your-warehouse-id-here",
       "position": {
         "row": "A",
         "column": "1",
         "level": "1"
       },
       "dimensions": {
         "width": 100,
         "height": 200,
         "depth": 50,
         "unit": "cm"
       },
       "capacity": 50,
       "isActive": true
     }
     ```
   - Note the shelf ID from the response

5. **Create Bins**
   - Use the `Create Bin in Shelf` request
   - Include the shelf ID
   - Example payload:
     ```json
     {
       "name": "Bin A1-1",
       "description": "Storage bin for small electronics",
       "position": {
         "row": "1",
         "column": "1"
       },
       "dimensions": {
         "width": 30,
         "height": 20,
         "depth": 40,
         "unit": "cm"
       },
       "capacity": 10,
       "isActive": true
     }
     ```
   - Note the bin ID from the response

6. **Create Staff Users**
   - Use the `Create User` request to add staff members
   - Example payload for manager:
     ```json
     {
       "name": "Jane Manager",
       "email": "jane@acme.com",
       "password": "password123",
       "role": "Manager",
       "phone": "123-456-7890",
       "isActive": true
     }
     ```
   - Example payload for staff:
     ```json
     {
       "name": "Staff Member",
       "email": "staff@acme.com",
       "password": "password123",
       "role": "Staff",
       "phone": "123-456-7890",
       "isActive": true
     }
     ```

### 3. Inventory Management (Manager)

1. **Login as Manager**
   - Use the `Login` request with manager credentials
   - Save the token

2. **Create Inventory Items**
   - Use the `Create Inventory Item` request
   - Include bin, shelf, zone, and warehouse IDs
   - Example payload:
     ```json
     {
       "name": "Wireless Headphones",
       "description": "Noise-cancelling wireless headphones",
       "sku": "WH-001",
       "barcode": "1234567890123",
       "rfidTag": "RFID-WH001",
       "category": "Electronics",
       "subcategory": "Audio",
       "quantity": 10,
       "price": 99.99,
       "cost": 59.99,
       "binId": "your-bin-id-here",
       "warehouseId": "your-warehouse-id-here",
       "zoneId": "your-zone-id-here",
       "shelfId": "your-shelf-id-here",
       "minStockLevel": 5,
       "maxStockLevel": 50,
       "status": "available"
     }
     ```

3. **Upload Inventory CSV** (optional)
   - Use the `Upload Inventory CSV` request with a properly formatted CSV file
   - Check upload status with the `Get Pending Inventory Uploads` request
   - Approve the upload with the `Approve Inventory Upload` request

4. **Manage Inventory**
   - Update quantity: Use the `Update Inventory Quantity` request
   - Move items: Use the `Move Inventory Item` request
   - Check low stock: Use the `Get Low Stock Items` request

### 4. Shipment Processing (Staff)

1. **Login as Staff**
   - Use the `Login` request with staff credentials
   - Save the token

2. **Process Incoming Shipment**
   - Create shipment: Use the `Create Incoming Shipment` request
   - Example payload:
     ```json
     {
       "type": "incoming",
       "referenceNumber": "PO-12345",
       "sourceType": "supplier",
       "source": {
         "name": "ABC Suppliers",
         "contactInfo": {
           "email": "orders@abcsuppliers.com",
           "phone": "123-456-7890"
         }
       },
       "destinationWarehouseId": "your-warehouse-id-here",
       "expectedArrivalDate": "2023-06-15T14:00:00.000Z",
       "items": [
         {
           "inventoryId": "your-inventory-id-here",
           "quantity": 10,
           "cost": 59.99,
           "notes": "Regular order"
         }
       ],
       "status": "pending"
     }
     ```
   - Update status: Use the `Update Shipment Status` request to change status through the workflow:
     - "pending" → "in_transit" → "delivered" → "completed"

3. **Process Outgoing Shipment**
   - Create shipment: Use the `Create Outgoing Shipment` request
   - Update status through the workflow
   - Verify inventory quantities are updated

### 5. Monitoring and Reporting (Admin/Auditor)

1. **Login as Admin or Auditor**
   - Use the `Login` request with appropriate credentials
   - Save the token

2. **Check Audit Logs**
   - Use the `Get All Audit Logs` request
   - Filter by different parameters (action, entity type, date range)

3. **Review Notifications**
   - Use the `Get User Notifications` request
   - Mark notifications as read with the `Mark Notification as Read` request

4. **Generate Reports**
   - Get inventory statistics: Use the `Get Inventory Statistics` request
   - Get shipment statistics: Use the `Get Shipment Statistics` request
   - Get audit log statistics: Use the `Get Audit Log Statistics` request

## Advanced Testing

### WebSocket Testing

For testing real-time RFID events:

1. Use a WebSocket client to connect to `ws://localhost:5000/rfid`
2. Include the authorization token in the connection request
3. Send test RFID events in the following format:
   ```json
   {
     "eventType": "tag_read",
     "rfidTag": "RFID-WH001",
     "readerId": "reader-001",
     "location": {
       "warehouseId": "your-warehouse-id",
       "zoneId": "your-zone-id"
     },
     "timestamp": "2023-06-15T14:00:00.000Z"
   }
   ```

### Performance Testing

For testing API performance:

1. Use Postman's Collection Runner to execute multiple requests
2. Configure different iteration counts and delays
3. Export the results for analysis

## Troubleshooting

If you encounter issues:

1. Check server logs for error messages
2. Verify environment variables are correctly set
3. Ensure MongoDB is running and accessible
4. Confirm authentication token is valid and not expired
5. Check request payloads match the expected schema

## Security Testing

1. Test authentication by attempting to access protected endpoints without a token
2. Test authorization by attempting to access resources with insufficient permissions
3. Verify company scoping by attempting to access data from other companies

## Next Steps

After successful testing, you can:

1. Integrate with frontend applications
2. Set up automated testing with Newman (Postman's CLI)
3. Deploy to production environment
4. Configure monitoring and alerts
