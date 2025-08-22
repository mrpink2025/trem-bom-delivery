import { test, expect, Page } from '@playwright/test';

test.describe('Client Flow E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock geolocation
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            success({
              coords: {
                latitude: -16.6869,
                longitude: -49.2648,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            });
          },
          watchPosition: () => 1,
          clearWatch: () => {},
        },
      });
    });
  });

  test('should complete order flow successfully', async () => {
    // Navigate to home
    await page.goto('/');
    
    // Should show location request or restaurants
    await expect(page.locator('h1')).toBeVisible();
    
    // If location gate is shown, allow location
    const locationGate = page.locator('[data-testid="location-gate"]');
    if (await locationGate.isVisible()) {
      await page.click('[data-testid="allow-location"]');
      await page.waitForTimeout(2000);
    }
    
    // Should see restaurants list
    await expect(page.locator('[data-testid="restaurant-card"]').first()).toBeVisible();
    
    // Click on first restaurant
    await page.click('[data-testid="restaurant-card"]');
    
    // Should navigate to menu page
    await expect(page.url()).toContain('/menu/');
    
    // Add item to cart
    const addToCartButton = page.locator('[data-testid="add-to-cart"]').first();
    await addToCartButton.waitFor({ state: 'visible' });
    await addToCartButton.click();
    
    // Cart should show 1 item
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');
    
    // Open cart
    await page.click('[data-testid="cart-button"]');
    
    // Verify item in cart
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
    
    // Proceed to checkout
    await page.click('[data-testid="proceed-checkout"]');
    
    // Should navigate to checkout
    await expect(page.url()).toContain('/checkout');
    
    // Fill delivery address if needed
    const addressInput = page.locator('[data-testid="address-input"]');
    if (await addressInput.isVisible()) {
      await addressInput.fill('Rua Teste, 123, Goiânia - GO');
    }
    
    // Verify order summary
    await expect(page.locator('[data-testid="order-total"]')).toBeVisible();
    
    // Payment section should be visible
    await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();
  });

  test('should handle location denial gracefully', async () => {
    // Mock geolocation denial
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: (success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1,
              message: 'Permission denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          },
          watchPosition: () => 1,
          clearWatch: () => {},
        },
      });
    });
    
    await page.goto('/');
    
    // Should show manual address option
    const manualAddressButton = page.locator('[data-testid="manual-address"]');
    if (await manualAddressButton.isVisible()) {
      await manualAddressButton.click();
      
      // Fill manual address
      await page.fill('[data-testid="address-search"]', 'Goiânia');
      await page.click('[data-testid="address-option"]');
      
      // Should proceed to restaurants
      await expect(page.locator('[data-testid="restaurant-card"]').first()).toBeVisible();
    }
  });

  test('should show empty cart state', async () => {
    await page.goto('/');
    
    // Open cart when empty
    const cartButton = page.locator('[data-testid="cart-button"]');
    if (await cartButton.isVisible()) {
      await cartButton.click();
      
      // Should show empty state
      await expect(page.locator('[data-testid="empty-cart"]')).toBeVisible();
    }
  });

  test('should handle offline mode', async () => {
    await page.goto('/');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Offline banner should disappear
    await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible();
  });
});