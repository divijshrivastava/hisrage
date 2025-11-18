// Shared cart functionality across all pages

// Update cart count in navigation
async function updateCartCount(count) {
    const cartCountElements = document.querySelectorAll('#cart-count');

    if (count === undefined) {
        // Fetch from API
        try {
            const response = await fetch('/api/cart', {
                credentials: 'include'
            });
            const data = await response.json();
            count = data.item_count || 0;
        } catch (error) {
            console.error('Error fetching cart count:', error);
            count = 0;
        }
    }

    cartCountElements.forEach(el => {
        el.textContent = count;

        // Animate the counter
        el.style.transform = 'scale(1.3)';
        el.style.color = 'var(--rage-red)';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
            el.style.color = '';
        }, 300);
    });

    // Switch between Shop Now and Cart button on homepage
    const shopNowBtn = document.getElementById('shop-now-btn');
    const cartBtn = document.getElementById('cart-btn');

    if (shopNowBtn && cartBtn) {
        if (count > 0) {
            shopNowBtn.style.display = 'none';
            cartBtn.style.display = 'block';
        } else {
            shopNowBtn.style.display = 'block';
            cartBtn.style.display = 'none';
        }
    }
}

// Custom notification system
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existing = document.querySelector('.custom-notification');
    if (existing) {
        existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">×</button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Add close button handler
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });

    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
}

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .custom-notification {
        position: fixed;
        top: 100px;
        right: 30px;
        background: linear-gradient(135deg, rgba(26, 26, 26, 0.98) 0%, rgba(0,0,0,0.98) 100%);
        border: 2px solid var(--primary-color);
        padding: 1.5rem 2rem;
        border-radius: 0;
        box-shadow: 0 10px 40px rgba(212, 175, 55, 0.3);
        z-index: 10000;
        min-width: 350px;
        max-width: 500px;
        transform: translateX(calc(100% + 50px));
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
    }

    .custom-notification.show {
        transform: translateX(0);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .notification-icon {
        font-size: 1.5rem;
        font-weight: 700;
    }

    .notification-success .notification-icon {
        color: var(--primary-color);
    }

    .notification-error .notification-icon {
        color: var(--rage-red);
    }

    .notification-info .notification-icon {
        color: #4a9eff;
    }

    .notification-message {
        color: var(--text-primary);
        font-size: 1rem;
        font-weight: 500;
        flex: 1;
    }

    .notification-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        transition: var(--transition);
    }

    .notification-close:hover {
        color: var(--rage-red);
    }

    @media (max-width: 768px) {
        .custom-notification {
            right: 15px;
            left: 15px;
            min-width: auto;
            max-width: none;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Cart navigation
document.addEventListener('DOMContentLoaded', () => {
    // Update cart count on page load
    updateCartCount();

    // Cart button navigation
    const cartButtons = document.querySelectorAll('[data-cart-link]');
    cartButtons.forEach(btn => {
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
            window.location.href = 'cart.html';
        });
    });

    // Shop Now button navigation (homepage)
    const shopNowBtn = document.getElementById('shop-now-btn');
    if (shopNowBtn) {
        shopNowBtn.addEventListener('click', () => {
            const productsSection = document.getElementById('products');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
});
