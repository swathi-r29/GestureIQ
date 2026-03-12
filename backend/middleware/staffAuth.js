const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');
    
    console.log(`[Auth Debug] Token present: ${!!token} (Start: ${token?.substring(0, 10)}...)`);

    // Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Fetch user to check role and status
        const user = await User.findById(req.user.id);
        
        console.log(`[Auth Debug] User ID: ${req.user.id}, Role: ${user?.role}, Status: ${user?.status}`);

        if (!user) {
            console.error(`[Auth Error] User not found for ID: ${req.user.id}`);
            return res.status(403).json({ msg: 'User account not found.' });
        }

        const isAuthorizedRole = user.role === 'staff' || user.role === 'admin';
        const isAuthorizedStatus = user.status === 'approved' || user.status === 'active';

        if (!isAuthorizedRole) {
            console.warn(`[Auth Denied] Role '${user.role}' not authorized.`);
            return res.status(403).json({ msg: `Access denied. Role '${user.role}' is not authorized for staff actions.` });
        }

        if (!isAuthorizedStatus) {
            console.warn(`[Auth Denied] Status '${user.status}' not authorized.`);
            return res.status(403).json({ msg: `Access denied. Your account status is '${user.status}'. Approved status required.` });
        }

        next();
    } catch (err) {
        console.error('[Auth Exception]', err.message);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token is not valid or expired' });
        }
        res.status(500).json({ msg: 'Internal server error during authentication' });
    }
};
