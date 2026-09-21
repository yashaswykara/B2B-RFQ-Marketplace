const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateRegistration(body) {
  const errors = [];
  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) errors.push('Name is required.');
  if (!email) errors.push('Email is required.');
  if (!password) errors.push('Password is required.');
  if (email && !emailPattern.test(email)) errors.push('Email must be valid.');
  if (password && password.length < 8) errors.push('Password must be at least 8 characters.');
  if (!['BUYER', 'SUPPLIER'].includes(body.role)) errors.push('Role must be BUYER or SUPPLIER.');
  return errors;
}

function validateRfq(body) {
  const errors = [];
  const productName = normalizeText(body.productName);
  const description = normalizeText(body.description);
  const deliveryLocation = normalizeText(body.deliveryLocation);
  const quantity = Number(body.quantity);
  const deadline = new Date(body.deadline);

  if (!productName) errors.push('Product or service is required.');
  if (!description) errors.push('Requirement description is required.');
  if (!deliveryLocation) errors.push('Delivery location is required.');
  if (body.quantity === undefined || body.quantity === null || normalizeText(String(body.quantity)) === '' || !Number.isFinite(quantity) || quantity <= 0) {
    errors.push('Quantity must be greater than 0.');
  }
  if (!body.deadline || Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    errors.push('Deadline must be a future date.');
  }

  return errors;
}

function validateQuotation(body) {
  const errors = [];
  const unitPrice = body.unitPrice === undefined ? null : Number(body.unitPrice);
  const totalPrice = Number(body.totalPrice ?? body.quotedPrice);
  const deliveryTime = normalizeText(body.estimatedDeliveryTime);

  if (!deliveryTime) errors.push('Delivery time is required.');
  if (unitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice <= 0)) errors.push('Unit price must be greater than 0.');
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) errors.push('Total price must be greater than 0.');
  if (body.message && body.message.trim().length > 1000) errors.push('Message must be 1000 characters or fewer.');

  return errors;
}

function validatePasswordReset(body) {
  const errors = [];
  const email = normalizeText(body.email);
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!email) errors.push('Email is required.');
  if (email && !emailPattern.test(email)) errors.push('Email must be valid.');
  if (!newPassword) errors.push('New password is required.');
  if (newPassword && newPassword.length < 8) errors.push('Password must be at least 8 characters.');
  if (newPassword && confirmPassword && newPassword !== confirmPassword) errors.push('Passwords do not match.');
  if (!confirmPassword) errors.push('Please confirm your new password.');

  return errors;
}

function validatePasswordChange(body) {
  const errors = [];
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!currentPassword) errors.push('Current password is required.');
  if (!newPassword) errors.push('New password is required.');
  if (newPassword && newPassword.length < 8) errors.push('Password must be at least 8 characters.');
  if (newPassword && confirmPassword && newPassword !== confirmPassword) errors.push('Passwords do not match.');
  if (!confirmPassword) errors.push('Please confirm your new password.');

  return errors;
}

module.exports = { validateRegistration, validatePasswordReset, validatePasswordChange, validateRfq, validateQuotation };
