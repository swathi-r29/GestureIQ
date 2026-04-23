// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Get list of approved institutes for students
router.get('/institutes', async (req, res) => {
  try {
    const institutes = await User.find({ 
      role: 'staff', 
      status: { $in: ['approved', 'active'] } 
    }).select('name institution_name years_of_experience teaching_mode bio profile_image');
    res.json(institutes);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Register Student
router.post('/register/student', async (req, res) => {
  try {
    const { name, email, password, contact_number, learning_mode, instituteId } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // If self-learning, status is active. If institute, status is pending.
    const status = learning_mode === 'self' ? 'active' : 'pending';

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      contact_number,
      learning_mode,
      instituteId: learning_mode === 'institute' ? instituteId : null,
      status
    });
    await user.save();

    const payload = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, learning_mode: user.learning_mode } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/profiles';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// Register Staff
router.post('/register/staff', upload.single('profile_image'), async (req, res) => {
  try {
    const { 
      name, email, password, institution_name, contact_number,
      institution_type, location, teaching_mode, years_of_experience, bio
    } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'staff',
      institution_name,
      contact_number,
      institution_type,
      location,
      teaching_mode,
      years_of_experience,
      bio,
      profile_image: req.file ? `/uploads/profiles/${req.file.filename}` : null
    });
    await user.save();

    res.json({ msg: 'Registration successful. Your account is pending administrator approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    // Check for staff approval or student institute approval
    const isApproved = user.status === 'approved' || user.status === 'active';

    if (!isApproved) {
      let msg = '';
      if (user.role === 'staff') {
        msg = 'Your account is pending approval by an administrator.';
      } else if (user.role === 'student' && user.learning_mode === 'institute') {
        msg = 'Your enrollment is pending approval by the selected institute.';
      }

      if (user.status === 'rejected') msg = `Your account was rejected. Reason: ${user.rejectionReason || 'No reason provided'}`;
      if (user.status === 'suspended') msg = 'Your account has been suspended.';
      
      if (msg) return res.status(403).json({ msg });
    }

    const payload = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, learning_mode: user.learning_mode } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;