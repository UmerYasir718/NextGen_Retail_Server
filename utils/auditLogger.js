const AuditLog = require("../models/auditLog.model");

/**
 * Create an audit log entry
 * @param {Object} params - Parameters for audit log
 * @param {string} params.userId - User ID
 * @param {string} params.userName - User name
 * @param {string} params.userRole - User role
 * @param {string} params.action - Action performed (Create, Update, Delete, etc.)
 * @param {string} params.module - Module name (Warehouse, Zone, Shelf, Bin, etc.)
 * @param {string} params.description - Description of the action
 * @param {Object} params.details - Additional details about the action
 * @param {string} params.ipAddress - IP address of the user
 * @param {string} params.companyId - Company ID
 * @returns {Promise<Object>} Created audit log entry
 */
const createAuditLog = async (params) => {
  try {
    const auditLog = await AuditLog.create({
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      module: params.module,
      description: params.description,
      details: params.details || {},
      ipAddress: params.ipAddress,
      companyId: params.companyId,
      timestamp: Date.now(),
    });
    return auditLog;
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

/**
 * Create audit log for entity creation
 * @param {Object} req - Express request object
 * @param {Object} entity - Created entity
 * @param {string} module - Module name
 * @param {string} entityName - Name of the entity
 */
const logEntityCreation = async (req, entity, module, entityName) => {
  await createAuditLog({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action: "Create",
    module: module,
    description: `Created ${entityName} "${entity.name}"`,
    details: {
      entityId: entity._id,
      entityName: entity.name,
      entityData: entity,
      createdBy: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        timestamp: Date.now(),
      },
    },
    ipAddress: req.ip,
    companyId: req.user.companyId,
  });
};

/**
 * Create audit log for entity update
 * @param {Object} req - Express request object
 * @param {Object} originalEntity - Original entity before update
 * @param {Object} updatedEntity - Updated entity
 * @param {string} module - Module name
 * @param {string} entityName - Name of the entity
 */
const logEntityUpdate = async (
  req,
  originalEntity,
  updatedEntity,
  module,
  entityName
) => {
  // Identify changed fields
  const changes = {};
  const originalObj = originalEntity.toObject();
  const updatedObj = updatedEntity.toObject();

  Object.keys(updatedObj).forEach((key) => {
    if (JSON.stringify(originalObj[key]) !== JSON.stringify(updatedObj[key])) {
      changes[key] = {
        from: originalObj[key],
        to: updatedObj[key],
      };
    }
  });

  await createAuditLog({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action: "Update",
    module: module,
    description: `Updated ${entityName} "${updatedEntity.name}"`,
    details: {
      entityId: updatedEntity._id,
      entityName: updatedEntity.name,
      changes: changes,
      updatedBy: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        timestamp: Date.now(),
      },
    },
    ipAddress: req.ip,
    companyId: req.user.companyId,
  });
};

/**
 * Create audit log for entity deletion
 * @param {Object} req - Express request object
 * @param {Object} entity - Deleted entity
 * @param {string} module - Module name
 * @param {string} entityName - Name of the entity
 */
const logEntityDeletion = async (req, entity, module, entityName) => {
  await createAuditLog({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action: "Delete",
    module: module,
    description: `Deleted ${entityName} "${entity.name}"`,
    details: {
      entityId: entity._id,
      entityName: entity.name,
      entityData: entity,
      deletedBy: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        timestamp: Date.now(),
      },
    },
    ipAddress: req.ip,
    companyId: req.user.companyId,
  });
};

module.exports = {
  createAuditLog,
  logEntityCreation,
  logEntityUpdate,
  logEntityDeletion,
};
