const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product_name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  quantity: { type: Number, required: true, min: 0.01 },
  delivery_location: { type: String, required: true, trim: true, maxlength: 160 },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['OPEN', 'AWARDED', 'CLOSED', 'CANCELLED'], default: 'OPEN', index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false });

module.exports = mongoose.model('Rfq', rfqSchema);
