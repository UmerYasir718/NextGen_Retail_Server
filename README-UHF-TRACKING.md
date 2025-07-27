# UHF Inventory Tracking System

## Overview

The UHF Inventory Tracking System is a comprehensive solution for real-time inventory management using UHF RFID readers. The system tracks item status, location, and quantity in real-time, logs all movements in an audit system, and sends low stock alerts via WebSocket and Firebase notifications to authorized roles on both dashboard and app platforms.

## Features

- **Real-time Inventory Tracking**: UHF readers detect RFID tags and update inventory status, location, and quantity in real-time
- **Location Hierarchy**: Support for Warehouse > Zone > Shelf > Bin location hierarchy
- **Low Stock Alerts**: Automatic alerts when inventory falls below threshold
- **Multi-platform Notifications**: WebSocket for web dashboard and Firebase push notifications for mobile app
- **Role-based Access**: Alerts are sent only to Admin and InventoryManager roles
- **Audit Logging**: Comprehensive audit trail for all inventory changes
- **Duplicate Alert Suppression**: Alerts are sent only once per low stock event until restock

## System Architecture

### Data Models

- **UHFReader**: Represents UHF readers with fields for uhfId, name, status, and location
- **Inventory**: Represents inventory items with fields for tagId, quantity, threshold, status, and location
- **Warehouse, Zone, Shelf, Bin**: Represent the location hierarchy
- **AuditLog**: Records all changes to inventory with before/after states
- **Notification**: Stores notifications for users with role-based filtering
- **ItemMovement**: Tracks inventory movements with source, destination, and reason

### API Endpoints

#### UHF Reader Management

- `GET /api/uhf-readers`: Get all UHF readers
- `GET /api/uhf-readers/:id`: Get a specific UHF reader
- `GET /api/uhf-readers/uhf/:uhfId`: Get a UHF reader by its UHF ID
- `POST /api/uhf-readers`: Create a new UHF reader
- `PUT /api/uhf-readers/:id`: Update a UHF reader
- `DELETE /api/uhf-readers/:id`: Delete a UHF reader

#### UHF Tag Detection

- `POST /api/uhf-tags/detect`: Process a UHF tag detection event

#### Notifications (Web Dashboard)

- `GET /api/notifications`: Get all notifications
- `GET /api/notifications/unread/count`: Get count of unread notifications
- `GET /api/notifications?type=Stock`: Get all low stock alerts
- `PUT /api/notifications/:id/read`: Mark a notification as read
- `PUT /api/notifications/read-all`: Mark all notifications as read

#### Device Registration (Mobile App)

- `POST /api/users/fcm-token`: Register FCM token for push notifications
- `PUT /api/users/fcm-token`: Update FCM token
- `DELETE /api/users/fcm-token`: Delete FCM token

#### Notifications (Mobile App)

- `GET /api/notifications/mobile`: Get all notifications optimized for mobile
- `GET /api/notifications/mobile/unread/count`: Get count of unread notifications
- `GET /api/notifications/mobile?type=Stock`: Get all low stock alerts for mobile
- `PUT /api/notifications/mobile/:id/read`: Mark a notification as read
- `POST /api/notifications/mobile/sync`: Sync notifications between server and mobile app
- `POST /api/notifications/mobile/test-push`: Send a test push notification

### Real-time Communication

#### WebSocket Namespaces

- `/uhf`: For UHF reader events
- `/notifications`: For real-time notifications

#### WebSocket Events

- `tag-read`: Emitted when a UHF reader detects a tag
- `new_notification`: Emitted when a new notification is created
- `unread_count`: Emitted with the count of unread notifications
- `recent_notifications`: Emitted with recent unread notifications

### Firebase Push Notifications

The system uses Firebase Cloud Messaging (FCM) to send push notifications to mobile devices. The following notification types are supported:

- **Low Stock Alerts**: Sent when inventory falls below threshold
- **Status Change Alerts**: Sent when inventory status changes (e.g., from sale_pending to purchased)
- **Location Change Alerts**: Sent when inventory location changes

## Sample Flow

1. **UHF Reader Registration**:
   - Admin registers a UHF reader with ID "UHF-001" at Warehouse A, Zone 1, Shelf 2, Bin 3
   - Reader is set to "Active" status

2. **Inventory Item Setup**:
   - Inventory item "Product X" with SKU "SKU123" is registered in the system
   - Item is assigned RFID tag ID "TAG-001"
   - Initial quantity is set to 10 units
   - Low stock threshold is set to 5 units
   - Item is initially located in Warehouse B

3. **Tag Detection Flow**:
   - UHF reader "UHF-001" detects tag "TAG-001"
   - Reader sends detection event to backend API
   - System validates UHF reader exists and is active
   - System updates reader's `lastSeen` timestamp
   - System finds inventory item with matching tag ID
   - System updates item location to match UHF reader's location (Warehouse A, Zone 1, Shelf 2, Bin 3)
   - System decreases item quantity by 1 (from 10 to 9)
   - System creates an item movement record with type "Out"
   - System creates an audit log entry recording the change

4. **Low Stock Alert Triggered**:
   - When quantity reaches 5 (equal to threshold), the system triggers a low stock alert
   - System marks item with `lowStockAlertSent = true` to prevent duplicate alerts
   - System creates a notification in the database
   - System identifies all users with roles "Admin" or "InventoryManager" in the company
   - System sends real-time WebSocket notification to online users
   - System sends Firebase push notification to offline users' mobile devices

5. **Alert Suppression**:
   - Further detections continue to decrease quantity but no additional alerts are sent
   - When quantity reaches 0, item status is updated to "Out of Stock"

6. **Restocking Flow**:
   - Staff restocks the item, increasing quantity to 15
   - System detects quantity is now above threshold
   - System resets `lowStockAlertSent = false`
   - Future low stock conditions will trigger new alerts

## Setup Instructions

### Environment Variables

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/nextgen_retail
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_DATABASE_URL=your_firebase_database_url
```

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start the server: `npm start`

### Testing

Use the provided Postman collections to test the API endpoints:

- `UHF_Tracking_System.postman_collection.json`: General UHF tracking system endpoints
- `Web_Dashboard_Alerts.postman_collection.json`: Web dashboard alert endpoints
- `Mobile_App_Alerts.postman_collection.json`: Mobile app alert endpoints

## Security Considerations

- All API endpoints are protected with JWT authentication
- Role-based authorization ensures only authorized users can access specific endpoints
- WebSocket connections require JWT authentication
- Notifications are filtered by company and role to ensure data privacy
- Firebase push notifications are sent only to registered devices of authorized users
