import { test, expect } from '../src/fixtures/self-healing-fixtures';

/**
 * Amazon India Sign-Up Page - Self-Healing Demo
 * This test uses intentionally broken selectors to demonstrate AI-powered healing
 */
test.describe('Amazon India Sign-Up with Self-Healing', () => {
  test.beforeEach(async ({ selfHealingPage }) => {
    // Navigate to Amazon India
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('domcontentloaded');
  });

  test('should heal broken sign-in button and navigate to registration', async ({ selfHealingPage }) => {
    // Using BROKEN selector - will trigger healing
    const signInButton = selfHealingPage.healingLocator('#old-nav-signin-button-2023');
    
    // Wait and click - healing should occur
    await signInButton.click();
    
    // Wait for sign-in page
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Verify navigation
    expect(selfHealingPage.url()).toContain('ap/signin');
  });

  test('should heal broken create account link selector', async ({ selfHealingPage }) => {
    // Click sign-in first (using correct selector)
    await selfHealingPage.healingLocator('#nav-link-accountList').click();
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Using BROKEN selector for create account link - will trigger healing
    const createAccountLink = selfHealingPage.healingLocator('#old-create-account-submit-id-xyz');
    
    // This should heal and find the actual create account button
    await createAccountLink.click();
    
    // Wait for registration page
    await selfHealingPage.waitForURL('**/ap/register**', { timeout: 10000 });
    
    // Verify we're on registration page
    expect(selfHealingPage.url()).toContain('ap/register');
  });

  test('should heal broken name input field selector on registration page', async ({ selfHealingPage }) => {
    // Navigate to sign-in
    await selfHealingPage.healingLocator('#nav-link-accountList').click();
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Click create account (correct selector)
    await selfHealingPage.healingLocator('#createAccountSubmit').click();
    await selfHealingPage.waitForURL('**/ap/register**', { timeout: 10000 });
    
    // Using BROKEN selector for name field - will trigger healing
    const nameInput = selfHealingPage.healingLocator('#old-customer-name-field-v1');
    
    // Fill name - healing should occur
    await nameInput.fill('Test User');
    
    // Verify value was entered using standard locator
    const actualValue = await selfHealingPage.locator('#ap_customer_name').inputValue();
    expect(actualValue).toBe('Test User');
  });

  test('should heal broken email input selector on registration page', async ({ selfHealingPage }) => {
    // Navigate to registration page
    await selfHealingPage.healingLocator('#nav-link-accountList').click();
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    await selfHealingPage.healingLocator('#createAccountSubmit').click();
    await selfHealingPage.waitForURL('**/ap/register**', { timeout: 10000 });
    
    // Using BROKEN selector for email field - will trigger healing
    const emailInput = selfHealingPage.healingLocator('#registration-email-input-legacy');
    
    // Fill email - healing should occur
    await emailInput.fill('testuser@example.com');
    
    // Verify value
    const actualValue = await selfHealingPage.locator('#ap_email').inputValue();
    expect(actualValue).toBe('testuser@example.com');
  });

  test('should heal broken password input selector on registration page', async ({ selfHealingPage }) => {
    // Navigate to registration page
    await selfHealingPage.healingLocator('#nav-link-accountList').click();
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    await selfHealingPage.healingLocator('#createAccountSubmit').click();
    await selfHealingPage.waitForURL('**/ap/register**', { timeout: 10000 });
    
    // Using BROKEN selector for password field - will trigger healing
    const passwordInput = selfHealingPage.healingLocator('#account-password-legacy-id');
    
    // Fill password - healing should occur
    await passwordInput.fill('SecurePass123!');
    
    // Verify value
    const actualValue = await selfHealingPage.locator('#ap_password').inputValue();
    expect(actualValue).toBe('SecurePass123!');
  });

  test('should complete full registration form with multiple healed selectors', async ({ selfHealingPage }) => {
    // Navigate to registration page
    await selfHealingPage.healingLocator('#nav-link-accountList').click();
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    await selfHealingPage.healingLocator('#createAccountSubmit').click();
    await selfHealingPage.waitForURL('**/ap/register**', { timeout: 10000 });
    
    // Fill all fields using BROKEN selectors - all should heal
    
    // Name field - BROKEN selector
    const nameField = selfHealingPage.healingLocator('#customer-full-name-2023');
    await nameField.fill('John Doe');
    
    // Email field - BROKEN selector  
    const emailField = selfHealingPage.healingLocator('#email-registration-legacy');
    await emailField.fill('john.doe@example.com');
    
    // Password field - BROKEN selector
    const passwordField = selfHealingPage.healingLocator('#password-reg-field-v2');
    await passwordField.fill('MySecurePassword123!');
    
    // Verify all values were entered correctly
    const nameValue = await selfHealingPage.locator('#ap_customer_name').inputValue();
    const emailValue = await selfHealingPage.locator('#ap_email').inputValue();
    const passwordValue = await selfHealingPage.locator('#ap_password').inputValue();
    
    expect(nameValue).toBe('John Doe');
    expect(emailValue).toBe('john.doe@example.com');
    expect(passwordValue).toBe('MySecurePassword123!');
  });
});
