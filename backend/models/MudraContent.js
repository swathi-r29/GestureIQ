const mongoose = require('mongoose');

const MudraContentSchema = new mongoose.Schema({
    mudraName: { type: String, required: true, unique: true },
    primaryImage: { type: String, default: "" },
    images: [{ type: String }],
    primaryVideo: { type: String, default: "" },
    videos: [{ type: String }],
    handType: { type: String, enum: ['single', 'double'], default: 'single' },
    description: {
        meaning: { type: String, default: "" },
        fingerPosition: { type: String, default: "" },
        usage: { type: String, default: "" },
        culturalSignificance: { type: String, default: "" },
        steps: [{ type: String }]
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MudraContent', MudraContentSchema);
