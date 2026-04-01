// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'staff', 'admin'], required: true, default: 'student' },
    status: {
        type: String,
        enum: ['active', 'pending', 'approved', 'rejected', 'suspended', 'deactivated'],
        default: function () {
            return this.role === 'staff' ? 'pending' : 'approved';
        }
    },

    // Student specific fields
    age: { type: Number },
    experience_level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    language_preference: { type: String, default: 'English' },

    // Staff specific fields
    institution_name: { type: String },
    contact_number: { type: String },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    progress: {
        detectedMudras: [String],
        mudraScores: { type: Map, of: Number, default: {} },
        practiceCount: { type: Number, default: 0 },
        lastPracticed: { type: Date }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);