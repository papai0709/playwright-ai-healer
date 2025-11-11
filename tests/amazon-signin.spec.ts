import { test, expect } from '../src/fixtures/self-healing-fixtures';

/**
 * Test suite for Amazon India sign-in page
 */
test.describe('Amazon India Sign-In Page', () => {
  test.beforeEach(async ({ selfHealingPage }) => {
    // Navigate to Amazon India
    await selfHealingPage.goto('https://www.amazon.in');
    
    // Wait for page to load
    await selfHealingPage.waitForLoadState('domcontentloaded');
  });

  test('should display sign-in button', async ({ selfHealingPage }) => {
    // Using self-healing locator
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    
    await signInButton.waitFor({ state: 'visible' });
    const isVisible = await signInButton.isVisible();
    
    expect(isVisible).toBe(true);
  });

  test('should open sign-in modal when clicking sign-in button', async ({ selfHealingPage }) => {
    // Click on sign-in button
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    // Wait for sign-in page to load
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Verify we're on the sign-in page
    expect(selfHealingPage.url()).toContain('ap/signin');
  });

  test('should display email/phone input field on sign-in page', async ({ selfHealingPage }) => {
    // Navigate to sign-in
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Check for email/phone input - using self-healing
    const emailInput = selfHealingPage.healingLocator('#ap_email');
    await emailInput.waitFor({ state: 'visible' });
    
    const isVisible = await emailInput.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should display continue button on sign-in page', async ({ selfHealingPage }) => {
    // Navigate to sign-in
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Check for continue button
    const continueButton = selfHealingPage.healingLocator('#continue');
    await continueButton.waitFor({ state: 'visible' });
    
    const isVisible = await continueButton.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should show validation message for empty email', async ({ selfHealingPage }) => {
    // Navigate to sign-in
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Click continue without entering email
    const continueButton = selfHealingPage.healingLocator('#continue');
    await continueButton.click();
    
    // Wait for error message
    await selfHealingPage.waitForTimeout(1000);
    
    // Check for error message (this selector might need healing)
    const errorMessage = selfHealingPage.healingLocator('.a-alert-content');
    const errorVisible = await errorMessage.isVisible();
    
    expect(errorVisible).toBe(true);
  });

  test('should allow entering email in input field', async ({ selfHealingPage }) => {
    // Navigate to sign-in
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Enter test email
    const emailInput = selfHealingPage.healingLocator('#ap_email');
    await emailInput.fill('test@example.com');
    
    // Verify the value was entered
    const inputValue = await selfHealingPage.locator('#ap_email').inputValue();
    expect(inputValue).toBe('test@example.com');
  });

  test('should display "Create your Amazon account" link', async ({ selfHealingPage }) => {
    // Navigate to sign-in
    const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInButton.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
    
    // Check for create account link
    const createAccountLink = selfHealingPage.healingLocator('#createAccountSubmit');
    await createAccountLink.waitFor({ state: 'visible' });
    
    const isVisible = await createAccountLink.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should have Amazon logo visible', async ({ selfHealingPage }) => {
    const logo = selfHealingPage.healingLocator('#nav-logo-sprites');
    
    await logo.waitFor({ state: 'visible' });
    const isVisible = await logo.isVisible();
    
    expect(isVisible).toBe(true);
  });
});
