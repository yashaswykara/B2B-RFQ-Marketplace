const express = require('express');
const Rfq = require('../models/Rfq');
const Quotation = require('../models/Quotation');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateRfq } = require('../utils/validation');
const { sendSuccess } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

const shapeRfq = (rfq, quotationCount = 0) => {
  const value = rfq.toObject ? rfq.toObject() : rfq;
  return { ...value, id: value._id.toString(), quotation_count: quotationCount };
};

async function withCounts(rfqs) {
  const counts = await Quotation.aggregate([
    { $match: { rfq_id: { $in: rfqs.map(rfq => rfq._id) } } },
    { $group: { _id: '$rfq_id', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map(item => [item._id.toString(), item.count]));
  return rfqs.map(rfq => shapeRfq(rfq, countMap.get(rfq._id.toString()) || 0));
}

router.post('/', requireRole('BUYER'), async (req, res, next) => {
  try {
    const errors = validateRfq(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

    const { productName, description, quantity, deliveryLocation, deadline } = req.body;
    const rfq = await Rfq.create({
      buyer_id: req.user.id,
      product_name: productName.trim(),
      description: description.trim(),
      quantity: Number(quantity),
      delivery_location: deliveryLocation.trim(),
      deadline: new Date(deadline)
    });

    sendSuccess(res, { rfq: shapeRfq(rfq) }, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/', requireRole('SUPPLIER'), async (req, res, next) => {
  try {
    const query = {};
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';

    query.status = 'OPEN';
    if (search || location) {
      query.$and = [];
      if (search) {
        query.$and.push({
          $or: [
            { product_name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        });
      }
      if (location) {
        query.$and.push({ delivery_location: { $regex: location, $options: 'i' } });
      }
    }

    const rfqs = await Rfq.find(query).sort({ created_at: -1 }).lean();
    sendSuccess(res, { rfqs: await withCounts(rfqs) });
  } catch (error) {
    next(error);
  }
});

router.get('/my', requireRole('BUYER'), async (req, res, next) => {
  try {
    const rfqs = await Rfq.find({ buyer_id: req.user.id }).sort({ created_at: -1 }).lean();
    sendSuccess(res, { rfqs: await withCounts(rfqs) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rfq = await Rfq.findById(req.params.id).populate('buyer_id', 'name');
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found.' });

    if (req.user.role === 'BUYER' && rfq.buyer_id._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot access this RFQ.' });
    }

    if (req.user.role === 'SUPPLIER' && rfq.status === 'OPEN' && rfq.deadline <= new Date()) {
      rfq.status = 'CLOSED';
      await rfq.save();
    }

    const value = shapeRfq(rfq);
    value.buyer_name = rfq.buyer_id.name;
    value.buyer_id = rfq.buyer_id._id.toString();
    sendSuccess(res, { rfq: value });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('BUYER'), async (req, res, next) => {
  try {
    const errors = validateRfq(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

    const { productName, description, quantity, deliveryLocation, deadline } = req.body;
    const rfq = await Rfq.findOneAndUpdate(
      { _id: req.params.id, buyer_id: req.user.id },
      {
        product_name: productName.trim(),
        description: description.trim(),
        quantity: Number(quantity),
        delivery_location: deliveryLocation.trim(),
        deadline: new Date(deadline),
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found or not owned by you.' });
    sendSuccess(res, { rfq: shapeRfq(rfq) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', requireRole('BUYER'), async (req, res, next) => {
  try {
    const allowed = ['OPEN', 'CLOSED', 'CANCELLED'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Status must be OPEN, CLOSED or CANCELLED.' });
    }

    const rfq = await Rfq.findOneAndUpdate(
      { _id: req.params.id, buyer_id: req.user.id },
      { status: req.body.status, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found or not owned by you.' });
    sendSuccess(res, { rfq: shapeRfq(rfq) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('BUYER'), async (req, res, next) => {
  try {
    const rfq = await Rfq.findOneAndDelete({ _id: req.params.id, buyer_id: req.user.id });
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found or not owned by you.' });
    sendSuccess(res, { id: rfq._id.toString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
