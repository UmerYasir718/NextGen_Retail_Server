const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

/**
 * Socket handler for real-time notifications
 * @param {Object} io - Socket.io instance
 */
module.exports = function(io) {
  // Create a namespace for notifications
  const notificationNamespace = io.of('/notifications');

  // Authentication middleware for socket connections
  notificationNamespace.use(async (socket, next) => {
    try {
      // Get token from handshake auth
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  // Handle connections
  notificationNamespace.on('connection', async (socket) => {
    const userId = socket.user.id;
    const companyId = socket.user.companyId;
    const userRole = socket.user.role;
    
    console.log(`User connected to notification socket: ${userId} (${socket.user.name})`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join company-specific room
    socket.join(`company:${companyId}`);
    
    // Join role-specific room within company
    socket.join(`company:${companyId}:role:${userRole}`);
    
    // Send unread notifications count on connection
    try {
      const unreadCount = await Notification.countDocuments({
        'recipients.userId': userId,
        'recipients.read': false
      });
      
      socket.emit('unread_count', { count: unreadCount });
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    }
    
    // Handle client subscribing to notifications
    socket.on('subscribe_notifications', async () => {
      try {
        // Get recent unread notifications
        const notifications = await Notification.find({
          'recipients.userId': userId,
          'recipients.read': false
        })
        .sort({ createdAt: -1 })
        .limit(10);
        
        socket.emit('recent_notifications', { notifications });
      } catch (error) {
        console.error('Error fetching recent notifications:', error);
      }
    });
    
    // Handle marking notification as read
    socket.on('mark_read', async (data) => {
      try {
        const { notificationId } = data;
        
        await Notification.findOneAndUpdate(
          { 
            _id: notificationId,
            'recipients.userId': userId
          },
          {
            $set: { 'recipients.$.read': true }
          }
        );
        
        // Get updated unread count
        const unreadCount = await Notification.countDocuments({
          'recipients.userId': userId,
          'recipients.read': false
        });
        
        socket.emit('unread_count', { count: unreadCount });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected from notification socket: ${userId}`);
    });
  });

  /**
   * Send a notification to specific users
   * @param {Array} userIds - Array of user IDs to notify
   * @param {Object} notification - Notification object
   */
  function sendToUsers(userIds, notification) {
    userIds.forEach(userId => {
      notificationNamespace.to(`user:${userId}`).emit('new_notification', notification);
    });
  }

  /**
   * Send a notification to users with specific roles in a company
   * @param {String} companyId - Company ID
   * @param {Array} roles - Array of roles to notify
   * @param {Object} notification - Notification object
   */
  function sendToRoles(companyId, roles, notification) {
    roles.forEach(role => {
      notificationNamespace.to(`company:${companyId}:role:${role}`).emit('new_notification', notification);
    });
  }

  /**
   * Send a low stock alert notification
   * @param {Object} item - Inventory item
   * @param {String} companyId - Company ID
   */
  function sendLowStockAlert(item, companyId) {
    const notification = {
      id: item._id,
      title: 'Low Stock Alert',
      message: `Item ${item.name} (SKU: ${item.sku}) is now below threshold. Current quantity: ${item.quantity}, Threshold: ${item.threshold}`,
      type: 'Stock',
      priority: item.quantity === 0 ? 'High' : 'Medium',
      timestamp: new Date(),
      itemId: item._id,
      itemName: item.name,
      itemSku: item.sku,
      quantity: item.quantity,
      threshold: item.threshold
    };
    
    // Send to Admin and InventoryManager roles
    sendToRoles(companyId, ['Admin', 'InventoryManager'], notification);
  }

  // Return public methods
  return {
    sendToUsers,
    sendToRoles,
    sendLowStockAlert
  };
};
