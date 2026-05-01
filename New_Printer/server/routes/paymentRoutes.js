const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createOrder,
    verifyPayment
} = require('../controllers/paymentController');

// Create Razorpay order (protected route)
router.post('/create-order', protect, createOrder);

// Verify payment status (protected route)
router.post('/verify', protect, verifyPayment);

module.exports = router;
