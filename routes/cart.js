const express = require('express');
const router = express.Router();
const db = require('../db/config');

// Product data mapping (for when database is not available)
const productDataMap = {
    1: { name: 'Warrior Signet Ring', price: 1499, image_url: 'images/pexels-pixabay-259064.jpg' },
    2: { name: 'Alpha Wolf Ring', price: 1299, image_url: 'images/pexels-pixabay-259064.jpg' },
    3: { name: 'Rage Band', price: 899, image_url: 'images/pexels-pixabay-259064.jpg' },
    4: { name: 'Chain of Command Bracelet', price: 1899, image_url: 'images/bracelets/bracelet1.jpg' },
    5: { name: 'Chain of Command Bracelet', price: 1899, image_url: 'images/bracelets/bracelet1.jpg' },
    6: { name: 'Fury Leather Bracelet', price: 1499, image_url: 'images/bracelets/bracelet2.jpg' },
    7: { name: 'Beast Mode Bracelet', price: 2199, image_url: 'images/bracelets/bracelet3.jpg' },
    8: { name: 'Alpha Steel Band', price: 1699, image_url: 'images/bracelets/bracelet4.jpg' },
    9: { name: 'Dominance Chain', price: 2499, image_url: 'images/chains/chain1.jpg' },
    10: { name: 'Rage Pendant Chain', price: 1799, image_url: 'images/chains/chain2.jpg' },
    11: { name: 'Alpha Chain', price: 2999, image_url: 'images/chains/chain3.jpg' },
    12: { name: 'Power Chain', price: 2299, image_url: 'images/chains/chain4.jpg' }
};

// Helper function to check if database is available
async function isDbAvailable() {
    try {
        await db.query('SELECT 1');
        return true;
    } catch (error) {
        return false;
    }
}

// Helper function to get or create cart (session-based fallback)
async function getOrCreateCart(userId, sessionId) {
    const dbAvailable = await isDbAvailable();
    
    if (!dbAvailable) {
        // Return a mock cart object for session-based storage
        return { id: 'session-cart' };
    }

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
        const dbAvailable = await isDbAvailable();
        
        if (!dbAvailable) {
            // Use session-based cart
            const cartItems = req.session.cart || [];
            const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
            
            return res.json({
                cart_id: 'session-cart',
                items: cartItems,
                item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                subtotal: subtotal.toFixed(2)
            });
        }

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

        const dbAvailable = await isDbAvailable();
        let productData;

        if (!dbAvailable) {
            // Use product data map
            productData = productDataMap[product_id];
            if (!productData) {
                return res.status(404).json({ error: 'Product not found' });
            }
        } else {
            // Get product details from database
            const product = await db.query(
                'SELECT * FROM products WHERE id = $1 AND is_active = TRUE',
                [product_id]
            );

            if (product.rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            productData = product.rows[0];

            // Check stock
            if (productData.stock_quantity < quantity) {
                return res.status(400).json({ error: 'Insufficient stock' });
            }
        }

        if (!dbAvailable) {
            // Use session-based cart
            if (!req.session.cart) {
                req.session.cart = [];
            }

            const existingItemIndex = req.session.cart.findIndex(item => item.product_id === product_id);

            if (existingItemIndex >= 0) {
                // Update quantity
                req.session.cart[existingItemIndex].quantity += quantity;
            } else {
                // Add new item
                req.session.cart.push({
                    id: `item-${Date.now()}`,
                    product_id: product_id,
                    quantity: quantity,
                    price: productData.price,
                    name: productData.name,
                    image_url: productData.image_url
                });
            }

            return res.json({ message: 'Item added to cart successfully' });
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

        const dbAvailable = await isDbAvailable();

        if (!dbAvailable) {
            // Use session-based cart
            if (!req.session.cart) {
                return res.status(404).json({ error: 'Cart item not found' });
            }

            const itemIndex = req.session.cart.findIndex(item => item.id === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({ error: 'Cart item not found' });
            }

            req.session.cart[itemIndex].quantity = quantity;
            return res.json({ message: 'Cart updated successfully' });
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

        const dbAvailable = await isDbAvailable();

        if (!dbAvailable) {
            // Use session-based cart
            if (!req.session.cart) {
                return res.status(404).json({ error: 'Cart item not found' });
            }

            const itemIndex = req.session.cart.findIndex(item => item.id === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({ error: 'Cart item not found' });
            }

            req.session.cart.splice(itemIndex, 1);
            return res.json({ message: 'Item removed from cart' });
        }

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
