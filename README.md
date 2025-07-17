# Windsurf Warehouse Inventory Management System Backend

A comprehensive backend system for warehouse inventory management with RFID integration, built with Node.js, Express, and MongoDB.

## Overview

The Windsurf backend provides a complete API for managing warehouse inventory, including user authentication, company and plan management, warehouse structure modeling, inventory tracking, RFID event processing, shipment management, and more.

## Core Modules

1. **Authentication** - JWT-based authentication with role-based access control
2. **Company/Plan Management** - Multi-tenant system with subscription plans via Stripe
3. **Warehouse Management** - Hierarchical warehouse structure (Warehouse > Zone > Shelf > Bin)
4. **Inventory Management** - Complete inventory tracking with CSV bulk upload support
5. **RFID Integration** - Real-time WebSocket integration with UHF/RFID readers
6. **Stock Tracking** - Automated inventory updates and movement tracking
7. **Audit Logs** - Comprehensive activity logging for security and compliance
8. **Shipments** - Incoming and outgoing shipment management
9. **Notifications** - Real-time system notifications
10. **Analytics** - Reporting and analytics (under development)
11. **AI Forecasting** - Inventory forecasting with AI (under development)

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - WebSocket implementation for real-time RFID events
- **JWT** - Authentication tokens
- **Cloudinary** - File storage for inventory CSV uploads
- **Stripe** - Payment processing for subscription plans
- **Nodemailer** - Email notifications

## Project Structure

The project follows an MVC (Model-View-Controller) architecture:

```
/Server
├── controllers/       # Business logic
├── middlewares/       # Custom middleware functions
├── models/            # MongoDB schema definitions
├── routes/            # API route definitions
├── sockets/           # WebSocket handlers
├── utils/             # Utility functions
├── app.js             # Main application file
├── server.js          # Server entry point
└── .env               # Environment variables (not in repo)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user ✅
- `POST /api/auth/login` - Login and get JWT token ✅
- `GET /api/auth/me` - Get current user ✅
- `POST /api/auth/forgot-password` - Request password reset ✅
- `PUT /api/auth/reset-password` - Reset password with token ✅

### Users
- `GET /api/users` - Get all users   ✅
- `GET /api/users/:id` - Get single user ✅
- `POST /api/users` - Create user ✅
- `PUT /api/users/:id` - Update user ✅
- `DELETE /api/users/:id` - Delete user ✅

### Companies
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get single company
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `GET /api/companies/:id/dashboard` - Get company dashboard stats

### Plans
- `GET /api/plans` - Get all plans
- `GET /api/plans/:id` - Get single plan
- `POST /api/plans` - Create plan
- `PUT /api/plans/:id` - Update plan
- `DELETE /api/plans/:id` - Delete plan
- `POST /api/plans/checkout/:id` - Create checkout session for plan
- `POST /api/plans/webhook` - Stripe webhook handler

### Warehouses
- `GET /api/warehouses` - Get all warehouses
- `GET /api/warehouses/:id` - Get single warehouse
- `POST /api/warehouses` - Create warehouse
- `PUT /api/warehouses/:id` - Update warehouse
- `DELETE /api/warehouses/:id` - Delete warehouse
- `GET /api/warehouses/:id/zones` - Get zones in warehouse

### Zones
- `GET /api/warehouses/:warehouseId/zones` - Get all zones in warehouse
- `GET /api/warehouses/:warehouseId/zones/:id` - Get single zone
- `POST /api/warehouses/:warehouseId/zones` - Create zone
- `PUT /api/warehouses/:warehouseId/zones/:id` - Update zone
- `DELETE /api/warehouses/:warehouseId/zones/:id` - Delete zone

### Shelves
- `GET /api/shelves` - Get all shelves
- `GET /api/shelves/:id` - Get single shelf
- `POST /api/shelves` - Create shelf
- `PUT /api/shelves/:id` - Update shelf
- `DELETE /api/shelves/:id` - Delete shelf
- `GET /api/shelves/:id/utilization` - Get shelf utilization

### Bins
- `GET /api/bins` - Get all bins
- `GET /api/bins/:id` - Get single bin
- `POST /api/bins` - Create bin
- `PUT /api/bins/:id` - Update bin
- `DELETE /api/bins/:id` - Delete bin
- `GET /api/bins/:id/inventory` - Get inventory in bin
- `PUT /api/bins/:id/capacity` - Update bin capacity

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get single inventory item
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `POST /api/inventory/upload` - Upload inventory CSV
- `GET /api/inventory/uploads` - Get all inventory uploads
- `GET /api/inventory/uploads/:id` - Get single inventory upload
- `PUT /api/inventory/uploads/:id/approve` - Approve inventory upload
- `DELETE /api/inventory/uploads/:id` - Delete inventory upload

### Inventory Status APIs
- `GET /api/inventory/status/purchase` - Get inventory items with purchase status
- `GET /api/inventory/status/sale-pending` - Get inventory items with sale_pending status
- `GET /api/inventory/status/sale` - Get inventory items with sale status
- `PUT /api/inventory/:id/status` - Update inventory status (purchase, sale_pending, sale)

### Shipments
- `GET /api/shipments` - Get all shipments
- `GET /api/shipments/:id` - Get single shipment
- `POST /api/shipments` - Create shipment
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment
- `PUT /api/shipments/:id/document` - Upload shipment document
- `GET /api/shipments/stats` - Get shipment statistics

### Audit Logs
- `GET /api/audit-logs` - Get all audit logs
- `GET /api/audit-logs/:id` - Get single audit log
- `POST /api/audit-logs` - Create audit log
- `GET /api/audit-logs/stats` - Get audit log statistics
- `DELETE /api/audit-logs/cleanup` - Delete old audit logs

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/all` - Get all notifications (admin)
- `GET /api/notifications/:id` - Get single notification
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/unread-count` - Get unread notification count

## WebSocket Events

### UHF/RFID Events
- `connect` - Connect to UHF namespace with JWT authentication
- `tag_read` - RFID tag read event
- `item_moved` - Item movement event
- `stock_alert` - Low stock alert event

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/windsurf

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password

# SuperAdmin
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=your_secure_password
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with required variables
4. Run the server: `npm start`
5. For development: `npm run dev`

## Authentication and Authorization

The system uses JWT tokens for authentication and implements role-based access control (RBAC) with the following roles:

- **SuperAdmin** - System-wide administrator
- **Admin** - Company administrator
- **Manager** - Warehouse manager
- **Staff** - Regular staff
- **Auditor** - Read-only access for auditing

## Security Features

- Password hashing with bcrypt
- JWT token verification
- Company scoping for data isolation
- Role-based access control
- Input validation
- Error handling middleware
- File upload restrictions

## License

This project is proprietary and confidential. All rights reserved.
