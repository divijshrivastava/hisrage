const express = require('express');
const router = express.Router();
const db = require('../db/config');

// Helper to generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `HR${timestamp}${random}`;
}

// Create order
router.post('/create', async (req, res) => {
    const client = await db.pool.connect();

    try {
        const {
            email,
            phone,
            shipping_first_name,
            shipping_last_name,
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country = 'India',
            payment_method,
            customer_notes
        } = req.body;

        // Validate required fields
        if (!email || !phone || !shipping_first_name || !shipping_last_name ||
            !shipping_address_line1 || !shipping_city || !shipping_state ||
            !shipping_postal_code || !payment_method) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        // Get cart
        const userId = req.session.userId || null;
        const sessionId = req.session.id;

        let cart;
        if (userId) {
            cart = await client.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
        } else {
            cart = await client.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);
        }

        if (!cart || cart.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const cartId = cart.rows[0].id;

        // Get cart items
        const cartItems = await client.query(`
            SELECT ci.*, p.name, p.sku, p.stock_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1
        `, [cartId]);

        if (cartItems.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Check stock availability
        for (const item of cartItems.rows) {
            if (item.stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Insufficient stock for ${item.name}`
                });
            }
        }

        // Calculate totals
        const subtotal = cartItems.rows.reduce(
            (sum, item) => sum + (parseFloat(item.price) * item.quantity), 0
        );
        const shipping_cost = subtotal >= 2000 ? 0 : 99; // Free shipping over ₹2000
        const tax = 0; // Add tax calculation if needed
        const total = subtotal + shipping_cost + tax;

        // Create order
        const orderNumber = generateOrderNumber();

        const orderResult = await client.query(`
            INSERT INTO orders (
                user_id, order_number, email, phone,
                shipping_first_name, shipping_last_name,
                shipping_address_line1, shipping_address_line2,
                shipping_city, shipping_state, shipping_postal_code, shipping_country,
                subtotal, shipping_cost, tax, total,
                payment_method, customer_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `, [
            userId, orderNumber, email, phone,
            shipping_first_name, shipping_last_name,
            shipping_address_line1, shipping_address_line2,
            shipping_city, shipping_state, shipping_postal_code, shipping_country,
            subtotal, shipping_cost, tax, total,
            payment_method, customer_notes || null
        ]);

        const order = orderResult.rows[0];

        // Create order items and reduce stock
        for (const item of cartItems.rows) {
            await client.query(`
                INSERT INTO order_items (
                    order_id, product_id, product_name, product_sku,
                    quantity, price, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                order.id, item.product_id, item.name, item.sku,
                item.quantity, item.price, item.price * item.quantity
            ]);

            // Reduce stock
            await client.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        // Clear cart
        await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

        await client.query('COMMIT');

        res.json({
            message: 'Order created successfully',
            order: {
                id: order.id,
                order_number: order.order_number,
                total: order.total,
                payment_method: order.payment_method
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    } finally {
        client.release();
    }
});

// Get order by order number
router.get('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = await db.query(`
            SELECT * FROM orders WHERE order_number = $1
        `, [orderNumber]);

        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderItems = await db.query(`
            SELECT * FROM order_items WHERE order_id = $1
        `, [order.rows[0].id]);

        res.json({
            ...order.rows[0],
            items: orderItems.rows
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Get user orders (requires authentication)
router.get('/user/all', async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const orders = await db.query(`
            SELECT * FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        res.json(orders.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

module.exports = router;
