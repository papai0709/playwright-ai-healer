import dotenv from 'dotenv';
import { FrameworkConfig } from '../types';

dotenv.config();

/**
 * Load and validate framework configuration from environment variables
 */
export const config: FrameworkConfig = {
  healing: {
    mode: (process.env.HEALING_MODE as 'auto' | 'manual' | 'disabled') || 'auto',
    confidenceThreshold: parseFloat(process.env.HEALING_CONFIDENCE_THRESHOLD || '0.75'),
    maxAttempts: parseInt(process.env.HEALING_MAX_ATTEMPTS || '3'),
    autoApply: process.env.HEALING_AUTO_APPLY === 'true',
    strategies: ['css', 'xpath', 'text', 'attribute', 'structural', 'ai-visual'],
  },
  llm: {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'azure' | 'anthropic') || 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    baseUrl: process.env.OPENAI_BASE_URL || process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    maxTokens: 2000,
    temperature: 0.3,
  },
  mcp: {
    host: process.env.MCP_SERVER_HOST || 'localhost',
    port: parseInt(process.env.MCP_SERVER_PORT || '3000'),
    name: 'self-healing-test-framework',
    version: '1.0.0',
  },
  database: {
    path: process.env.DB_PATH || './data/selectors.db',
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    toFile: process.env.LOG_TO_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/framework.log',
  },
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  if (!config.llm.apiKey) {
    throw new Error('LLM API key is required. Set OPENAI_API_KEY or AZURE_OPENAI_API_KEY.');
  }
  
  if (config.healing.confidenceThreshold < 0 || config.healing.confidenceThreshold > 1) {
    throw new Error('Healing confidence threshold must be between 0 and 1.');
  }
  
  if (config.healing.maxAttempts < 1) {
    throw new Error('Healing max attempts must be at least 1.');
  }
}
