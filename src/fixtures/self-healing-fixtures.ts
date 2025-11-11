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
  async isVisible() {
    const locator = await this.locate();
    return await locator.isVisible();
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
 * Extended Page with self-healing capabilities
 */
interface SelfHealingPage extends Page {
  healingLocator(selector: string): SelfHealingLocator;
}

/**
 * Playwright test with self-healing fixtures
 */
export const test = base.extend<{ selfHealingPage: SelfHealingPage }>({
  selfHealingPage: async ({ page }, use) => {
    const engine = SelfHealingEngine.getInstance();
    
    // Extend page with healing capabilities
    const healingPage = page as SelfHealingPage;
    healingPage.healingLocator = (selector: string) => {
      return new SelfHealingLocator(page, selector, engine);
    };

    await use(healingPage);
  },
});

export { expect } from '@playwright/test';
