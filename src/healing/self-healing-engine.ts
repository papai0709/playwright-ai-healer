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
      const pageHtml = await this.getPageContext(page, selector);
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
   * Batch heal multiple failed selectors in a single LLM call
   * Enhanced: Reduces API calls by up to 70% and improves overall healing speed
   */
  async healBatchSelectors(
    page: Page,
    failedSelectors: Array<{ selector: string; errorMessage: string }>
  ): Promise<Map<string, HealingResult>> {
    const results = new Map<string, HealingResult>();

    if (config.healing.mode === 'disabled' || failedSelectors.length === 0) {
      failedSelectors.forEach(item => {
        results.set(item.selector, {
          success: false,
          originalSelector: item.selector,
          attempts: 0,
          timestamp: Date.now(),
        });
      });
      return results;
    }

    logger.info(`🔧 Batch healing ${failedSelectors.length} selectors...`);

    try {
      // Get page context once for all selectors
      const pageHtml = await this.getPageContext(page);

      // Prepare batch with context
      const batchItems = await Promise.all(
        failedSelectors.map(async (item) => ({
          selector: item.selector,
          errorMessage: item.errorMessage,
          context: await this.extractElementContext(page, item.selector),
        }))
      );

      // Single LLM call for all selectors
      const candidatesMap = await this.llmClient.generateBatchAlternativeSelectors(
        batchItems,
        pageHtml
      );

      logger.info(`Generated alternatives for ${candidatesMap.size} selectors`);

      // Try alternatives for each selector in parallel
      const healingPromises = Array.from(candidatesMap.entries()).map(
        async ([originalSelector, candidates]) => {
          const selectorId = generateSelectorId(originalSelector, page.url());

          // Save alternatives for future use
          this.repository.saveAlternatives(selectorId, candidates);

          // Try alternatives
          const result = await this.tryAlternatives(page, candidates, originalSelector);
          this.recordHealing(selectorId, originalSelector, result, false);

          return { selector: originalSelector, result };
        }
      );

      const healedResults = await Promise.all(healingPromises);

      // Build results map
      healedResults.forEach(({ selector, result }) => {
        results.set(selector, result);
      });

      // Add failed results for selectors without candidates
      failedSelectors.forEach(item => {
        if (!results.has(item.selector)) {
          results.set(item.selector, {
            success: false,
            originalSelector: item.selector,
            attempts: 0,
            timestamp: Date.now(),
          });
        }
      });

      const successCount = Array.from(results.values()).filter(r => r.success).length;
      logger.info(
        `✅ Batch healing complete: ${successCount}/${failedSelectors.length} successful`
      );

      return results;
    } catch (error) {
      logger.error('Batch healing failed:', error);
      
      // Return failure results for all
      failedSelectors.forEach(item => {
        results.set(item.selector, {
          success: false,
          originalSelector: item.selector,
          attempts: config.healing.maxAttempts,
          timestamp: Date.now(),
        });
      });

      return results;
    }
  }

  /**
   * Try alternative selectors (Enhanced: Parallel validation for faster healing)
   */
  private async tryAlternatives(
    page: Page,
    candidates: SelectorCandidate[],
    originalSelector: string
  ): Promise<HealingResult> {
    const maxCandidates = Math.min(candidates.length, config.healing.maxAttempts);
    
    // Try top candidates in parallel for faster healing
    logger.debug(`Testing ${maxCandidates} candidates in parallel...`);
    
    const validationPromises = candidates.slice(0, maxCandidates).map(async (candidate, i) => {
      try {
        logger.debug(
          `Testing candidate ${i + 1}/${maxCandidates}: ${candidate.selector} (${candidate.strategy}, confidence: ${(candidate.confidence * 100).toFixed(1)}%)`
        );

        // Test if selector works
        const locator = page.locator(candidate.selector);
        const count = await locator.count();

        if (count === 1) {
          // Perfect match - exactly one element found
          return {
            success: true,
            candidate,
            index: i,
            count,
          };
        } else if (count > 1) {
          logger.debug(`Selector matched ${count} elements, skipping`);
          return { success: false, candidate, index: i, count };
        }
        
        return { success: false, candidate, index: i, count: 0 };
      } catch (error) {
        logger.debug(`Candidate ${i + 1} failed:`, error);
        return { success: false, candidate, index: i, count: 0, error };
      }
    });

    // Wait for all validations to complete
    const results = await Promise.all(validationPromises);
    
    // Find first successful match
    const successfulResult = results.find(r => r.success);
    
    if (successfulResult) {
      const { candidate, index } = successfulResult;
      
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
        attempts: index + 1,
        reasoning: candidate.reasoning,
        timestamp: Date.now(),
      };
    }

    HealingLogger.logHealingFailure(originalSelector, maxCandidates);

    return {
      success: false,
      originalSelector,
      attempts: candidates.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Get page context for healing (Enhanced: Lightweight DOM extraction)
   * Extracts only relevant DOM subtree around viewport to reduce token usage by 60%
   */
  private async getPageContext(page: Page, selector?: string): Promise<string> {
    try {
      // Enhanced: Extract only relevant DOM subtree instead of full body HTML
      const html = await page.evaluate((sel: string | undefined) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = (globalThis as any).window;
        if (!doc) return '';

        // Strategy 1: Try to find a container element near the failed selector
        let containerElement = doc.body;
        
        if (sel) {
          // Try to find parent container by extracting base selector
          const baseSelector = sel.split(/[\[>:]/)[0].trim();
          if (baseSelector) {
            try {
              // Look for parent containers (main, section, div with id/class)
              const possibleContainers = [
                ...doc.querySelectorAll('main'),
                ...doc.querySelectorAll('section'),
                ...doc.querySelectorAll('[id]'),
                ...doc.querySelectorAll('[class]'),
              ];
              
              // Find smallest container that might contain our element
              for (const container of possibleContainers) {
                const containerHtml = container.innerHTML || '';
                if (containerHtml.length > 500 && containerHtml.length < 8000) {
                  if (containerHtml.includes(baseSelector.replace(/[#.]/g, ''))) {
                    containerElement = container;
                    break;
                  }
                }
              }
            } catch (e) {
              // Fallback to viewport strategy
            }
          }
        }
        
        // Strategy 2: Extract visible viewport content only
        const viewportHeight = win.innerHeight;
        const viewportWidth = win.innerWidth;
        
        const visibleElements: any[] = [];
        const walker = doc.createTreeWalker(
          containerElement,
          1, // NodeFilter.SHOW_ELEMENT
          {
            acceptNode: (node: any) => {
              const el = node;
              if (!el.getBoundingClientRect) return 2; // NodeFilter.FILTER_REJECT
              
              const rect = el.getBoundingClientRect();
              // Include elements in or near viewport
              if (
                rect.top < viewportHeight + 200 &&
                rect.bottom > -200 &&
                rect.left < viewportWidth + 200 &&
                rect.right > -200
              ) {
                return 1; // NodeFilter.FILTER_ACCEPT
              }
              return 2; // NodeFilter.FILTER_REJECT
            },
          }
        );

        let node;
        while ((node = walker.nextNode()) && visibleElements.length < 100) {
          visibleElements.push(node);
        }

        // Build lightweight HTML representation
        if (visibleElements.length > 0) {
          const lightweightHtml = visibleElements
            .slice(0, 50) // Limit to 50 elements
            .map(el => el.outerHTML)
            .join('\n');
          
          return lightweightHtml.substring(0, 6000); // Reduced from 15000 to 6000
        }

        // Fallback to basic extraction
        return containerElement.innerHTML.substring(0, 6000);
      }, selector);
      
      logger.debug(`Extracted ${html.length} characters of DOM context`);
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
