import { test, expect } from '../src/fixtures/self-healing-fixtures';

test.describe('Amazon India Signup - Self-Healing Demo', () => {
  test('should navigate to Amazon India and attempt signup with broken selectors', async ({ page }) => {
    // Navigate to Amazon India
    await page.goto('https://www.amazon.in');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on "Sign in" button - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#nav-link-accountList'
    await page.click('#nav-signin-button-broken');
    
    // Click on "Create your Amazon account" button - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#createAccountSubmit' or 'a[href*="register"]'
    await page.click('#create-account-link-broken');
    
    // Wait for signup form to appear
    await page.waitForLoadState('networkidle');
    
    // Fill in the name field - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#ap_customer_name' or 'input[name="customerName"]'
    await page.fill('input[id="user-name-field-broken"]', 'Test User');
    
    // Fill in the mobile number - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#ap_phone_number' or 'input[name="email"]'
    await page.fill('input[name="mobile-number-broken"]', '9876543210');
    
    // Fill in the password field - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#ap_password' or 'input[name="password"]'
    await page.fill('input[type="password-broken"]', 'TestPassword123!');
    
    // Click verify mobile number / Continue button - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#continue' or 'input[type="submit"]'
    await page.click('button[class="verify-button-broken"]');
    
    // Verify we're on the OTP verification page or similar
    // This selector is also intentionally broken
    await expect(page.locator('#otp-verification-heading-broken')).toBeVisible({ timeout: 10000 });
  });

  test('should test Amazon India search with broken selectors', async ({ page }) => {
    // Navigate to Amazon India
    await page.goto('https://www.amazon.in');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on search box - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#twotabsearchtextbox' or 'input[type="text"]'
    await page.fill('input[id="search-input-broken"]', 'laptop');
    
    // Click search button - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#nav-search-submit-button' or 'input[type="submit"]'
    await page.click('button[class="search-submit-broken"]');
    
    // Wait for results
    await page.waitForLoadState('networkidle');
    
    // Verify search results appear - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '[data-component-type="s-search-result"]'
    await expect(page.locator('.product-result-broken').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Amazon India Best Sellers with broken selectors', async ({ page }) => {
    // Navigate to Amazon India
    await page.goto('https://www.amazon.in');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click on hamburger menu - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#nav-hamburger-menu'
    await page.click('#menu-button-broken');
    
    // Wait for menu to appear
    await page.waitForTimeout(1000);
    
    // Click on "Best Sellers" link - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: 'a[href*="bestsellers"]' in the menu
    await page.click('a[data-menu-id="best-sellers-broken"]');
    
    // Wait for Best Sellers page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on Best Sellers page - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#zg_banner_text' or 'h1'
    await expect(page.locator('h1[class="bestsellers-heading-broken"]')).toBeVisible({ timeout: 10000 });
  });

  test('should add item to cart with broken selectors', async ({ page }) => {
    // Navigate to Amazon India
    await page.goto('https://www.amazon.in');
    
    // Search for a product
    await page.fill('#twotabsearchtextbox', 'headphones');
    await page.click('#nav-search-submit-button');
    
    // Wait for results
    await page.waitForLoadState('networkidle');
    
    // Click on first product - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '[data-component-type="s-search-result"] h2 a'
    await page.click('.product-title-link-broken');
    
    // Wait for product page
    await page.waitForLoadState('networkidle');
    
    // Click "Add to Cart" button - INTENTIONALLY BROKEN SELECTOR
    // Real selector might be: '#add-to-cart-button'
    await page.click('button[name="add-cart-broken"]');
    
    // Verify item added confirmation - INTENTIONALLY BROKEN SELECTOR
    await expect(page.locator('#cart-confirmation-broken')).toBeVisible({ timeout: 10000 });
  });
});
