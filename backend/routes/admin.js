const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

// @route   POST api/admin/login
// @desc    Admin login using .env credentials
// @access  Public
const bcrypt = require('bcryptjs');

// @route   POST api/admin/login
// @desc    Admin login using database
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, role: 'admin' });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: 'admin'
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/analytics/overview
// @desc    Get dashboard overview stats
// @access  Private (Admin)
router.get('/analytics/overview', adminAuth, async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalStaff = await User.countDocuments({ role: 'staff', status: 'approved' });

        // Simplified practice session count for now (based on progress updates)
        // In a real app, you'd have a separate PracticeSession collection
        const totalPractices = await User.aggregate([
            { $group: { _id: null, count: { $sum: "$progress.practiceCount" } } }
        ]);

        res.json({
            totalStudents,
            totalStaff,
            practicesToday: totalPractices[0]?.count || 0,
            mostPopularMudra: 'Pataka' // Placeholder until we have more granular tracking
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/analytics/mudra-stats
// @desc    Get top 10 mudras stats
// @access  Private (Admin)
router.get('/analytics/mudra-stats', adminAuth, async (req, res) => {
    // Placeholder data for chart verification
    const stats = [
        { mudraName: 'Pataka', practiceCount: 45 },
        { mudraName: 'Tripataka', practiceCount: 38 },
        { mudraName: 'Ardhapataka', practiceCount: 32 },
        { mudraName: 'Kartarimukha', practiceCount: 28 },
        { mudraName: 'Mayura', practiceCount: 25 },
        { mudraName: 'Ardhachandra', practiceCount: 22 },
        { mudraName: 'Arala', practiceCount: 18 },
        { mudraName: 'Shukatunda', practiceCount: 15 },
        { mudraName: 'Mushti', practiceCount: 12 },
        { mudraName: 'Shikhara', practiceCount: 10 }
    ];
    res.json(stats);
});

// @route   GET api/admin/analytics/registrations
// @desc    Get last 7 days registrations
// @access  Private (Admin)
router.get('/analytics/registrations', adminAuth, async (req, res) => {
    // Generate dates for last 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    // Mock data for line chart
    const data = dates.map(date => ({
        date,
        students: Math.floor(Math.random() * 5),
        staff: Math.floor(Math.random() * 2)
    }));

    res.json(data);
});

// @route   GET api/admin/analytics/top-students
// @desc    Get top 10 students by progress
// @access  Private (Admin)
router.get('/analytics/top-students', adminAuth, async (req, res) => {
    try {
        const topStudents = await User.find({ role: 'student' })
            .sort({ "progress.detectedMudras": -1 })
            .limit(10)
            .select('name email progress lastActive createdAt');

        const formatted = topStudents.map((s, i) => ({
            rank: i + 1,
            name: s.name,
            email: s.email,
            mudrasMastered: s.progress?.detectedMudras?.length || 0,
            averageScore: 85, // Placeholder
            lastActive: s.progress?.lastPracticed || s.createdAt
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const MudraContent = require('../models/MudraContent');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Try to get mudraName from body or query
        const mudraName = req.body.mudraName || req.query.mudraName || 'unknown';
        const type = file.mimetype.startsWith('image') ? 'images' : 'videos';
        const dir = path.join(__dirname, `../uploads/mudras/${mudraName}/${type}/`);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Safe filename with timestamp to avoid collisions
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/\s+/g, '_');
        cb(null, `${name}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// @route   GET api/admin/mudra/list
// @desc    Get all mudras with basic info
router.get('/mudra/list', adminAuth, async (req, res) => {
    try {
        const mudras = await MudraContent.find().select('mudraName handType images videos primaryImage');
        const formatted = mudras.map(m => {
            const primaryImage = m.primaryImage || (m.images && m.images.length > 0 ? m.images[0] : "");
            return {
                mudraName: m.mudraName,
                handType: m.handType,
                hasImage: !!primaryImage,
                imageCount: m.images ? m.images.length : 0,
                videoCount: m.videos ? m.videos.length : 0,
                primaryImage: primaryImage
            };
        });
        res.json(formatted);
    } catch (err) {
        console.error('API Error [/mudra/list]:', err);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/mudra/create
// @desc    Create a new mudra entry
router.post('/mudra/create', adminAuth, async (req, res) => {
    try {
        const { mudraName, handType } = req.body;
        let mudra = await MudraContent.findOne({ mudraName: mudraName.toLowerCase() });
        if (mudra) {
            return res.status(400).json({ msg: 'Mudra already exists' });
        }
        mudra = new MudraContent({
            mudraName: mudraName.toLowerCase(),
            handType: handType || 'single'
        });
        await mudra.save();
        res.json(mudra);
    } catch (err) {
        console.error('API Error [/mudra/create]:', err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/mudra/content/:mudraName
// @desc    Get content for a specific mudra
router.get('/mudra/content/:mudraName', adminAuth, async (req, res) => {
    try {
        let content = await MudraContent.findOne({ mudraName: req.params.mudraName });
        if (!content) {
            // Check if it's one of the default 28 or let it be created as single by default
            content = new MudraContent({
                mudraName: req.params.mudraName,
                handType: 'single' // Default for legacy/default list
            });
            await content.save();
        }
        res.json(content);
    } catch (err) {
        console.error('API Error [/mudra/content/:mudraName]:', err);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/mudra/upload-image
// @desc    Upload an image for a mudra
router.post('/mudra/upload-image', adminAuth, upload.single('imageFile'), async (req, res) => {
    try {
        const { mudraName, isPrimary } = req.body;
        const filename = req.file.filename;

        const content = await MudraContent.findOne({ mudraName });
        content.images.push(filename);
        if (isPrimary === 'true') {
            content.primaryImage = filename;
        }
        content.updatedAt = Date.now();
        await content.save();

        res.json({ success: true, imageName: filename });
    } catch (err) {
        res.status(500).send('Upload Failed');
    }
});

// @route   POST api/admin/mudra/upload-video
// @desc    Upload a video for a mudra
router.post('/mudra/upload-video', adminAuth, upload.single('videoFile'), async (req, res) => {
    try {
        const { mudraName, isPrimary } = req.body;
        const filename = req.file.filename;

        const content = await MudraContent.findOne({ mudraName });
        content.videos.push(filename);
        if (isPrimary === 'true') {
            content.primaryVideo = filename;
        }
        content.updatedAt = Date.now();
        await content.save();

        res.json({ success: true, videoName: filename });
    } catch (err) {
        res.status(500).send('Upload Failed');
    }
});

// @route   POST api/admin/mudra/set-primary-image
router.post('/mudra/set-primary-image', adminAuth, async (req, res) => {
    try {
        const { mudraName, imageName } = req.body;
        await MudraContent.findOneAndUpdate({ mudraName }, { primaryImage: imageName, updatedAt: Date.now() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/mudra/set-primary-video
router.post('/mudra/set-primary-video', adminAuth, async (req, res) => {
    try {
        const { mudraName, videoName } = req.body;
        await MudraContent.findOneAndUpdate({ mudraName }, { primaryVideo: videoName, updatedAt: Date.now() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/admin/mudra/delete-image
router.delete('/mudra/delete-image', adminAuth, async (req, res) => {
    try {
        const { mudraName, imageName } = req.body;
        const content = await MudraContent.findOne({ mudraName });

        // Remove from DB
        content.images = content.images.filter(img => img !== imageName);
        if (content.primaryImage === imageName) content.primaryImage = "";
        await content.save();

        // Remove from Disk
        const filePath = path.join(__dirname, `../uploads/mudras/${mudraName}/images/${imageName}`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Delete Failed');
    }
});

// @route   PUT api/admin/mudra/update-description
router.put('/mudra/update-description', adminAuth, async (req, res) => {
    try {
        const { mudraName, meaning, fingerPosition, usage, culturalSignificance, steps } = req.body;
        await MudraContent.findOneAndUpdate(
            { mudraName },
            {
                description: { meaning, fingerPosition, usage, culturalSignificance, steps },
                updatedAt: Date.now()
            }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Update Failed');
    }
});

// --- Staff Management ---

// @route   GET api/admin/staff/pending
// @desc    Get all pending staff registrations
router.get('/staff/pending', adminAuth, async (req, res) => {
    try {
        const pending = await User.find({ role: 'staff', status: 'pending' }).select('-password');
        res.json(pending);
    } catch (err) {
        console.error('API Error [/staff/pending]:', err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/staff/all
// @desc    Get all staff (any status)
router.get('/staff/all', adminAuth, async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' }).sort({ createdAt: -1 }).select('-password');
        res.json(staff);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/staff/approve
router.post('/staff/approve', adminAuth, async (req, res) => {
    try {
        const { staffId } = req.body;
        await User.findByIdAndUpdate(staffId, {
            status: 'approved',
            approvedAt: Date.now()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Approval Failed');
    }
});

// @route   POST api/admin/staff/reject
router.post('/staff/reject', adminAuth, async (req, res) => {
    try {
        const { staffId, reason } = req.body;
        await User.findByIdAndUpdate(staffId, {
            status: 'rejected',
            rejectionReason: reason
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Rejection Failed');
    }
});

// @route   POST api/admin/staff/status
// @desc    Suspend or Reactivate staff
router.post('/staff/status', adminAuth, async (req, res) => {
    try {
        const { staffId, status } = req.body; // 'active' (approved) or 'suspended'
        await User.findByIdAndUpdate(staffId, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Status Update Failed');
    }
});

// --- Student Management ---

// @route   GET api/admin/students/all
// @desc    Get all students with filters
router.get('/students/all', adminAuth, async (req, res) => {
    try {
        const { search, level } = req.query;
        let query = { role: 'student' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (level && level !== 'All') {
            query.experience_level = level;
        }

        const students = await User.find(query).sort({ createdAt: -1 }).select('-password');
        res.json(students);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/student/reset-progress
router.post('/student/reset-progress', adminAuth, async (req, res) => {
    try {
        const { studentId } = req.body;
        await User.findByIdAndUpdate(studentId, {
            "progress.detectedMudras": [],
            "progress.practiceCount": 0
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Reset Failed');
    }
});

module.exports = router;
