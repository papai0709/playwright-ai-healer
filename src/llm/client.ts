import OpenAI from 'openai';
import { config } from '../config';
import { SelectorCandidate } from '../types';
import { logger } from '../utils/logger';

/**
 * LLM Client for intelligent selector generation
 */
export class LLMClient {
  private client: OpenAI;
  private static instance: LLMClient;

  private constructor() {
    const llmConfig = config.llm;
    
    this.client = new OpenAI({
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseUrl,
      defaultHeaders: llmConfig.deployment ? {
        'api-key': llmConfig.apiKey,
      } : undefined,
      defaultQuery: llmConfig.apiVersion ? {
        'api-version': llmConfig.apiVersion,
      } : undefined,
    });
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

      const response = await this.client.chat.completions.create({
        model: config.llm.model,
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
}
