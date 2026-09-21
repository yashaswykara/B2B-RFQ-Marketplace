const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { validateRegistration, validatePasswordReset, validatePasswordChange } = require('../utils/validation');
const { sendSuccess } = require('../utils/response');

const router = express.Router();
const publicUser = user => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role });
const tokenFor = user => jwt.sign({ id: user._id.toString(), role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });

router.post('/register', async (req, res, next) => {
  try {
    const errors = validateRegistration(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email: email.trim().toLowerCase(), password_hash: await bcrypt.hash(password, 12), role });
    return sendSuccess(res, { user: publicUser(user), token: tokenFor(user) }, 201);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email }).select('+password_hash');
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return sendSuccess(res, { user: publicUser(user), token: tokenFor(user) });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    sendSuccess(res, { user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const errors = validatePasswordReset(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with that email.' });

    user.password_hash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    sendSuccess(res, { message: 'Password updated successfully.' });
  } catch (error) { next(error); }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const errors = validatePasswordChange(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

    const user = await User.findById(req.user.id).select('+password_hash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const matches = await bcrypt.compare(req.body.currentPassword, user.password_hash);
    if (!matches) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.password_hash = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    sendSuccess(res, { message: 'Password changed successfully.' });
  } catch (error) { next(error); }
});

module.exports = router;
