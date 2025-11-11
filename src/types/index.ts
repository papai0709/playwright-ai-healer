/**
 * Self-Healing Configuration
 */
export interface HealingConfig {
  mode: 'auto' | 'manual' | 'disabled';
  confidenceThreshold: number;
  maxAttempts: number;
  autoApply: boolean;
  strategies: SelectorStrategy[];
}

/**
 * Selector Strategy Types
 */
export type SelectorStrategy = 
  | 'css'
  | 'xpath'
  | 'text'
  | 'attribute'
  | 'structural'
  | 'ai-visual';

/**
 * Element Selector Information
 */
export interface ElementSelector {
  id: string;
  originalSelector: string;
  strategy: SelectorStrategy;
  pageUrl: string;
  elementAttributes: Record<string, string>;
  timestamp: number;
  successRate: number;
  lastUsed: number;
}

/**
 * Alternative Selector Candidate
 */
export interface SelectorCandidate {
  selector: string;
  strategy: SelectorStrategy;
  confidence: number;
  reasoning: string;
}

/**
 * Healing Result
 */
export interface HealingResult {
  success: boolean;
  originalSelector: string;
  healedSelector?: string;
  strategy?: SelectorStrategy;
  confidence?: number;
  attempts: number;
  reasoning?: string;
  timestamp: number;
}

/**
 * LLM Configuration
 */
export interface LLMConfig {
  provider: 'openai' | 'azure' | 'anthropic';
  apiKey: string;
  model: string;
  baseUrl?: string;
  deployment?: string; // For Azure
  apiVersion?: string; // For Azure
  maxTokens?: number;
  temperature?: number;
}

/**
 * MCP Server Configuration
 */
export interface MCPConfig {
  host: string;
  port: number;
  name: string;
  version: string;
}

/**
 * Framework Configuration
 */
export interface FrameworkConfig {
  healing: HealingConfig;
  llm: LLMConfig;
  mcp: MCPConfig;
  database: {
    path: string;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    toFile: boolean;
    filePath?: string;
  };
}
