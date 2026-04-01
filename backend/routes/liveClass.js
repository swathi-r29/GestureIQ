const express = require('express');
const router = express.Router();
const LiveClass = require('../models/LiveClass');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET api/live/all
// @desc    Admin: Get all classes (any status)
router.get('/all', adminAuth, async (req, res) => {
    try {
        const classes = await LiveClass.find()
            .populate('staffId', 'name email institution_name')
            .sort({ scheduledAt: -1 });
        res.json(classes);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/live/active
// @desc    Admin/Generic: Get currently active classes
router.get('/active', auth, async (req, res) => {
    try {
        const activeClasses = await LiveClass.find({ status: 'live' })
            .populate('staffId', 'name institution_name');
        res.json(activeClasses);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/live/upcoming
// @desc    Student: Get upcoming classes
router.get('/upcoming', auth, async (req, res) => {
    try {
        const upcoming = await LiveClass.find({
            status: 'scheduled',
            scheduledAt: { $gte: new Date() }
        })
            .populate('staffId', 'name institution_name')
            .sort({ scheduledAt: 1 });
        res.json(upcoming);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/live/my-hosting
// @desc    Staff: Get classes hosted by me
router.get('/my-hosting', auth, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ msg: 'Staff only' });
    try {
        const myClasses = await LiveClass.find({ staffId: req.user.id })
            .sort({ scheduledAt: -1 });
        res.json(myClasses);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/live/create
// @desc    Staff: Schedule a new class
router.post('/create', auth, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ msg: 'Staff only' });
    try {
        const { title, description, scheduledAt, duration, joinLink } = req.body;
        const newClass = new LiveClass({
            title,
            description,
            scheduledAt,
            duration,
            joinLink,
            staffId: req.user.id
        });
        await newClass.save();
        res.json(newClass);
    } catch (err) {
        res.status(500).send('Creation Failed');
    }
});

// @route   POST api/live/join/:id
// @desc    Student: Join a class and record attendance
router.post('/join/:id', auth, async (req, res) => {
    try {
        const liveClass = await LiveClass.findById(req.params.id);
        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });

        // Check if already in attendees
        const alreadyJoined = liveClass.attendees.some(a => a.studentId.toString() === req.user.id);
        if (!alreadyJoined) {
            liveClass.attendees.push({ studentId: req.user.id });
            await liveClass.save();
        }
        res.json({ joinLink: liveClass.joinLink });
    } catch (err) {
        res.status(500).send('Join Failed');
    }
});

// @route   PATCH api/live/status/:id
// @desc    Staff: Start/End/Cancel class
router.patch('/status/:id', auth, async (req, res) => {
    try {
        const { status } = req.body; // scheduled, live, ended
        const liveClass = await LiveClass.findById(req.params.id);

        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });
        if (liveClass.staffId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Unauthorized' });
        }

        liveClass.status = status;
        await liveClass.save();
        res.json(liveClass);
    } catch (err) {
        res.status(500).send('Status Update Failed');
    }
});

// ── Active modules per class (in-memory) ─────────────────────────────────────
// { classId: { mudra: true, face: false, pose: false } }
const activeModules = {};

// @route   GET api/live/modules/:classId
// @desc    Get active modules for a class
router.get('/modules/:classId', auth, async (req, res) => {
    const modules = activeModules[req.params.classId] || {
        mudra: true, face: false, pose: false
    };
    res.json(modules);
});

// @route   POST api/live/modules/:classId
// @desc    Staff: Update active modules for a class
router.post('/modules/:classId', auth, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ msg: 'Staff only' });
    const { mudra, face, pose } = req.body;
    activeModules[req.params.classId] = { mudra, face, pose };
    res.json(activeModules[req.params.classId]);
});

module.exports = router;
