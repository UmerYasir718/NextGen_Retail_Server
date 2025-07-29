const admin = require("firebase-admin");
const User = require("../models/user.model");

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use service account file first
    const serviceAccount = require("../nextgen-retail-c2f7a-firebase-adminsdk-fbsvc-ee49b4423d.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
    console.log("Firebase Admin SDK initialized with service account file");
  } catch (error) {
    // Fallback to environment variables
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log("Firebase Admin SDK initialized with environment variables");
    } else {
      console.warn(
        "Firebase Admin SDK not initialized - missing configuration"
      );
    }
  }
}

/**
 * Send a push notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {Object} notification - The notification object
 * @param {string} notification.title - The notification title
 * @param {string} notification.body - The notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - The result of the send operation
 */
exports.sendToUser = async (userId, notification, data = {}) => {
  try {
    // Find user's FCM token
    const user = await User.findById(userId).select("fcmToken");

    if (!user || !user.fcmToken) {
      console.log(`No FCM token found for user ${userId}`);
      return { success: false, error: "No FCM token found for user" };
    }

    const message = {
      notification,
      data,
      token: user.fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log(`Successfully sent notification to user ${userId}:`, response);
    return { success: true, response };
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a push notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs to send the notification to
 * @param {Object} notification - The notification object
 * @param {string} notification.title - The notification title
 * @param {string} notification.body - The notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - The result of the send operation
 */
exports.sendToUsers = async (userIds, notification, data = {}) => {
  try {
    // Find users' FCM tokens
    const users = await User.find({ _id: { $in: userIds } }).select(
      "_id fcmToken"
    );

    // Filter out users without FCM tokens
    const tokens = users
      .filter((user) => user.fcmToken)
      .map((user) => user.fcmToken);

    if (tokens.length === 0) {
      console.log("No FCM tokens found for the specified users");
      return { success: false, error: "No FCM tokens found" };
    }

    const message = {
      notification,
      data,
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(
      `Successfully sent notifications to ${response.successCount} users`
    );
    return {
      success: true,
      response,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("Error sending notifications to users:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a push notification to users with specific roles in a company
 * @param {string} companyId - The company ID
 * @param {Array<string>} roles - Array of roles to target (e.g., ['Admin', 'InventoryManager'])
 * @param {Object} notification - The notification object
 * @param {string} notification.title - The notification title
 * @param {string} notification.body - The notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - The result of the send operation
 */
exports.sendToRoles = async (companyId, roles, notification, data = {}) => {
  try {
    // Find users with the specified roles in the company
    const users = await User.find({
      companyId,
      role: { $in: roles },
      fcmToken: { $exists: true, $ne: null },
    }).select("_id fcmToken");

    const tokens = users.map((user) => user.fcmToken);

    if (tokens.length === 0) {
      console.log(
        `No FCM tokens found for roles ${roles.join(
          ", "
        )} in company ${companyId}`
      );
      return { success: false, error: "No FCM tokens found" };
    }

    const message = {
      notification,
      data,
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(
      `Successfully sent notifications to ${
        response.successCount
      } users with roles ${roles.join(", ")}`
    );
    return {
      success: true,
      response,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error(
      `Error sending notifications to roles ${roles.join(", ")}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

/**
 * Send a low stock alert notification
 * @param {Object} item - The inventory item
 * @param {string} companyId - The company ID
 * @returns {Promise<Object>} - The result of the send operation
 */
exports.sendLowStockAlert = async (item, companyId) => {
  const notification = {
    title: "Low Stock Alert",
    body: `Item ${item.name} (SKU: ${item.sku}) is now below threshold. Current quantity: ${item.quantity}, Threshold: ${item.threshold}`,
  };

  const data = {
    type: "low_stock_alert",
    itemId: item._id.toString(),
    itemName: item.name,
    itemSku: item.sku,
    quantity: item.quantity.toString(),
    threshold: item.threshold.toString(),
    timestamp: Date.now().toString(),
  };

  // Send to Admin and InventoryManager roles
  return await exports.sendToRoles(
    companyId,
    ["Admin", "InventoryManager"],
    notification,
    data
  );
};
