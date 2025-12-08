/**
 * Wraps async route handlers to catch errors
 * Eliminates need for try-catch blocks in controllers
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

