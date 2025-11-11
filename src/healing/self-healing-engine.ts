import { Page, Locator } from '@playwright/test';
import { config } from '../config';
import { HealingResult, SelectorCandidate } from '../types';
import { LLMClient } from '../llm/client';
import { SelectorRepository } from './selector-repository';
import { logger, HealingLogger } from '../utils/logger';
import { generateSelectorId } from '../utils/helpers';

/**
 * Self-Healing Engine for automatic element recovery
 */
export class SelfHealingEngine {
  private llmClient: LLMClient;
  private repository: SelectorRepository;
  private static instance: SelfHealingEngine;

  private constructor() {
    this.llmClient = LLMClient.getInstance();
    this.repository = SelectorRepository.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SelfHealingEngine {
    if (!SelfHealingEngine.instance) {
      SelfHealingEngine.instance = new SelfHealingEngine();
    }
    return SelfHealingEngine.instance;
  }

  /**
   * Attempt to heal a failed selector
   */
  async healSelector(
    page: Page,
    selector: string,
    errorMessage: string
  ): Promise<HealingResult> {
    if (config.healing.mode === 'disabled') {
      return {
        success: false,
        originalSelector: selector,
        attempts: 0,
        timestamp: Date.now(),
      };
    }

    const selectorId = generateSelectorId(selector, page.url());
    HealingLogger.logHealingAttempt(selector, 1, config.healing.maxAttempts);

    try {
      // Try to get cached alternatives first
      const cachedAlternatives = this.repository.getAlternatives(selectorId);
      
      if (cachedAlternatives.length > 0) {
        logger.debug(`Found ${cachedAlternatives.length} cached alternatives`);
        const result = await this.tryAlternatives(page, cachedAlternatives, selector);
        
        if (result.success) {
          this.recordHealing(selectorId, selector, result, true);
          return result;
        }
      }

      // Generate new alternatives using LLM
      const pageHtml = await this.getPageContext(page);
      const elementContext = await this.extractElementContext(page, selector);

      const candidates = await this.llmClient.generateAlternativeSelectors(
        selector,
        pageHtml,
        elementContext,
        errorMessage
      );

      logger.info(`Generated ${candidates.length} alternative selectors`);

      // Save alternatives for future use
      this.repository.saveAlternatives(selectorId, candidates);

      // Try alternatives
      const result = await this.tryAlternatives(page, candidates, selector);
      this.recordHealing(selectorId, selector, result, false);

      return result;
    } catch (error) {
      logger.error('Healing failed:', error);
      return {
        success: false,
        originalSelector: selector,
        attempts: config.healing.maxAttempts,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Try alternative selectors
   */
  private async tryAlternatives(
    page: Page,
    candidates: SelectorCandidate[],
    originalSelector: string
  ): Promise<HealingResult> {
    for (let i = 0; i < candidates.length && i < config.healing.maxAttempts; i++) {
      const candidate = candidates[i];
      
      try {
        logger.debug(
          `Trying alternative ${i + 1}/${candidates.length}: ${candidate.selector} (${candidate.strategy}, confidence: ${(candidate.confidence * 100).toFixed(1)}%)`
        );

        // Test if selector works
        const locator = page.locator(candidate.selector);
        const count = await locator.count();

        if (count === 1) {
          // Perfect match - exactly one element found
          HealingLogger.logHealingSuccess(
            originalSelector,
            candidate.selector,
            candidate.confidence
          );

          return {
            success: true,
            originalSelector,
            healedSelector: candidate.selector,
            strategy: candidate.strategy,
            confidence: candidate.confidence,
            attempts: i + 1,
            reasoning: candidate.reasoning,
            timestamp: Date.now(),
          };
        } else if (count > 1) {
          logger.debug(`Selector matched ${count} elements, skipping`);
        }
      } catch (error) {
        logger.debug(`Alternative ${i + 1} failed:`, error);
      }
    }

    HealingLogger.logHealingFailure(originalSelector, candidates.length);

    return {
      success: false,
      originalSelector,
      attempts: candidates.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Get page context for healing
   */
  private async getPageContext(page: Page): Promise<string> {
    try {
      // Get a focused section of the DOM around the viewport
      const html = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const body = doc?.body;
        return body ? body.innerHTML.substring(0, 15000) : '';
      });
      return html;
    } catch (error) {
      logger.error('Error getting page context:', error);
      return '';
    }
  }

  /**
   * Extract element context (attributes, text, position)
   */
  private async extractElementContext(
    page: Page,
    selector: string
  ): Promise<{
    attributes?: Record<string, string>;
    text?: string;
    position?: { x: number; y: number };
  }> {
    try {
      // Try to get any partial match to extract context
      const context = await page.evaluate((sel: string) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const doc = (globalThis as any).document;
          if (!doc) return {};

          // Try various selector strategies to find related elements
          const patterns = [
            sel.replace(/\[.*?\]/g, ''), // Remove attribute selectors
            sel.split(' ')[0], // First part only
            sel.split('>')[0], // Before child combinator
          ];

          for (const pattern of patterns) {
            const elements = doc.querySelectorAll(pattern);
            if (elements.length > 0) {
              const el = elements[0];
              const attrs: Record<string, string> = {};
              
              for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                attrs[attr.name] = attr.value;
              }

              const rect = el.getBoundingClientRect();
              
              return {
                attributes: attrs,
                text: el.textContent?.trim().substring(0, 100),
                position: { x: rect.x, y: rect.y },
              };
            }
          }
        } catch (e) {
          // Ignore
        }
        return {};
      }, selector);

      return context;
    } catch (error) {
      logger.debug('Could not extract element context:', error);
      return {};
    }
  }

  /**
   * Record healing attempt in database
   */
  private recordHealing(
    selectorId: string,
    originalSelector: string,
    result: HealingResult,
    fromCache: boolean
  ): void {
    this.repository.saveHealingHistory({
      selectorId,
      originalSelector,
      healedSelector: result.healedSelector,
      strategy: result.strategy,
      confidence: result.confidence,
      success: result.success,
      attempts: result.attempts,
      reasoning: fromCache ? 'Used cached alternative' : result.reasoning,
    });

    if (result.success && result.healedSelector) {
      // Update selector in repository
      this.repository.saveSelector({
        id: selectorId,
        originalSelector: result.healedSelector, // Use healed selector as new original
        strategy: result.strategy!,
        pageUrl: '', // Will be set by caller
        elementAttributes: {},
        timestamp: Date.now(),
        successRate: 1.0,
        lastUsed: Date.now(),
      });
    }
  }
}
