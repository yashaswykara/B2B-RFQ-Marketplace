function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.' });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
    return res.status(503).json({ success: false, message: 'Database unavailable. Start MongoDB and verify MONGODB_URI in .env.' });
  }
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'That record already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid data supplied.' });
  res.status(500).json({ success: false, message: 'Unexpected server error.' });
}

module.exports = { notFound, errorHandler };
