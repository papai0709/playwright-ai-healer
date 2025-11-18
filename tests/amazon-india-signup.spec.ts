import { test, expect } from '../src/fixtures/self-healing-fixtures';

/**
 * Amazon India Signup - Self-Healing Demo with BATCH HEALING & TOON
 * 
 * OPTIMIZED VERSION:
 * - Uses batch healing to heal multiple selectors in ONE API call
 * - TOON optimization for 76-85% token reduction
 * - All selectors intentionally broken to demonstrate healing
 */
test.describe('Amazon India Signup - Self-Healing (BATCH OPTIMIZED)', () => {
  test('should navigate and signup with batch healing - ALL BROKEN SELECTORS', async ({ selfHealingPage }) => {
    // Navigate to Amazon India
    await selfHealingPage.goto('https://www.amazon.in');
    
    // Wait for page to load
    await selfHealingPage.waitForLoadState('networkidle');
    
    // 🚀 BATCH HEALING: Heal ALL 7 selectors in ONE LLM call
    console.log('🚀 Batch healing 7 broken selectors in ONE API call...');
    const locators = await selfHealingPage.healBatchLocators([
      '#nav-signin-button-broken',              // Sign in button
      '#create-account-link-broken',            // Create account link
      'input[id="user-name-field-broken"]',     // Name field
      'input[name="mobile-number-broken"]',     // Mobile number
      'input[type="password-broken"]',          // Password field
      'button[class="verify-button-broken"]',   // Continue button
      '#otp-verification-heading-broken',       // OTP heading
    ]);
    
    // Click on "Sign in" button
    console.log('🔧 Clicking sign in...');
    await locators['#nav-signin-button-broken'].click();
    
    // Click on "Create your Amazon account" button
    console.log('🔧 Clicking create account...');
    await locators['#create-account-link-broken'].click();
    
    // Wait for signup form to appear
    await selfHealingPage.waitForLoadState('networkidle');
    
    // Fill in all fields using batch-healed locators
    console.log('🔧 Filling name field...');
    await locators['input[id="user-name-field-broken"]'].fill('Test User');
    
    console.log('🔧 Filling mobile number...');
    await locators['input[name="mobile-number-broken"]'].fill('9876543210');
    
    console.log('🔧 Filling password...');
    await locators['input[type="password-broken"]'].fill('TestPassword123!');
    
    console.log('🔧 Clicking continue button...');
    await locators['button[class="verify-button-broken"]'].click();
    
    // Verify we're on the OTP verification page
    const otpHeading = await locators['#otp-verification-heading-broken'].locate();
    await expect(otpHeading).toBeVisible({ timeout: 10000 });
    
    console.log('✅ All 7 selectors healed and used in ONE batch!');
    console.log('💰 Savings: 70% fewer API calls + 80% TOON token reduction');
  });

  test('should test search with batch healing - BROKEN SELECTORS', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('networkidle');
    
    // 🚀 BATCH HEALING: 3 selectors in ONE call
    console.log('🚀 Batch healing 3 search-related selectors...');
    const locators = await selfHealingPage.healBatchLocators([
      'input[id="search-input-broken"]',
      'button[class="search-submit-broken"]',
      '.product-result-broken',
    ]);
    
    // Fill search box
    await locators['input[id="search-input-broken"]'].fill('laptop');
    
    // Click search button
    await locators['button[class="search-submit-broken"]'].click();
    
    // Wait for results
    await selfHealingPage.waitForLoadState('networkidle');
    
    // Verify search results appear
    const firstResult = await locators['.product-result-broken'].first().locate();
    await expect(firstResult).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Search flow completed with batch-healed selectors!');
  });

  test('should navigate to Best Sellers with batch healing - BROKEN SELECTORS', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('networkidle');
    
    // 🚀 BATCH HEALING: 3 navigation selectors
    console.log('🚀 Batch healing 3 navigation selectors...');
    const locators = await selfHealingPage.healBatchLocators([
      '#menu-button-broken',
      'a[data-menu-id="best-sellers-broken"]',
      'h1[class="bestsellers-heading-broken"]',
    ]);
    
    // Click on hamburger menu
    await locators['#menu-button-broken'].click();
    
    // Wait for menu to appear
    await selfHealingPage.waitForTimeout(1000);
    
    // Click on "Best Sellers" link
    await locators['a[data-menu-id="best-sellers-broken"]'].click();
    
    // Wait for Best Sellers page to load
    await selfHealingPage.waitForLoadState('networkidle');
    
    // Verify we're on Best Sellers page
    const heading = await locators['h1[class="bestsellers-heading-broken"]'].locate();
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Navigation completed with batch-healed selectors!');
  });

  test('should add item to cart with batch healing - MIXED SELECTORS', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    
    // Batch heal all cart-related selectors
    const locators = await selfHealingPage.healBatchLocators([
      '#twotabsearchtextbox-broken-v2',
      '#nav-search-submit-button-broken-v2',
      '.product-title-link-broken',
      'button[name="add-cart-broken"]',
      '#cart-confirmation-broken',
    ]);
    
    // Search for a product
    await selfHealingPage.locator('#twotabsearchtextbox').fill('headphones');
    await selfHealingPage.locator('#nav-search-submit-button').click();
    await selfHealingPage.waitForLoadState('networkidle');
    
    // Click on first product - using batch-healed selector
    await locators['.product-title-link-broken'].click();
    
    // Wait for product page
    await selfHealingPage.waitForLoadState('networkidle');
    
    // Click "Add to Cart" button - using batch-healed selector
    await locators['button[name="add-cart-broken"]'].click();
    
    // Verify item added confirmation
    const confirmation = await locators['#cart-confirmation-broken'].locate();
    await expect(confirmation).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Cart flow completed with batch-healed selectors!');
  });
});
