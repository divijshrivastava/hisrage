const express = require('express');
const router = express.Router();
const db = require('../db/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'images', 'products');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
}

// Apply admin middleware to all routes
router.use(isAdmin);

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const { status, payment_status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (payment_status) {
            query += ` AND payment_status = $${paramIndex}`;
            params.push(payment_status);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Update order status
router.put('/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, tracking_number, tracking_url, admin_notes } = req.body;

        const updates = [];
        const params = [orderId];
        let paramIndex = 2;

        if (status) {
            updates.push(`status = $${paramIndex}`);
            params.push(status);
            paramIndex++;

            if (status === 'shipped') {
                updates.push(`shipped_at = CURRENT_TIMESTAMP`);
            } else if (status === 'delivered') {
                updates.push(`delivered_at = CURRENT_TIMESTAMP`);
            }
        }

        if (tracking_number !== undefined) {
            updates.push(`tracking_number = $${paramIndex}`);
            params.push(tracking_number);
            paramIndex++;
        }

        if (tracking_url !== undefined) {
            updates.push(`tracking_url = $${paramIndex}`);
            params.push(tracking_url);
            paramIndex++;
        }

        if (admin_notes !== undefined) {
            updates.push(`admin_notes = $${paramIndex}`);
            params.push(admin_notes);
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get all products (admin)
router.get('/products', async (req, res) => {
    try {
        const { category_id, is_active, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }

        if (is_active !== undefined) {
            query += ` AND p.is_active = $${paramIndex}`;
            params.push(is_active === 'true');
            paramIndex++;
        }

        query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get single product (admin)
router.get('/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        const result = await db.query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Upload product images
router.post('/products/upload-images', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const imagePaths = req.files.map(file => `/images/products/${file.filename}`);

        res.json({
            message: 'Images uploaded successfully',
            images: imagePaths
        });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ error: error.message || 'Failed to upload images' });
    }
});

// Create product
router.post('/products', async (req, res) => {
    try {
        const {
            category_id, name, slug, description, price, compare_at_price,
            sku, stock_quantity, image_url, images, material, featured
        } = req.body;

        const result = await db.query(`
            INSERT INTO products (
                category_id, name, slug, description, price, compare_at_price,
                sku, stock_quantity, image_url, images, material, featured
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            category_id, name, slug, description, price, compare_at_price || null,
            sku, stock_quantity || 0, image_url || null,
            images ? JSON.stringify(images) : '[]',
            material || '316L Stainless Steel',
            featured || false
        ]);

        res.json({
            message: 'Product created successfully',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product
router.put('/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const updates = req.body;

        const allowedFields = [
            'category_id', 'name', 'slug', 'description', 'price', 'compare_at_price',
            'sku', 'stock_quantity', 'image_url', 'images', 'material', 'is_active', 'featured'
        ];

        const updateFields = [];
        const params = [productId];
        let paramIndex = 2;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                if (key === 'images' && value) {
                    updateFields.push(`${key} = $${paramIndex}`);
                    params.push(JSON.stringify(value));
                } else {
                    updateFields.push(`${key} = $${paramIndex}`);
                    params.push(value);
                }
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }

        const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`;
        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            message: 'Product updated successfully',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
router.delete('/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        // Soft delete by setting is_active to false
        const result = await db.query(
            'UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING *',
            [productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            db.query('SELECT COUNT(*) as total_orders FROM orders'),
            db.query('SELECT COUNT(*) as pending_orders FROM orders WHERE status = $1', ['pending']),
            db.query('SELECT COUNT(*) as confirmed_orders FROM orders WHERE status = $1', ['confirmed']),
            db.query('SELECT SUM(total) as total_revenue FROM orders WHERE payment_status = $1', ['paid']),
            db.query('SELECT COUNT(*) as total_products FROM products WHERE is_active = TRUE'),
            db.query('SELECT COUNT(*) as low_stock FROM products WHERE stock_quantity < 10 AND is_active = TRUE')
        ]);

        res.json({
            total_orders: parseInt(stats[0].rows[0].total_orders),
            pending_orders: parseInt(stats[1].rows[0].pending_orders),
            confirmed_orders: parseInt(stats[2].rows[0].confirmed_orders),
            total_revenue: parseFloat(stats[3].rows[0].total_revenue || 0),
            total_products: parseInt(stats[4].rows[0].total_products),
            low_stock_products: parseInt(stats[5].rows[0].low_stock)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
