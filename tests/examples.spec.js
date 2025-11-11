"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const self_healing_fixtures_1 = require("../src/fixtures/self-healing-fixtures");
const selector_repository_1 = require("../src/healing/selector-repository");
/**
 * Example tests demonstrating self-healing capabilities
 */
self_healing_fixtures_1.test.describe('Self-Healing Framework Examples', () => {
    (0, self_healing_fixtures_1.test)('example 1: automatic selector healing', async ({ selfHealingPage }) => {
        await selfHealingPage.goto('https://www.amazon.in');
        // This selector might be fragile, but will be auto-healed if it breaks
        const searchBox = selfHealingPage.healingLocator('#twotabsearchtextbox');
        await searchBox.fill('laptop');
        await searchBox.waitFor({ state: 'visible' });
        const value = await selfHealingPage.locator('#twotabsearchtextbox').inputValue();
        (0, self_healing_fixtures_1.expect)(value).toBe('laptop');
    });
    (0, self_healing_fixtures_1.test)('example 2: healing with multiple strategies', async ({ selfHealingPage }) => {
        await selfHealingPage.goto('https://www.amazon.in');
        // Navigate to sign-in
        const signInLink = selfHealingPage.healingLocator('#nav-link-accountList');
        await signInLink.click();
        await selfHealingPage.waitForURL('**/ap/signin**');
        // The framework will try multiple strategies if this fails
        const emailField = selfHealingPage.healingLocator('#ap_email');
        await emailField.fill('demo@test.com');
        (0, self_healing_fixtures_1.expect)(await selfHealingPage.locator('#ap_email').inputValue()).toBe('demo@test.com');
    });
    (0, self_healing_fixtures_1.test)('example 3: verify healing statistics', async ({ selfHealingPage }) => {
        await selfHealingPage.goto('https://www.amazon.in');
        // Perform some actions that might trigger healing
        const searchBox = selfHealingPage.healingLocator('#twotabsearchtextbox');
        await searchBox.click();
        // Get healing statistics
        const repository = selector_repository_1.SelectorRepository.getInstance();
        const stats = repository.getHealingStats();
        console.log('Healing Statistics:', stats);
        // Statistics should be available
        (0, self_healing_fixtures_1.expect)(stats).toBeDefined();
        (0, self_healing_fixtures_1.expect)(typeof stats.totalAttempts).toBe('number');
    });
});
//# sourceMappingURL=examples.spec.js.map