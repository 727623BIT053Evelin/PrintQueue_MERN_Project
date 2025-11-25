const Job = require('../models/Job');

// Create Stripe checkout session
exports.createCheckoutSession = async (req, res) => {
    try {
        const { jobs, amount, batchId } = req.body;

        // Debug: Log what we're receiving
        console.log('Received jobs data:', JSON.stringify(jobs, null, 2));

        // Initialize Stripe with secret key from environment
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                message: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.'
            });
        }

        // Create jobs in database with "pending_payment" status
        // This avoids storing large job data in Stripe metadata (500 char limit)
        for (const jobData of jobs) {
            console.log('Creating job with printer:', jobData.printerId);
            await Job.create({
                user: req.user._id,
                printer: jobData.printerId, // Map printerId to printer field
                fileUrl: jobData.fileUrl,
                printDetails: jobData.printDetails,
                paymentMethod: jobData.paymentMethod,
                batchId: jobData.batchId,
                paymentStatus: 'pending_payment',
                status: 'pending'
            });
        }

        // Create line items for Stripe checkout
        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Print Job Order',
                    description: `${jobs.length} document(s) for printing`,
                },
                unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
            },
            quantity: 1,
        }];

        // Debug: Check userId type
        const userIdString = req.user._id.toString();
        console.log('userId type:', typeof userIdString, 'value:', userIdString);
        
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/my-documents?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/upload?payment=cancelled`,
            metadata: {
                batchId: batchId,
                userId: userIdString
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ message: error.message || 'Failed to create checkout session' });
    }
};

// Webhook to handle successful payments
exports.handleWebhook = async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const batchId = session.metadata.batchId;

        // Update all jobs with this batchId to mark payment as complete
        await Job.updateMany(
            { batchId: batchId, paymentStatus: 'pending_payment' },
            { $set: { paymentStatus: 'paid' } }
        );

        console.log(`Payment successful for batch ${batchId}`);
    }

    res.json({ received: true });
};

// Verify payment status
exports.verifyPayment = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // If payment was successful, update jobs to paid status
        if (session.payment_status === 'paid' && session.metadata.batchId) {
            console.log(`Payment verified for batch ${session.metadata.batchId}. Updating jobs...`);

            // Update using batchId and isPaid: false (more robust than paymentStatus)
            const updateResult = await Job.updateMany(
                { batchId: session.metadata.batchId, isPaid: false },
                { $set: { paymentStatus: 'paid', isPaid: true } }
            );

            console.log(`Updated ${updateResult.modifiedCount} jobs to paid status.`);
        }

        res.json({
            paymentStatus: session.payment_status,
            batchId: session.metadata.batchId
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ message: error.message || 'Failed to verify payment' });
    }
};
