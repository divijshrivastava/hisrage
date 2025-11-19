# HisRage Inventory Management System

## Overview

A comprehensive inventory management system for the HisRage e-commerce platform, featuring multi-image uploads, product detail pages with image carousels, and a full-featured admin panel.

## Features

### 1. Admin Panel (`admin.html`)

Access the admin panel at: `https://hisrage.com/admin.html`

**Features:**
- ✅ Complete product CRUD operations (Create, Read, Update, Delete)
- ✅ Multi-image upload (up to 10 images per product, 5MB each)
- ✅ Real-time image preview with remove functionality
- ✅ Category management
- ✅ Stock quantity tracking with low-stock warnings
- ✅ Product status management (Active/Inactive)
- ✅ Featured products toggle
- ✅ Price and compare-at-price management
- ✅ SKU tracking
- ✅ Material specifications
- ✅ Auto-generated URL slugs from product names
- ✅ Responsive design for mobile and desktop

**Product Grid:**
- Visual product cards with primary image
- Quick status indicators (Active/Inactive)
- Stock level display with low-stock warnings
- Edit and Delete actions
- Real-time updates

### 2. Product Detail Page (`product-detail.html`)

View products at: `https://hisrage.com/product-detail.html?id={product_id}`

**Features:**
- ✅ **Image Carousel:**
  - Main image display (600px height)
  - Previous/Next navigation buttons
  - Thumbnail gallery below main image
  - Active thumbnail highlighting
  - Click-to-zoom functionality

- ✅ **Product Information:**
  - Product name and description
  - Current price with compare-at-price strikethrough
  - Discount percentage calculation
  - Stock availability (with low-stock warnings)
  - SKU, Material, Category, Warranty info
  - Star ratings (simulated)

- ✅ **Purchase Options:**
  - Quantity selector with stock validation
  - Add to Cart button
  - Buy Now button (adds to cart and redirects)
  - Stock validation prevents over-ordering

- ✅ **Additional Features:**
  - Product features list
  - HisRage guarantee section
  - Responsive design
  - Image zoom modal
  - Back navigation

### 3. Enhanced Product Listing Pages

**Updated Pages:**
- `rings.html`
- `bracelets.html`
- `chains.html`

**Changes:**
- "View" button now redirects to detailed product page
- Seamless integration with product detail view
- Maintains existing "Add to Cart" functionality

## API Endpoints

### Admin Endpoints

All admin endpoints require authentication (session-based).

#### 1. Get All Categories
```
GET /api/admin/categories
```
Returns list of all product categories.

#### 2. Get All Products
```
GET /api/admin/products?category_id={id}&is_active={true|false}&limit={n}&offset={n}
```
Returns paginated list of products with filtering options.

**Query Parameters:**
- `category_id` (optional): Filter by category
- `is_active` (optional): Filter by active status
- `limit` (optional, default: 100): Number of results
- `offset` (optional, default: 0): Pagination offset

#### 3. Get Single Product
```
GET /api/admin/products/{productId}
```
Returns detailed information for a specific product.

#### 4. Upload Product Images
```
POST /api/admin/products/upload-images
Content-Type: multipart/form-data
```
Upload up to 10 images for products.

**Body:**
- `images`: Array of image files (max 10 files, 5MB each)

**Supported formats:** JPEG, JPG, PNG, GIF, WebP

**Response:**
```json
{
  "message": "Images uploaded successfully",
  "images": [
    "/images/products/product-1234567890-123456789.jpg",
    "/images/products/product-1234567891-987654321.jpg"
  ]
}
```

**Images are stored in:** `/images/products/`

#### 5. Create Product
```
POST /api/admin/products
Content-Type: application/json
```

**Body:**
```json
{
  "category_id": 1,
  "name": "Warrior Signet Ring",
  "slug": "warrior-signet-ring",
  "description": "Bold signet ring engraved with ancient warrior symbols...",
  "price": 1499.00,
  "compare_at_price": 1999.00,
  "sku": "RING-WSR-001",
  "stock_quantity": 50,
  "material": "316L Stainless Steel",
  "featured": true,
  "is_active": true,
  "images": [
    "/images/products/product-123.jpg",
    "/images/products/product-124.jpg"
  ],
  "image_url": "/images/products/product-123.jpg"
}
```

#### 6. Update Product
```
PUT /api/admin/products/{productId}
Content-Type: application/json
```

**Body:** Same as Create Product (all fields optional)

#### 7. Delete Product (Soft Delete)
```
DELETE /api/admin/products/{productId}
```
Sets `is_active` to `false` instead of deleting.

### Public Endpoints

#### Get Single Product
```
GET /api/products/{id_or_slug}
```
Fetch product by numeric ID or slug. Returns product with all images.

**Example:**
- `/api/products/1` - Fetch by ID
- `/api/products/warrior-signet-ring` - Fetch by slug

## Database Schema

### Products Table

The `products` table includes:

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),
    sku VARCHAR(100) UNIQUE,
    stock_quantity INTEGER DEFAULT 0,
    image_url VARCHAR(500),           -- Primary image
    images JSONB DEFAULT '[]',        -- Array of additional images
    material VARCHAR(100) DEFAULT '316L Stainless Steel',
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Points:**
- `images` column stores JSON array of image URLs
- `image_url` is the primary/thumbnail image
- Supports multiple images per product via JSONB

## Usage Guide

### Adding a New Product

1. **Access Admin Panel:**
   - Navigate to `https://hisrage.com/admin.html`
   - (Authentication will be required once implemented)

2. **Click "Add New Product" Button**

3. **Fill Product Information:**
   - Select category
   - Enter product name (slug auto-generates)
   - Add description
   - Set price and compare-at-price
   - Enter SKU
   - Set stock quantity
   - Specify material
   - Toggle featured/active status

4. **Upload Images:**
   - Click "Upload Images" button
   - Select up to 10 images
   - Images upload immediately with preview
   - Drag to reorder (first image = primary)
   - Click × to remove unwanted images

5. **Save Product:**
   - Click "Save Product"
   - Product appears in grid immediately

### Editing a Product

1. Click "Edit" button on any product card
2. Modify desired fields
3. Upload new images or remove existing ones
4. Click "Save Product"

### Managing Stock

- Stock levels display on each product card
- Products with stock < 10 show "⚠️ Low" warning
- Update stock quantity in edit modal
- Out-of-stock products still visible but not purchasable

### Image Management

**Best Practices:**
- First image becomes the primary product image
- Upload high-quality images (max 5MB each)
- Recommended: Square images (1:1 aspect ratio)
- Supported formats: JPEG, PNG, GIF, WebP
- Maximum 10 images per product

**Image Storage:**
- Images stored in `/images/products/`
- Unique filenames: `product-{timestamp}-{random}.{ext}`
- Database stores relative URLs

## Product Detail Page Integration

### Linking to Product Details

From any product listing, link using:
```html
<a href="product-detail.html?id={product_id}">View Product</a>
```

Or use product slug:
```html
<a href="product-detail.html?slug={product_slug}">View Product</a>
```

### Image Carousel

The carousel automatically:
- Displays all product images from `images` array
- Falls back to `image_url` if no images array
- Shows navigation only if multiple images exist
- Highlights active thumbnail
- Supports click-to-zoom

### Quantity Management

Product detail page:
- Validates quantity against stock
- Shows stock availability
- Prevents over-ordering
- Updates cart with selected quantity

## File Structure

```
/images/products/          # Uploaded product images
admin.html                 # Admin inventory management panel
product-detail.html        # Product detail page with carousel
routes/admin.js           # Admin API endpoints
routes/products.js        # Public product endpoints
rings.html                # Rings category (updated)
bracelets.html           # Bracelets category (updated)
chains.html              # Chains category (updated)
```

## Security Considerations

### Current Implementation

1. **Image Upload:**
   - File type validation (JPEG, PNG, GIF, WebP only)
   - File size limit (5MB per image)
   - Unique filename generation prevents conflicts
   - Server-side validation

2. **Admin Access:**
   - Session-based authentication middleware
   - Checks `req.session.userId` and `req.session.isAdmin`
   - Returns 403 Forbidden for unauthorized access

### Recommended Enhancements

- [ ] Add CSRF protection
- [ ] Implement rate limiting on image uploads
- [ ] Add image optimization/compression
- [ ] Implement CDN for image delivery
- [ ] Add admin login page
- [ ] Implement role-based permissions

## Deployment Notes

### Fly.io Considerations

**Storage:**
- Uploaded images stored in `/images/products/`
- Fly.io uses ephemeral filesystem
- Images persist only during app runtime
- **Recommendation:** Use external storage (AWS S3, Cloudinary) for production

**Environment Variables:**
- No additional environment variables needed
- Uses existing database connection
- Session store already configured

### Production Checklist

- [ ] Implement admin authentication
- [ ] Set up external image storage (S3/Cloudinary)
- [ ] Add image CDN
- [ ] Implement backup strategy for product data
- [ ] Add logging for admin actions
- [ ] Set up monitoring for storage usage

## Future Enhancements

### Planned Features

1. **Bulk Import/Export:**
   - CSV import for products
   - Bulk image upload
   - Export product catalog

2. **Advanced Inventory:**
   - Low stock email alerts
   - Inventory history tracking
   - Reorder point management

3. **Image Enhancements:**
   - Automatic image optimization
   - Multiple image sizes (thumbnail, medium, large)
   - Image cropping tool
   - 360° product views

4. **Analytics:**
   - Product view tracking
   - Popular products dashboard
   - Stock movement reports

5. **SEO:**
   - Dynamic meta tags
   - Schema.org product markup
   - Sitemap generation

## Troubleshooting

### Images Not Uploading

**Check:**
1. File size < 5MB
2. File format is supported (JPEG, PNG, GIF, WebP)
3. Browser console for errors
4. Network tab for failed requests

### Products Not Appearing

**Verify:**
1. Product is marked as `is_active: true`
2. Product has valid category
3. Check browser console for API errors
4. Verify database connection

### Carousel Not Working

**Common Issues:**
1. Product has no images array
2. Images array is empty
3. JavaScript errors in console
4. Images not loading (check paths)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check server logs for backend errors
4. Review database for data integrity

## Credits

Built with:
- Express.js
- PostgreSQL
- Multer (file uploads)
- Vanilla JavaScript
- Custom CSS with HisRage theme

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
