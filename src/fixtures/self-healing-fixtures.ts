import { test as base, Page } from '@playwright/test';
import { SelfHealingEngine } from '../healing/self-healing-engine';
import { SelectorRepository } from '../healing/selector-repository';
import { logger } from '../utils/logger';
import { generateSelectorId } from '../utils/helpers';

/**
 * Extended Playwright locator with self-healing capabilities
 */
class SelfHealingLocator {
  constructor(
    private page: Page,
    private selector: string,
    private engine: SelfHealingEngine
  ) {}

  /**
   * Get locator with healing
   */
  async locate() {
    try {
      const locator = this.page.locator(this.selector);
      const count = await locator.count();
      
      if (count > 0) {
        // Selector works, record success
        const selectorId = generateSelectorId(this.selector, this.page.url());
        const repository = SelectorRepository.getInstance();
        repository.updateSuccessRate(selectorId, true);
        return locator;
      }

      throw new Error(`No elements found for selector: ${this.selector}`);
    } catch (error) {
      // Try to heal
      logger.warn(`Selector failed: ${this.selector}, attempting to heal...`);
      
      const healingResult = await this.engine.healSelector(
        this.page,
        this.selector,
        (error as Error).message
      );

      if (healingResult.success && healingResult.healedSelector) {
        logger.info(`Using healed selector: ${healingResult.healedSelector}`);
        return this.page.locator(healingResult.healedSelector);
      }

      throw error;
    }
  }

  /**
   * Click with healing
   */
  async click(options?: Parameters<ReturnType<Page['locator']>['click']>[0]) {
    const locator = await this.locate();
    await locator.click(options);
  }

  /**
   * Fill with healing
   */
  async fill(value: string, options?: Parameters<ReturnType<Page['locator']>['fill']>[1]) {
    const locator = await this.locate();
    await locator.fill(value, options);
  }

  /**
   * Get text with healing
   */
  async textContent() {
    const locator = await this.locate();
    return await locator.textContent();
  }

  /**
   * Check visibility with healing
   */
  async isVisible(options?: { timeout?: number }) {
    const locator = await this.locate();
    return await locator.isVisible(options);
  }

  /**
   * Get first element
   */
  first() {
    return new SelfHealingLocator(this.page, `${this.selector} >> nth=0`, this.engine);
  }

  /**
   * Wait for element with healing
   */
  async waitFor(options?: Parameters<ReturnType<Page['locator']>['waitFor']>[0]) {
    const locator = await this.locate();
    await locator.waitFor(options);
  }
}

/**
 * Batch healing result for multiple selectors
 */
interface BatchHealingLocators {
  [key: string]: SelfHealingLocator;
}

/**
 * Extended Page with self-healing capabilities
 */
interface SelfHealingPage extends Page {
  healingLocator(selector: string): SelfHealingLocator;
  healBatchLocators(selectors: string[]): Promise<BatchHealingLocators>;
}

/**
 * Playwright test with self-healing fixtures
 */
export const test = base.extend<{ selfHealingPage: SelfHealingPage }>({
  selfHealingPage: async ({ page }, use) => {
    const engine = SelfHealingEngine.getInstance();
    
    // Extend page with healing capabilities
    const healingPage = page as SelfHealingPage;
    
    // Individual selector healing
    healingPage.healingLocator = (selector: string) => {
      return new SelfHealingLocator(page, selector, engine);
    };

    // Batch selector healing - heals multiple selectors in a single LLM API call
    healingPage.healBatchLocators = async (selectors: string[]) => {
      const results: BatchHealingLocators = {};
      
      // Try all selectors first to identify which ones need healing
      const failedSelectors: Array<{ selector: string; errorMessage: string }> = [];
      
      for (const selector of selectors) {
        try {
          const locator = page.locator(selector);
          const count = await locator.count();
          
          if (count > 0) {
            // Selector works, no healing needed
            results[selector] = new SelfHealingLocator(page, selector, engine);
          } else {
            failedSelectors.push({
              selector,
              errorMessage: `No elements found for selector: ${selector}`,
            });
          }
        } catch (error) {
          failedSelectors.push({
            selector,
            errorMessage: (error as Error).message,
          });
        }
      }
      
      // If we have failed selectors, heal them all in one batch call
      if (failedSelectors.length > 0) {
        logger.info(`🔧 Batch healing ${failedSelectors.length} selectors...`);
        
        const healingResults = await engine.healBatchSelectors(page, failedSelectors);
        
        // Create locators for healed selectors
        healingResults.forEach((result, originalSelector) => {
          if (result.success && result.healedSelector) {
            // Create a locator using the healed selector
            results[originalSelector] = new SelfHealingLocator(
              page,
              result.healedSelector,
              engine
            );
            logger.info(`✅ Healed: ${originalSelector} → ${result.healedSelector}`);
          } else {
            // Fallback to original selector (will fail when used)
            results[originalSelector] = new SelfHealingLocator(page, originalSelector, engine);
            logger.warn(`❌ Failed to heal: ${originalSelector}`);
          }
        });
      }
      
      return results;
    };

    await use(healingPage);
  },
});

export { expect } from '@playwright/test';
