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
        
        const mudras = await MudraContent.find({ handType })
            .select('mudraName')
            .sort({ mudraName: 1 });

        // Map to { name, folder } format expected by frontend
        const formatted = mudras.map(m => ({
            name: m.mudraName.charAt(0).toUpperCase() + m.mudraName.slice(1),
            folder: m.mudraName.toLowerCase()
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Mudra Fetch Error:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
