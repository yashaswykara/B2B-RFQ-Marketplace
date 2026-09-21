const express = require('express');
const Rfq = require('../models/Rfq');
const Quotation = require('../models/Quotation');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateQuotation } = require('../utils/validation');
const { sendSuccess } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

const shapeQuotation = item => {
  const value = item.toObject ? item.toObject() : item;
  return { ...value, id: value._id.toString(), rfq_id: value.rfq_id?.toString(), supplier_id: value.supplier_id?.toString() };
};

router.post('/rfqs/:rfqId/quotations', requireRole('SUPPLIER'), async (req, res, next) => {
  try {
    const errors = validateQuotation(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

    const rfq = await Rfq.findById(req.params.rfqId);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found.' });
    if (rfq.status !== 'OPEN') return res.status(400).json({ success: false, message: 'This RFQ is no longer accepting quotations.' });
    if (rfq.deadline <= new Date()) return res.status(400).json({ success: false, message: 'This RFQ is no longer accepting quotations.' });

    const existing = await Quotation.findOne({ rfq_id: rfq._id, supplier_id: req.user.id });
    if (existing) return res.status(409).json({ success: false, message: 'You have already submitted a quotation for this RFQ.' });

    const { quotedPrice, unitPrice, totalPrice, estimatedDeliveryTime, message = '' } = req.body;
    const price = Number(totalPrice ?? quotedPrice);
    const quotation = await Quotation.create({
      rfq_id: rfq._id,
      supplier_id: req.user.id,
      quoted_price: price,
      unit_price: unitPrice === undefined ? price : Number(unitPrice),
      total_price: price,
      estimated_delivery_time: String(estimatedDeliveryTime).trim(),
      message: String(message).trim()
    });

    sendSuccess(res, { quotation: shapeQuotation(quotation) }, 201);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'You have already submitted a quotation for this RFQ.' });
    next(error);
  }
});

router.get('/my/quotations', requireRole('SUPPLIER'), async (req, res, next) => {
  try {
    const quotations = await Quotation.find({ supplier_id: req.user.id }).populate('rfq_id').sort({ created_at: -1 }).lean();
    sendSuccess(res, {
      quotations: quotations.map(q => ({
        ...shapeQuotation(q),
        product_name: q.rfq_id?.product_name,
        quantity: q.rfq_id?.quantity,
        delivery_location: q.rfq_id?.delivery_location,
        deadline: q.rfq_id?.deadline,
        rfq_status: q.rfq_id?.status,
        status: q.status || 'PENDING'
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my/rfqs/:rfqId/quotations', requireRole('BUYER'), async (req, res, next) => {
  try {
    const rfq = await Rfq.findOne({ _id: req.params.rfqId, buyer_id: req.user.id });
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found or not owned by you.' });

    const quotations = await Quotation.find({ rfq_id: rfq._id }).populate('supplier_id', 'name email').sort({ created_at: -1 }).lean();
    sendSuccess(res, {
      quotations: quotations.map(q => ({
        ...shapeQuotation(q),
        supplier_name: q.supplier_id?.name,
        supplier_email: q.supplier_id?.email,
        quoted_price: q.quoted_price,
        estimated_delivery_time: q.estimated_delivery_time,
        message: q.message,
        status: q.status || 'PENDING'
      }))
    });
  } catch (error) {
    next(error);
  }
});

async function decideQuotation(req, res, next, status) {
  try {
    if (req.user.role !== 'BUYER') {
      return res.status(403).json({ success: false, message: 'Only buyers can decide quotations.' });
    }

    const quotation = await Quotation.findById(req.params.id).populate('rfq_id');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found.' });
    if (quotation.rfq_id.buyer_id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot decide a quotation for this RFQ.' });
    }
    if (quotation.rfq_id.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'This RFQ is no longer accepting quotation decisions.' });
    }
    if (quotation.status && quotation.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'This quotation has already been decided.' });
    }

    if (status === 'ACCEPTED') {
      await Quotation.updateMany(
        { rfq_id: quotation.rfq_id._id, _id: { $ne: quotation._id }, status: 'PENDING' },
        { $set: { status: 'REJECTED' } }
      );
      await Rfq.updateOne({ _id: quotation.rfq_id._id, buyer_id: req.user.id, status: 'OPEN' }, { $set: { status: 'AWARDED' } });
    }

    quotation.status = status;
    await quotation.save();
    sendSuccess(res, { quotation: shapeQuotation(quotation), rfq_status: status === 'ACCEPTED' ? 'AWARDED' : quotation.rfq_id.status });
  } catch (error) {
    next(error);
  }
}

router.patch('/quotations/:id/accept', requireRole('BUYER'), (req, res, next) => decideQuotation(req, res, next, 'ACCEPTED'));
router.patch('/quotations/:id/reject', requireRole('BUYER'), (req, res, next) => decideQuotation(req, res, next, 'REJECTED'));

router.get('/quotations/:id', async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('rfq_id').lean();
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found.' });

    const allowed = req.user.role === 'SUPPLIER'
      ? quotation.supplier_id.toString() === req.user.id
      : quotation.rfq_id.buyer_id.toString() === req.user.id;

    if (!allowed) return res.status(404).json({ success: false, message: 'Quotation not found.' });

    sendSuccess(res, {
      quotation: {
        ...shapeQuotation(quotation),
        product_name: quotation.rfq_id.product_name,
        buyer_id: quotation.rfq_id.buyer_id.toString(),
        quantity: quotation.rfq_id.quantity,
        delivery_location: quotation.rfq_id.delivery_location,
        deadline: quotation.rfq_id.deadline,
        rfq_status: quotation.rfq_id.status,
        status: quotation.status || 'PENDING'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
