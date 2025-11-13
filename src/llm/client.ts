import OpenAI, { AzureOpenAI } from 'openai';
import { config } from '../config';
import { SelectorCandidate } from '../types';
import { logger } from '../utils/logger';

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
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const result = JSON.parse(content);
      return this.parseLLMResponse(result);
    } catch (error) {
      logger.error('Error generating alternative selectors:', error);
      throw error;
    }
  }

  /**
   * System prompt for LLM
   */
  private getSystemPrompt(): string {
    return `You are an expert in web automation and DOM analysis. Your task is to generate alternative CSS selectors and XPath expressions for web elements when the original selector fails.

Rules:
1. Generate multiple selector strategies (CSS, XPath, text-based, attribute-based)
2. Prioritize selectors that are:
   - Stable (unlikely to change with minor UI updates)
   - Unique (identify the element precisely)
   - Simple (easy to understand and maintain)
3. Provide confidence scores (0-1) for each selector
4. Explain the reasoning for each selector
5. Return response in JSON format

Response format:
{
  "candidates": [
    {
      "selector": "string",
      "strategy": "css|xpath|text|attribute|structural",
      "confidence": 0.0-1.0,
      "reasoning": "string"
    }
  ]
}`;
  }

  /**
   * Build prompt for selector healing
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
    // Truncate HTML if too large
    const maxHtmlLength = 10000;
    const truncatedHtml = pageHtml.length > maxHtmlLength
      ? pageHtml.substring(0, maxHtmlLength) + '\n... (truncated)'
      : pageHtml;

    return `The original selector "${originalSelector}" failed with error: "${errorMessage}"

Element Context:
${elementContext.attributes ? `- Attributes: ${JSON.stringify(elementContext.attributes)}` : ''}
${elementContext.text ? `- Text: "${elementContext.text}"` : ''}
${elementContext.position ? `- Position: (${elementContext.position.x}, ${elementContext.position.y})` : ''}

Page HTML (relevant section):
\`\`\`html
${truncatedHtml}
\`\`\`

Generate 5-7 alternative selectors that can locate this element. Focus on selectors that are:
1. Stable and resilient to UI changes
2. Unique to this specific element
3. Using different strategies (CSS, XPath, text, attributes, structural)

Provide your response in the specified JSON format.`;
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
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const result = JSON.parse(content);
      return this.parseBatchLLMResponse(result, failedSelectors);
    } catch (error) {
      logger.error('Error in batch selector healing:', error);
      throw error;
    }
  }

  /**
   * Build prompt for batch healing
   */
  private buildBatchPrompt(
    failedSelectors: Array<{
      selector: string;
      errorMessage: string;
      context?: any;
    }>,
    pageHtml: string
  ): string {
    const truncatedHtml = pageHtml.length > 8000
      ? pageHtml.substring(0, 8000) + '\n... (truncated)'
      : pageHtml;

    const selectorList = failedSelectors.map((item, index) => {
      return `${index + 1}. Original Selector: "${item.selector}"
   Error: ${item.errorMessage}
   Context: ${item.context?.text ? `Text: "${item.context.text}"` : 'None'}`;
    }).join('\n\n');

    return `I need to heal multiple failed selectors on this page. Please analyze the HTML and generate alternative selectors for each failed selector.

Failed Selectors:
${selectorList}

Page HTML:
\`\`\`html
${truncatedHtml}
\`\`\`

For EACH failed selector, provide 3-5 alternative selectors with different strategies (CSS, XPath, text-based, attribute-based).

Return JSON in this format:
{
  "results": [
    {
      "originalSelector": "selector1",
      "candidates": [
        {
          "selector": "alternative1",
          "strategy": "css|xpath|text|attribute",
          "confidence": 0.0-1.0,
          "reasoning": "explanation"
        }
      ]
    }
  ]
}`;
  }

  /**
   * System prompt for batch healing
   */
  private getBatchSystemPrompt(): string {
    return `You are an expert in web automation and DOM analysis. Your task is to heal multiple failed selectors simultaneously by generating alternative selectors for each.

Rules:
1. For each failed selector, generate 3-5 alternative selectors
2. Use multiple strategies: CSS, XPath, text-based, attribute-based
3. Prioritize stable, unique, and simple selectors
4. Provide confidence scores (0-1) for each alternative
5. Return results in the specified JSON format
6. Maintain high accuracy - each alternative should uniquely identify the target element`;
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
        const originalSelector = result.originalSelector;
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
