import { test, expect } from '../src/fixtures/self-healing-fixtures';
import { SelfHealingEngine } from '../src/healing/self-healing-engine';
import { SelectorRepository } from '../src/healing/selector-repository';

/**
 * Example tests demonstrating self-healing capabilities
 */
test.describe('Self-Healing Framework Examples', () => {
  test('example 1: automatic selector healing', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    
    // This selector might be fragile, but will be auto-healed if it breaks
    const searchBox = selfHealingPage.healingLocator('#twotabsearchtextbox');
    
    await searchBox.fill('laptop');
    await searchBox.waitFor({ state: 'visible' });
    
    const value = await selfHealingPage.locator('#twotabsearchtextbox').inputValue();
    expect(value).toBe('laptop');
  });

  test('example 2: healing with multiple strategies', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    
    // Navigate to sign-in
    const signInLink = selfHealingPage.healingLocator('#nav-link-accountList');
    await signInLink.click();
    
    await selfHealingPage.waitForURL('**/ap/signin**');
    
    // The framework will try multiple strategies if this fails
    const emailField = selfHealingPage.healingLocator('#ap_email');
    await emailField.fill('demo@test.com');
    
    expect(await selfHealingPage.locator('#ap_email').inputValue()).toBe('demo@test.com');
  });

  test('example 3: verify healing statistics', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    
    // Perform some actions that might trigger healing
    const searchBox = selfHealingPage.healingLocator('#twotabsearchtextbox');
    await searchBox.click();
    
    // Get healing statistics
    const repository = SelectorRepository.getInstance();
    const stats = repository.getHealingStats();
    
    console.log('Healing Statistics:', stats);
    
    // Statistics should be available
    expect(stats).toBeDefined();
    expect(typeof stats.totalAttempts).toBe('number');
  });
});
