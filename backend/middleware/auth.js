// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Query database to confirm the user account's current active status
        try {
            const { isLocalMode } = require('../utils/dbFallback');
            if (!isLocalMode()) {
                const user = await User.findById(req.user.id).maxTimeMS(2000); // Prevent long hangs
                if (!user) {
                    return res.status(401).json({ msg: 'User not found, authorization denied' });
                }

                const isActive = user.role === 'admin' || user.status === 'active' || user.status === 'approved';
                if (!isActive) {
                    let errorMsg = 'Authorization denied: Account is not active';
                    if (user.status === 'suspended') {
                        errorMsg = 'Your account has been suspended';
                    } else if (user.status === 'deactivated') {
                        errorMsg = 'Your account has been deactivated';
                    } else if (user.status === 'pending') {
                        errorMsg = 'Your account is pending approval';
                    }
                    return res.status(403).json({ msg: errorMsg });
                }
            }
        } catch (dbErr) {
            console.warn(`[Auth Warning] DB check skipped due to error: ${dbErr.message}`);
            // If DB is unreachable, we trust the cryptographically verified JWT
        }

        next();
    } catch (err) {
        console.error('[Auth Standard Exception]', err.message);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token is not valid or expired' });
        }
        res.status(500).json({ msg: 'Internal server error during authentication' });
    }
};