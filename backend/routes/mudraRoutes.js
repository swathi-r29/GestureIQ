const express = require('express');
const router = express.Router();
const MudraContent = require('../models/MudraContent');
const auth = require('../middleware/auth');

// @route   GET /api/mudras
// @desc    Get filtered mudras for class creation
// @access  Private (Staff/Admin)
router.get('/', auth, async (req, res) => {
    try {
        const { type } = req.query; // 'Single' or 'Double'
        if (!type) return res.status(400).json({ msg: 'Mudra type is required' });

        const handType = type.toLowerCase() === 'single' ? 'single' : 'double';
        
        let formatted = [];
        const { isLocalMode, readLocalData } = require('../utils/dbFallback');

        if (isLocalMode()) {
            console.log(`[MudraRoute] Service unreachable, falling back to local JSON for ${handType} mudras`);
            const data = readLocalData('mudras');
            // Check if it's a map (db_check_result format)
            if (typeof data === 'object' && !Array.isArray(data)) {
                formatted = Object.keys(data)
                    .filter(key => data[key].handType === handType)
                    .map(key => ({
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        folder: key.toLowerCase()
                    }));
            } else {
                formatted = data
                    .filter(m => m.handType === handType)
                    .map(m => ({
                        name: m.mudraName.charAt(0).toUpperCase() + m.mudraName.slice(1),
                        folder: m.mudraName.toLowerCase()
                    }));
            }
        } else {
            const mudras = await MudraContent.find({ handType })
                .select('mudraName')
                .sort({ mudraName: 1 });

            formatted = mudras.map(m => ({
                name: m.mudraName.charAt(0).toUpperCase() + m.mudraName.slice(1),
                folder: m.mudraName.toLowerCase()
            }));
        }

        res.json(formatted);
    } catch (err) {
        console.error('Mudra Fetch Error:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
