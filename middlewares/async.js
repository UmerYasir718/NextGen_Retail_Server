/**
 * Async handler middleware to eliminate try-catch blocks in async controller functions
 * Wraps async functions to automatically catch errors and pass them to the error handler
 * @param {Function} fn - The async controller function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
