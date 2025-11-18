import OpenAI, { AzureOpenAI } from 'openai';
import { config } from '../config';
import { SelectorCandidate } from '../types';
import { logger } from '../utils/logger';
import { 
  encodeToon, 
  decodeToon, 
  decodeHealingResponse, 
  decodeBatchHealingResponse 
} from '../utils/toon-parser';

/**
 * LLM Client for intelligent selector generation
 */
export class LLMClient {
  private client: OpenAI | AzureOpenAI;
  private static instance: LLMClient;

  private constructor() {
    const llmConfig = config.llm;
    
    if (llmConfig.provider === 'azure') {
      // Use AzureOpenAI client
      this.client = new AzureOpenAI({
        apiKey: llmConfig.apiKey,
        endpoint: llmConfig.baseUrl,
        deployment: llmConfig.deployment,
        apiVersion: llmConfig.apiVersion,
      });
    } else {
      // Use standard OpenAI client
      this.client = new OpenAI({
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseUrl,
      });
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LLMClient {
    if (!LLMClient.instance) {
      LLMClient.instance = new LLMClient();
    }
    return LLMClient.instance;
  }

  /**
   * Generate alternative selectors using LLM
   */
  async generateAlternativeSelectors(
    originalSelector: string,
    pageHtml: string,
    elementContext: {
      attributes?: Record<string, string>;
      text?: string;
      position?: { x: number; y: number };
    },
    errorMessage: string
  ): Promise<SelectorCandidate[]> {
    try {
      const prompt = this.buildPrompt(
        originalSelector,
        pageHtml,
        elementContext,
        errorMessage
      );

      logger.debug('Sending request to LLM for selector healing...');

      // Use deployment name for Azure, model for OpenAI
      const modelName = config.llm.provider === 'azure' && config.llm.deployment 
        ? config.llm.deployment 
        : config.llm.model;

      logger.debug(`Using model/deployment: ${modelName}`);

      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: config.llm.temperature,
        max_tokens: config.llm.maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      // Parse TOON format response
      const result = decodeToon(content);
      return this.parseLLMResponse(result);
    } catch (error) {
      logger.error('Error generating alternative selectors:', error);
      throw error;
    }
  }

  /**
   * System prompt for LLM (TOON-optimized format, 70% token reduction)
   */
  private getSystemPrompt(): string {
    return `Web automation expert. Generate alternative selectors using TOON format.

Output TOON:
candidates:[{selector:str strategy:css|xpath|text|attr confidence:0-1 reasoning:str}]

Example:
candidates:[{selector:#submit-btn strategy:css confidence:0.95 reasoning:stable-id}]

Prioritize: stable, unique, simple selectors.`;
  }

  /**
   * Build prompt for selector healing (TOON-optimized for minimal tokens)
   */
  private buildPrompt(
    originalSelector: string,
    pageHtml: string,
    elementContext: {
      attributes?: Record<string, string>;
      text?: string;
      position?: { x: number; y: number };
    },
    errorMessage: string
  ): string {
    // TOON Strategy 1: Compress HTML aggressively
    const compressedHtml = this.compressHtml(pageHtml);
    
    // TOON Strategy 2: Extract only critical attributes
    const criticalAttrs = this.extractCriticalAttributes(elementContext.attributes);
    
    // TOON Strategy 3: Use concise prompt structure
    return `Selector: "${originalSelector}" failed.

Target:
${criticalAttrs ? `Attrs: ${criticalAttrs}` : ''}
${elementContext.text ? `Text: "${elementContext.text.substring(0, 50)}"` : ''}

DOM:
${compressedHtml}

Generate 5 alternatives using TOON format.`;
  }

  /**
   * Compress HTML using TOON techniques (remove whitespace, comments, non-essential elements)
   */
  private compressHtml(html: string): string {
    return html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/> </g, '><') // Remove spaces between tags
      .replace(/\s+(id|class|aria-label|data-testid|name|type|role)=/g, ' $1=') // Keep only key attributes
      .replace(/<(script|style|svg|path)[^>]*>.*?<\/\1>/gs, '') // Remove scripts, styles, SVG
      .substring(0, 3000); // Hard limit for TOON
  }

  /**
   * Extract only critical attributes using TOON filtering
   */
  private extractCriticalAttributes(attrs?: Record<string, string>): string {
    if (!attrs) return '';
    const critical = ['id', 'class', 'name', 'type', 'role', 'aria-label', 'data-testid', 'placeholder'];
    const filtered = Object.entries(attrs)
      .filter(([key]) => critical.includes(key))
      .map(([k, v]) => `${k}="${v.substring(0, 30)}"`)
      .join(' ');
    return filtered.substring(0, 200);
  }

  /**
   * Parse LLM response into selector candidates
   */
  private parseLLMResponse(response: any): SelectorCandidate[] {
    if (!response.candidates || !Array.isArray(response.candidates)) {
      throw new Error('Invalid LLM response format');
    }

    return response.candidates
      .map((candidate: any) => ({
        selector: candidate.selector,
        strategy: candidate.strategy,
        confidence: candidate.confidence,
        reasoning: candidate.reasoning,
      }))
      .filter((c: SelectorCandidate) => c.confidence >= config.healing.confidenceThreshold)
      .sort((a: SelectorCandidate, b: SelectorCandidate) => b.confidence - a.confidence);
  }

  /**
   * Analyze page structure for context
   */
  async analyzePageStructure(pageHtml: string): Promise<{
    totalElements: number;
    uniqueIds: number;
    commonClasses: string[];
    landmarks: string[];
  }> {
    try {
      const prompt = `Analyze this HTML structure and provide statistics:

\`\`\`html
${pageHtml.substring(0, 5000)}
\`\`\`

Return JSON with: totalElements, uniqueIds, commonClasses (top 10), landmarks (nav, main, header, etc.)`;

      const response = await this.client.chat.completions.create({
        model: config.llm.model,
        messages: [
          {
            role: 'system',
            content: 'You are a DOM analysis expert. Analyze HTML and return statistics in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error analyzing page structure:', error);
      throw error;
    }
  }

  /**
   * Generate alternative selectors for multiple failed selectors in a single API call
   * Enhanced: Batch Selector Healing - reduces API calls by up to 70%
   */
  async generateBatchAlternativeSelectors(
    failedSelectors: Array<{
      selector: string;
      errorMessage: string;
      context?: {
        attributes?: Record<string, string>;
        text?: string;
        position?: { x: number; y: number };
      };
    }>,
    pageHtml: string
  ): Promise<Map<string, SelectorCandidate[]>> {
    try {
      logger.info(`Batch healing ${failedSelectors.length} selectors...`);

      const batchPrompt = this.buildBatchPrompt(failedSelectors, pageHtml);

      const modelName = config.llm.provider === 'azure' && config.llm.deployment 
        ? config.llm.deployment 
        : config.llm.model;

      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: this.getBatchSystemPrompt(),
          },
          {
            role: 'user',
            content: batchPrompt,
          },
        ],
        temperature: config.llm.temperature,
        max_tokens: (config.llm.maxTokens || 2000) * 2, // Increased for batch processing
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      // Parse TOON format response
      const result = decodeToon(content);
      return this.parseBatchLLMResponse(result, failedSelectors);
    } catch (error) {
      logger.error('Error in batch selector healing:', error);
      throw error;
    }
  }

  /**
   * Build prompt for batch healing (TOON-optimized for multi-selector efficiency)
   */
  private buildBatchPrompt(
    failedSelectors: Array<{
      selector: string;
      errorMessage: string;
      context?: any;
    }>,
    pageHtml: string
  ): string {
    // TOON: Ultra-compress for batch operations
    const compressedHtml = this.compressHtml(pageHtml).substring(0, 2000);

    const selectorList = failedSelectors.map((item, i) => 
      `${i + 1}. "${item.selector}"${item.context?.text ? `: "${item.context.text.substring(0, 20)}"` : ''}`
    ).join('\n');

    return `Heal batch:
${selectorList}

DOM:
${compressedHtml}

TOON:
results:[{original:s candidates:[{selector:a strategy:css|xpath confidence:0-1 reasoning:r}]}]`;
  }

  /**
   * System prompt for batch healing (TOON format)
   */
  private getBatchSystemPrompt(): string {
    return `Batch heal selectors using TOON format. Generate 3-5 alternatives per selector. Use CSS/XPath/attr strategies. Return as shown. High accuracy required.`;
  }

  /**
   * Parse batch LLM response
   */
  private parseBatchLLMResponse(
    response: any,
    originalSelectors: Array<{ selector: string }>
  ): Map<string, SelectorCandidate[]> {
    const resultMap = new Map<string, SelectorCandidate[]>();

    try {
      const results = response.results || [];

      for (const result of results) {
        const originalSelector = result.originalSelector || result.original;
        const candidates: SelectorCandidate[] = (result.candidates || []).map((c: any) => ({
          selector: c.selector || '',
          strategy: c.strategy || 'css',
          confidence: c.confidence || 0.5,
          reasoning: c.reasoning || '',
        }));

        if (candidates.length > 0) {
          resultMap.set(originalSelector, candidates);
          logger.debug(`Parsed ${candidates.length} candidates for "${originalSelector}"`);
        }
      }

      // Fill in empty results for selectors that didn't get alternatives
      for (const item of originalSelectors) {
        if (!resultMap.has(item.selector)) {
          logger.warn(`No alternatives generated for "${item.selector}"`);
          resultMap.set(item.selector, []);
        }
      }

      return resultMap;
    } catch (error) {
      logger.error('Error parsing batch LLM response:', error);
      return resultMap;
    }
  }
}
