"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const self_healing_fixtures_1 = require("../src/fixtures/self-healing-fixtures");
/**
 * Test suite for Amazon India sign-in page
 */
self_healing_fixtures_1.test.describe('Amazon India Sign-In Page', () => {
    self_healing_fixtures_1.test.beforeEach(async ({ selfHealingPage }) => {
        // Navigate to Amazon India
        await selfHealingPage.goto('https://www.amazon.in');
        // Wait for page to load
        await selfHealingPage.waitForLoadState('domcontentloaded');
    });
    (0, self_healing_fixtures_1.test)('should display sign-in button', async ({ selfHealingPage }) => {
        // Using self-healing locator
        const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInButton.waitFor({ state: 'visible' });
        const isVisible = await signInButton.isVisible();
        (0, self_healing_fixtures_1.expect)(isVisible).toBe(true);
    });
    (0, self_healing_fixtures_1.test)('should open sign-in modal when clicking sign-in button', async ({ selfHealingPage }) => {
        // Click on sign-in button
        const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInButton.click();
        // Wait for sign-in page to load
        await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
        // Verify we're on the sign-in page
        (0, self_healing_fixtures_1.expect)(selfHealingPage.url()).toContain('ap/signin');
    });
    (0, self_healing_fixtures_1.test)('should display email/phone input field on sign-in page', async ({ selfHealingPage }) => {
        // Navigate to sign-in
        const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInButton.click();
        await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
        // Check for email/phone input - using self-healing
        const emailInput = selfHealingPage.healingLocator('#ap_email');
        await emailInput.waitFor({ state: 'visible' });
        const isVisible = await emailInput.isVisible();
        (0, self_healing_fixtures_1.expect)(isVisible).toBe(true);
    });
    (0, self_healing_fixtures_1.test)('should display continue button on sign-in page', async ({ selfHealingPage }) => {
        // Navigate to sign-in
        const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInButton.click();
        await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
        // Check for continue button
        const continueButton = selfHealingPage.healingLocator('#continue');
        await continueButton.waitFor({ state: 'visible' });
        const isVisible = await continueButton.isVisible();
        (0, self_healing_fixtures_1.expect)(isVisible).toBe(true);
    });
    (0, self_healing_fixtures_1.test)('should show validation message for empty email', async ({ selfHealingPage }) => {
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
        (0, self_healing_fixtures_1.expect)(errorVisible).toBe(true);
    });
    (0, self_healing_fixtures_1.test)('should allow entering email in input field', async ({ selfHealingPage }) => {
        // Navigate to sign-in
        const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInButton.click();
        await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
        // Enter test email
        const emailInput = selfHealingPage.healingLocator('#ap_email');
        await emailInput.fill('test@example.com');
        // Verify the value was entered
        const inputValue = await selfHealingPage.locator('#ap_email').inputValue();
        (0, self_healing_fixtures_1.expect)(inputValue).toBe('test@example.com');
    });
    (0, self_healing_fixtures_1.test)('should display "Create your Amazon account" link', async ({ selfHealingPage }) => {
        // Navigate to sign-in
        const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInButton.click();
        await selfHealingPage.waitForURL('**/ap/signin**', { timeout: 10000 });
        // Check for create account link
        const createAccountLink = selfHealingPage.healingLocator('#createAccountSubmit');
        await createAccountLink.waitFor({ state: 'visible' });
        const isVisible = await createAccountLink.isVisible();
        (0, self_healing_fixtures_1.expect)(isVisible).toBe(true);
    });
    (0, self_healing_fixtures_1.test)('should have Amazon logo visible', async ({ selfHealingPage }) => {
        const logo = selfHealingPage.healingLocator('#nav-logo-sprites');
        await logo.waitFor({ state: 'visible' });
        const isVisible = await logo.isVisible();
        (0, self_healing_fixtures_1.expect)(isVisible).toBe(true);
    });
});
//# sourceMappingURL=amazon-signin.spec.js.map