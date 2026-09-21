const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  rfq_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quoted_price: { type: Number, required: true, min: 0 },
  unit_price: { type: Number, min: 0 },
  total_price: { type: Number, min: 0 },
  estimated_delivery_time: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING', index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false });

quotationSchema.index({ rfq_id: 1, supplier_id: 1 }, { unique: true });

module.exports = mongoose.model('Quotation', quotationSchema);