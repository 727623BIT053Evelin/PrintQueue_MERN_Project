const Razorpay = require('razorpay');
const crypto = require('crypto');
const Job = require('../models/Job');

// Create Razorpay order
exports.createOrder = async (req, res) => {
    try {
        const { jobs, amount, batchId } = req.body;

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                message: 'Razorpay is not configured. Please add keys to environment variables.'
            });
        }

        // Create jobs in database with "pending_payment" status
        for (const jobData of jobs) {
            await Job.create({
                user: req.user._id,
                printer: jobData.printerId,
                fileUrl: jobData.fileUrl,
                printDetails: jobData.printDetails,
                paymentMethod: jobData.paymentMethod,
                batchId: jobData.batchId,
                paymentStatus: 'pending_payment',
                status: 'pending'
            });
        }

        const options = {
            amount: Math.round(parseFloat(amount) * 100), // amount in the smallest currency unit (paise for INR)
            currency: process.env.CURRENCY || 'INR',
            receipt: `receipt_${batchId}`,
        };

        const order = await razorpay.orders.create(options);

        res.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Razorpay order error:', error);
        res.status(500).json({ message: error.message || 'Failed to create order' });
    }
};

// Verify payment signature
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, batchId } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment verified
            const updateResult = await Job.updateMany(
                { batchId: batchId, paymentStatus: 'pending_payment' },
                { $set: { paymentStatus: 'paid', isPaid: true } }
            );

            console.log(`Updated ${updateResult.modifiedCount} jobs to paid status for batch ${batchId}.`);

            return res.json({ message: "Payment verified successfully", success: true });
        } else {
            return res.status(400).json({ message: "Invalid signature", success: false });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ message: error.message || 'Failed to verify payment' });
    }
};
