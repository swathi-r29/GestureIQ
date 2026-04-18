const fs = require('fs');
const path = require('path');

/**
 * dbFallback.js
 * 
 * Provides a local JSON-based data access layer for the GestureIQ backend.
 * This is used when the MongoDB Atlas connection fails or times out.
 */

const DB_FILES = {
    users: path.join(__dirname, '..', 'users_db.json'),
    mudras: path.join(__dirname, '..', 'db_check_result.json'), // Using this as it has full content
    classes: path.join(__dirname, '..', 'classes_db.json')
};

const readLocalData = (type) => {
    try {
        const filePath = DB_FILES[type];
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content || '[]');
        }
    } catch (err) {
        console.error(`[dbFallback] Error reading ${type}:`, err);
    }
    return [];
};

const getLocalMudra = (name) => {
    const data = readLocalData('mudras');
    // db_check_result.json is a map by mudra name
    if (typeof data === 'object' && !Array.isArray(data)) {
        const key = name.toLowerCase();
        return data[key] || null;
    }
    // Fallback if it's an array
    return data.find(m => m.mudraName?.toLowerCase() === name.toLowerCase()) || null;
};

const getLocalUser = (email) => {
    const data = readLocalData('users');
    return data.find(u => u.email === email) || null;
};

module.exports = {
    readLocalData,
    getLocalMudra,
    getLocalUser,
    isLocalMode: () => {
        const mongoose = require('mongoose');
        return mongoose.connection.readyState !== 1;
    }
};
