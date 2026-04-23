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
        default: 'pending'
    },

    // Student specific fields
    age: { type: Number },
    experience_level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
    language_preference: { type: String, default: 'English' },
    learning_mode: { type: String, enum: ['self', 'institute'], default: 'self' },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Staff specific fields
    institution_name: { type: String },
    contact_number: { type: String },
    institution_type: { 
        type: String, 
        enum: ['Dance Academy', 'Individual Instructor', 'Institution'] 
    },
    location: { type: String },
    teaching_mode: { 
        type: String, 
        enum: ['Online', 'Offline', 'Both'] 
    },
    years_of_experience: { type: Number },
    bio: { type: String },
    profile_image: { type: String },
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