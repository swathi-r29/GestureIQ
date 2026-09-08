const express = require('express');
const router = express.Router();
const MudraContent = require('../models/MudraContent');
const auth = require('../middleware/auth');

// @route   GET /api/mudras
// @desc    Get filtered mudras for class creation
// @access  Private (Staff/Admin)
router.get('/', auth, async (req, res) => {
    try {
        const { type } = req.query; // 'Single', 'Double', 'FullBody', or 'Combined'
        if (!type) return res.status(400).json({ msg: 'Mudra or practice type is required' });

        const reqType = type.toLowerCase();
        
        const FULL_BODY_ITEMS = [
            { name: 'Araimandi Stance', folder: 'araimandi' },
            { name: 'Muzhumandi Stance', folder: 'muzhumandi' },
            { name: 'Nattadavu Posture', folder: 'nattadavu' },
            { name: 'Samapada Position', folder: 'samapada' },
            { name: 'Veeshi Adavu', folder: 'veeshi_adavu' },
            { name: 'Tatta Adavu', folder: 'tatta_adavu' }
        ];

        if (reqType === 'fullbody' || reqType === 'stance') {
            return res.json(FULL_BODY_ITEMS);
        }

        let formatted = [];
        const { isLocalMode, readLocalData } = require('../utils/dbFallback');

        if (reqType === 'combined' || reqType === 'all') {
            // Get single and double mudras + full body items
            let singleAndDouble = [];
            if (isLocalMode()) {
                const data = readLocalData('mudras');
                if (typeof data === 'object' && !Array.isArray(data)) {
                    singleAndDouble = Object.keys(data).map(key => ({
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        folder: key.toLowerCase()
                    }));
                } else {
                    singleAndDouble = data.map(m => ({
                        name: m.mudraName.charAt(0).toUpperCase() + m.mudraName.slice(1),
                        folder: m.mudraName.toLowerCase()
                    }));
                }
            } else {
                const mudras = await MudraContent.find({}).select('mudraName').sort({ mudraName: 1 });
                singleAndDouble = mudras.map(m => ({
                    name: m.mudraName.charAt(0).toUpperCase() + m.mudraName.slice(1),
                    folder: m.mudraName.toLowerCase()
                }));
            }
            return res.json([...FULL_BODY_ITEMS, ...singleAndDouble]);
        }

        const handType = reqType === 'single' ? 'single' : 'double';

        if (isLocalMode()) {
            console.log(`[MudraRoute] Service unreachable, falling back to local JSON for ${handType} mudras`);
            const data = readLocalData('mudras');
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
