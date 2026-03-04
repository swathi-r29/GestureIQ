// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register Student
router.post('/register/student', async (req, res) => {
  try {
    const { name, email, password, age, experience_level } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      age,
      experience_level
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
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Register Staff
router.post('/register/staff', async (req, res) => {
  try {
    const { name, email, password, institution_name, contact_number } = req.body;
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
      contact_number
    });
    await user.save();

    // Staff do not receive a token upon registration as they require admin approval
    res.json({ msg: 'Registration successful. Your account is pending administrator approval.' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
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

    // Check for staff approval
    if (user.role === 'staff' && user.status !== 'approved') {
      let msg = 'Your account is pending approval by an administrator.';
      if (user.status === 'rejected') msg = `Your account was rejected. Reason: ${user.rejectionReason || 'No reason provided'}`;
      if (user.status === 'suspended') msg = 'Your account has been suspended.';
      return res.status(403).json({ msg });
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
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;