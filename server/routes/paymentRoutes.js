const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createCheckoutSession,
    handleWebhook,
    verifyPayment
} = require('../controllers/paymentController');

// Create Stripe checkout session (protected route)
router.post('/create-checkout-session', protect, createCheckoutSession);

// Stripe webhook endpoint (NOT protected - Stripe calls this)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Verify payment status (protected route)
router.get('/verify/:sessionId', protect, verifyPayment);

module.exports = router;
