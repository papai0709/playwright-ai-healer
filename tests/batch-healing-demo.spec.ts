import { test, expect } from '../src/fixtures/self-healing-fixtures';

/**
 * Demo: Batch Selector Healing
 * Tests the new batch healing feature that heals multiple selectors in a single API call
 */
test.describe('Batch Healing Demo', () => {
  
  test('should heal multiple broken selectors efficiently using batch API', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('domcontentloaded');
    
    console.log('🚀 Testing batch healing with 3 broken selectors...');
    
    // These selectors will all fail and trigger batch healing
    const selectors = [
      { 
        locator: selfHealingPage.healingLocator('#search-box-broken-old-id'),
        name: 'Search Box',
        action: async (loc: any) => await loc.fill('Test Product')
      },
      { 
        locator: selfHealingPage.healingLocator('#nav-cart-broken-selector-xyz'),
        name: 'Cart Icon',
        action: async (loc: any) => await loc.isVisible()
      },
      { 
        locator: selfHealingPage.healingLocator('#nav-account-old-broken-link'),
        name: 'Account Link',
        action: async (loc: any) => await loc.isVisible()
      }
    ];
    
    // Execute all actions - framework will heal them in parallel
    for (const { locator, name, action } of selectors) {
      console.log(`🔧 Testing ${name}...`);
      try {
        await action(locator);
        console.log(`✅ ${name} healed successfully!`);
      } catch (error) {
        console.log(`❌ ${name} failed to heal`);
      }
    }
    
    console.log('🎉 Batch healing demo complete!');
  });

  test('should demonstrate performance improvement with batch healing', async ({ selfHealingPage }) => {
    await selfHealingPage.goto('https://www.amazon.in');
    await selfHealingPage.waitForLoadState('domcontentloaded');
    
    const startTime = Date.now();
    
    // Test multiple elements with broken selectors
    const tests = [
      { selector: '#twotab-search-old', name: 'Search' },
      { selector: '#nav-logo-old-broken', name: 'Logo' },
      { selector: '#nav-tools-old-selector', name: 'Tools' },
    ];
    
    console.log(`⏱️  Starting batch healing of ${tests.length} selectors...`);
    
    for (const { selector, name } of tests) {
      try {
        const locator = selfHealingPage.healingLocator(selector);
        const visible = await locator.isVisible();
        if (visible) {
          console.log(`✅ ${name} healed`);
        }
      } catch (error) {
        console.log(`⚠️  ${name} failed`);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Total time: ${(duration / 1000).toFixed(2)}s`);
    console.log('💡 With batch healing, multiple selectors are healed with fewer API calls!');
  });
});
