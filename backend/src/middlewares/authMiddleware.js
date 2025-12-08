import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../libs/env.js";
import { asyncHandler } from "./asyncHandler.js";
import { enrichUserWithAdminStatus } from "../utils/adminUtils.js";
import { getClientIp } from "../utils/auditLogger.js";

/**
 * Optional authentication middleware - attaches user if token is present, but doesn't require it
 * Useful for routes that work for both authenticated and unauthenticated users
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        // No token - continue without user (for public routes)
        return next();
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

        // Find user - using lean() for better performance since we only need data
        const user = await User.findById(decoded.userId).select("-hashedPassword").lean();

        if (user) {
            // Get client IP for IP restriction checks
            const clientIP = getClientIp(req);
            req.clientIP = clientIP;
            
            // Enrich user with computed admin status from AdminRole (single source of truth)
            const enrichedUser = await enrichUserWithAdminStatus(user, clientIP);
            
            // Attach user to request with computed admin status
            req.user = enrichedUser;
            
            // Also attach adminRole if it exists for convenience
            if (enrichedUser._adminRole) {
                req.adminRole = enrichedUser._adminRole;
            }
        }
        
        next();
    } catch (error) {
        // If token is invalid, just continue without user (don't fail the request)
        next();
    }
});

/**
 * Middleware to protect routes requiring authentication
 * Verifies JWT token and attaches user to request
 */
export const protectedRoute = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            message: "Access token not found",
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

        // Find user - using lean() for better performance since we only need data
        // Note: If you need to modify user later in the request, remove .lean()
        const user = await User.findById(decoded.userId).select("-hashedPassword").lean();

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Get client IP for IP restriction checks
        const clientIP = getClientIp(req);
        req.clientIP = clientIP;
        
        // Enrich user with computed admin status from AdminRole (single source of truth)
        // Pass clientIP for IP restriction validation
        const enrichedUser = await enrichUserWithAdminStatus(user, clientIP);
        
        // Attach user to request with computed admin status
        req.user = enrichedUser;
        
        // Also attach adminRole if it exists for convenience
        if (enrichedUser._adminRole) {
            req.adminRole = enrichedUser._adminRole;
        }
        
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(403).json({
                message: "Access token expired",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(403).json({
                message: "Invalid access token",
            });
        }

        throw error;
    }
});
