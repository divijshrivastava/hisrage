-- HisRage E-Commerce Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),
    sku VARCHAR(100) UNIQUE,
    stock_quantity INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    images JSONB DEFAULT '[]',
    material VARCHAR(100) DEFAULT '316L Stainless Steel',
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carts table
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(session_id)
);

-- Cart items table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- Shipping address
    shipping_first_name VARCHAR(100) NOT NULL,
    shipping_last_name VARCHAR(100) NOT NULL,
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20) NOT NULL,
    shipping_country VARCHAR(100) DEFAULT 'India',

    -- Order totals
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,

    -- Payment details
    payment_method VARCHAR(50) NOT NULL, -- 'razorpay', 'stripe', 'cod'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),

    -- Order status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'

    -- Tracking
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),

    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Insert default categories
INSERT INTO categories (name, slug, description, image_url) VALUES
('Rings', 'rings', 'Bold statement rings forged for warriors', 'images/pexels-pixabay-259064.jpg'),
('Bracelets', 'bracelets', 'Power bracelets that channel your strength', 'images/pexels-ali-drabo-10956272-15640284.jpg'),
('Chains', 'chains', 'Dominant chains that command respect', 'images/pexels-trashsmash-10547072.jpg');

-- Insert sample products
INSERT INTO products (category_id, name, slug, description, price, compare_at_price, sku, stock_quantity, image_url, material, featured) VALUES
-- Rings
(1, 'Warrior Signet Ring', 'warrior-signet-ring', 'A bold signet ring engraved with ancient warrior symbols. Forged in 316L stainless steel to withstand battle.', 1499.00, 1999.00, 'RING-WSR-001', 50, 'images/pexels-pixabay-259064.jpg', '316L Stainless Steel', true),
(1, 'Alpha Wolf Ring', 'alpha-wolf-ring', 'Channel your inner alpha with this wolf-emblazoned ring. Non-tarnish steel that never backs down.', 1299.00, 1699.00, 'RING-AWR-002', 45, 'images/pexels-pixabay-259064.jpg', '316L Stainless Steel', true),
(1, 'Rage Band', 'rage-band', 'Minimal yet powerful. This band embodies controlled fury and raw strength.', 899.00, 1199.00, 'RING-RB-003', 60, 'images/pexels-pixabay-259064.jpg', '316L Stainless Steel', false),

-- Bracelets
(2, 'Chain of Command Bracelet', 'chain-command-bracelet', 'Heavy-duty chain bracelet that declares dominance. Built to last, designed to intimidate.', 1899.00, 2499.00, 'BRAC-COC-001', 35, 'images/pexels-ali-drabo-10956272-15640284.jpg', '316L Stainless Steel', true),
(2, 'Fury Leather Bracelet', 'fury-leather-bracelet', 'Premium leather combined with steel accents. Where raw meets refined.', 1499.00, 1899.00, 'BRAC-FLB-002', 40, 'images/pexels-ali-drabo-10956272-15640284.jpg', 'Leather + 316L Steel', false),
(2, 'Beast Mode Bracelet', 'beast-mode-bracelet', 'Chunky steel links that embody primal power. Wear your rage on your wrist.', 2199.00, 2799.00, 'BRAC-BMB-003', 30, 'images/pexels-ali-drabo-10956272-15640284.jpg', '316L Stainless Steel', true),

-- Chains
(3, 'Dominance Chain', 'dominance-chain', 'Thick steel chain that commands respect. Not for the weak.', 2499.00, 3299.00, 'CHAIN-DC-001', 25, 'images/pexels-trashsmash-10547072.jpg', '316L Stainless Steel', true),
(3, 'Rage Pendant Chain', 'rage-pendant-chain', 'Medium-weight chain with signature HisRage pendant. Subtle yet powerful.', 1799.00, 2399.00, 'CHAIN-RPC-002', 40, 'images/pexels-trashsmash-10547072.jpg', '316L Stainless Steel', false),
(3, 'Alpha Chain', 'alpha-chain', 'Premium heavyweight chain for those who lead the pack.', 2999.00, 3999.00, 'CHAIN-AC-003', 20, 'images/pexels-trashsmash-10547072.jpg', '316L Stainless Steel', true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
