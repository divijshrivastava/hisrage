const express = require('express');
const router = express.Router();
const db = require('../db/config');

// Helper function to get or create cart
async function getOrCreateCart(userId, sessionId) {
    let cart;

    if (userId) {
        cart = await db.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
    } else if (sessionId) {
        cart = await db.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);
    }

    if (cart && cart.rows.length > 0) {
        return cart.rows[0];
    }

    // Create new cart
    const newCart = await db.query(
        'INSERT INTO carts (user_id, session_id) VALUES ($1, $2) RETURNING *',
        [userId || null, sessionId || null]
    );

    return newCart.rows[0];
}

// Get cart
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId || null;
        const sessionId = req.session.id;

        const cart = await getOrCreateCart(userId, sessionId);

        const cartItems = await db.query(`
            SELECT ci.*, p.name, p.image_url, p.slug, p.stock_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.cart_id = $1
        `, [cart.id]);

        const subtotal = cartItems.rows.reduce((sum, item) =>
            sum + (parseFloat(item.price) * item.quantity), 0
        );

        res.json({
            cart_id: cart.id,
            items: cartItems.rows,
            item_count: cartItems.rows.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: subtotal.toFixed(2)
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// Add item to cart
router.post('/add', async (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Get product details
        const product = await db.query(
            'SELECT * FROM products WHERE id = $1 AND is_active = TRUE',
            [product_id]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const productData = product.rows[0];

        // Check stock
        if (productData.stock_quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        const userId = req.session.userId || null;
        const sessionId = req.session.id;

        const cart = await getOrCreateCart(userId, sessionId);

        // Check if item already exists in cart
        const existingItem = await db.query(
            'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [cart.id, product_id]
        );

        if (existingItem.rows.length > 0) {
            // Update quantity
            const newQuantity = existingItem.rows[0].quantity + quantity;

            if (productData.stock_quantity < newQuantity) {
                return res.status(400).json({ error: 'Insufficient stock' });
            }

            await db.query(
                'UPDATE cart_items SET quantity = $1 WHERE id = $2',
                [newQuantity, existingItem.rows[0].id]
            );
        } else {
            // Add new item
            await db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [cart.id, product_id, quantity, productData.price]
            );
        }

        res.json({ message: 'Item added to cart successfully' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// Update cart item quantity
router.put('/update/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        // Get cart item with product details
        const item = await db.query(`
            SELECT ci.*, p.stock_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1
        `, [itemId]);

        if (item.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        if (item.rows[0].stock_quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        await db.query(
            'UPDATE cart_items SET quantity = $1 WHERE id = $2',
            [quantity, itemId]
        );

        res.json({ message: 'Cart updated successfully' });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove item from cart
router.delete('/remove/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;

        await db.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// Clear cart
router.delete('/clear', async (req, res) => {
    try {
        const userId = req.session.userId || null;
        const sessionId = req.session.id;

        let cart;
        if (userId) {
            cart = await db.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
        } else {
            cart = await db.query('SELECT * FROM carts WHERE session_id = $1', [sessionId]);
        }

        if (cart.rows.length > 0) {
            await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.rows[0].id]);
        }

        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

module.exports = router;
