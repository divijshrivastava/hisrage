const express = require('express');
const router = express.Router();
const db = require('../db/config');

// Get all products
router.get('/', async (req, res) => {
    try {
        const { category, featured, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE
        `;
        const params = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND c.slug = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (featured === 'true') {
            query += ` AND p.featured = TRUE`;
        }

        query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        res.json({
            products: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get single product by ID or slug
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;

        // Check if identifier is a number (ID) or string (slug)
        const isId = !isNaN(identifier);

        const result = await db.query(`
            SELECT p.*, c.name as category_name, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${isId ? 'p.id = $1' : 'p.slug = $1'} AND p.is_active = TRUE
        `, [isId ? parseInt(identifier) : identifier]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

module.exports = router;
