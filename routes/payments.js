const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const db = require('../db/config');

// Initialize payment gateways (only if credentials are provided)
let razorpay = null;
let stripe = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Create Razorpay order
router.post('/razorpay/create', async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({ error: 'Razorpay is not configured' });
    }
    try {
        const { order_id } = req.body;

        // Get order details
        const orderResult = await db.query(
            'SELECT * FROM orders WHERE id = $1',
            [order_id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(parseFloat(order.total) * 100), // Convert to paise
            currency: 'INR',
            receipt: order.order_number,
            notes: {
                order_id: order.id,
                order_number: order.order_number
            }
        });

        // Update order with Razorpay order ID
        await db.query(
            'UPDATE orders SET razorpay_order_id = $1 WHERE id = $2',
            [razorpayOrder.id, order.id]
        );

        res.json({
            razorpay_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// Verify Razorpay payment
router.post('/razorpay/verify', async (req, res) => {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ error: 'Razorpay is not configured' });
    }
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Update order
        const result = await db.query(`
            UPDATE orders
            SET
                payment_status = 'paid',
                razorpay_payment_id = $1,
                razorpay_signature = $2,
                paid_at = CURRENT_TIMESTAMP,
                status = 'confirmed'
            WHERE razorpay_order_id = $3
            RETURNING *
        `, [razorpay_payment_id, razorpay_signature, razorpay_order_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('Razorpay verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Create Stripe payment intent
router.post('/stripe/create', async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured' });
    }
    try {
        const { order_id } = req.body;

        // Get order details
        const orderResult = await db.query(
            'SELECT * FROM orders WHERE id = $1',
            [order_id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(parseFloat(order.total) * 100), // Convert to cents/paise
            currency: 'inr',
            metadata: {
                order_id: order.id,
                order_number: order.order_number
            },
            description: `HisRage Order ${order.order_number}`
        });

        // Update order with Stripe payment intent ID
        await db.query(
            'UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2',
            [paymentIntent.id, order.id]
        );

        res.json({
            client_secret: paymentIntent.client_secret,
            publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
        });
    } catch (error) {
        console.error('Stripe payment intent creation error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Stripe webhook handler
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured' });
    }
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

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;

        // Update order
        await db.query(`
            UPDATE orders
            SET
                payment_status = 'paid',
                paid_at = CURRENT_TIMESTAMP,
                status = 'confirmed'
            WHERE stripe_payment_intent_id = $1
        `, [paymentIntent.id]);
    }

    res.json({ received: true });
});

// COD order confirmation
router.post('/cod/confirm', async (req, res) => {
    try {
        const { order_id } = req.body;

        const result = await db.query(`
            UPDATE orders
            SET status = 'confirmed'
            WHERE id = $1 AND payment_method = 'cod'
            RETURNING *
        `, [order_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            success: true,
            message: 'COD order confirmed',
            order: result.rows[0]
        });
    } catch (error) {
        console.error('COD confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm order' });
    }
});

module.exports = router;
