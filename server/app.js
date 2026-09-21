require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const rfqRoutes = require('./routes/rfqs');
const quotationRoutes = require('./routes/quotations');
const { notFound, errorHandler } = require('./middleware/errors');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api/auth', authRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api', quotationRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
