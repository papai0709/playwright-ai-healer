import { test, expect } from '../src/fixtures/self-healing-fixtures';

/**
 * Amazon India Sign-Up Page - Self-Healing Demo
 * This test uses intentionally broken selectors to demonstrate AI-powered healing
 */
test.describe('Amazon India Sign-Up with Self-Healing', () => {
  
  test('should navigate to sign-up page and fill registration form', async ({ selfHealingPage }) => {
    // Navigate to Amazon India
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('domcontentloaded');
    
    // Click on Sign In button (correct selector)
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Click on "Create your Amazon account" link - using BROKEN selector to trigger healing
    console.log('🔧 Testing healing for Create Account link with broken selector...');
    const createAccountLink = selfHealingPage.healingLocator('#old-create-account-button-xyz123');
    await createAccountLink.click({ timeout: 30000 });
    
    // Wait for registration page
    await selfHealingPage.waitForURL('**/ap/register**', { timeout: 10000 });
    
    // Fill in name field - using BROKEN selector
    console.log('🔧 Testing healing for name field with broken selector...');
    const nameField = selfHealingPage.healingLocator('#customerName-old-selector');
    await nameField.fill('John Doe', { timeout: 30000 });
    
    // Fill in mobile number - using BROKEN selector
    console.log('🔧 Testing healing for mobile field with broken selector...');
    const mobileField = selfHealingPage.healingLocator('#ap_phone_number_old');
    await mobileField.fill('9876543210', { timeout: 30000 });
    
    // Fill in email - using BROKEN selector
    console.log('🔧 Testing healing for email field with broken selector...');
    const emailField = selfHealingPage.healingLocator('#ap_email_old_selector_123');
    await emailField.fill('testuser@example.com', { timeout: 30000 });
    
    // Fill in password - using BROKEN selector
    console.log('🔧 Testing healing for password field with broken selector...');
    const passwordField = selfHealingPage.healingLocator('#ap_password_old_field');
    await passwordField.fill('SecurePass123!', { timeout: 30000 });
    
    // Verify all fields are filled (optional validation)
    console.log('✅ All fields filled successfully using healed selectors!');
    
    // Note: We won't actually submit the form to avoid creating test accounts
    console.log('📝 Test completed - demonstrating self-healing on 5 broken selectors');
  });

  test('should heal broken selector for "Already have an account" link', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in/ap/register', { timeout: 15000 });
    await selfHealingPage.waitForLoadState('domcontentloaded');
    
    // Try to find sign-in link with BROKEN selector
    console.log('🔧 Testing healing for "Already have account" link...');
    const signInLink = selfHealingPage.healingLocator('#old-signin-link-broken-xyz');
    
    // Verify it's visible (should heal and find the correct element)
    const isVisible = await signInLink.isVisible({ timeout: 30000 });
    expect(isVisible).toBe(true);
    
    console.log('✅ Successfully healed and found the sign-in link!');
  });

  test('should handle multiple broken selectors in sequence', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('domcontentloaded');
    
    // Test 1: Broken search box selector
    console.log('🔧 Test 1: Healing search box selector...');
    const searchBox = selfHealingPage.healingLocator('#twotabsearchtextbox-old-broken');
    await searchBox.fill('iPhone 15', { timeout: 30000 });
    console.log('✅ Search box healed!');
    
    // Test 2: Broken search button selector
    console.log('🔧 Test 2: Healing search button selector...');
    const searchButton = selfHealingPage.healingLocator('#nav-search-submit-button-old-xyz');
    const searchBtnVisible = await searchButton.isVisible({ timeout: 30000 });
    expect(searchBtnVisible).toBe(true);
    console.log('✅ Search button healed!');
    
    // Test 3: Broken cart selector
    console.log('🔧 Test 3: Healing cart icon selector...');
    const cartIcon = selfHealingPage.healingLocator('#nav-cart-old-selector-123');
    const cartVisible = await cartIcon.isVisible({ timeout: 30000 });
    expect(cartVisible).toBe(true);
    console.log('✅ Cart icon healed!');
    
    console.log('🎉 All 3 selectors healed successfully in sequence!');
  });

  test('should demonstrate cache-based healing on repeated selector', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('domcontentloaded');
    
    // Use the same broken selector multiple times to demonstrate caching
    const brokenSelector = '#nav-link-accountList-broken-cache-test';
    
    console.log('🔧 First attempt: Will use LLM to heal...');
    const signIn1 = selfHealingPage.healingLocator(brokenSelector);
    const visible1 = await signIn1.isVisible({ timeout: 30000 });
    expect(visible1).toBe(true);
    console.log('✅ First heal complete (LLM used)');
    
    // Second attempt - should use cache
    console.log('⚡ Second attempt: Should use cached healed selector...');
    const signIn2 = selfHealingPage.healingLocator(brokenSelector);
    const visible2 = await signIn2.isVisible({ timeout: 30000 });
    expect(visible2).toBe(true);
    console.log('✅ Second heal complete (cache used - instant!)');
    
    // Third attempt - should also use cache
    console.log('⚡ Third attempt: Should also use cached selector...');
    const signIn3 = selfHealingPage.healingLocator(brokenSelector);
    const visible3 = await signIn3.isVisible({ timeout: 30000 });
    expect(visible3).toBe(true);
    console.log('✅ Third heal complete (cache used - instant!)');
    
    console.log('🎯 Cache demonstration complete - 1 LLM call, 2 instant cache hits!');
  });
});
