import initSqlJs, { Database } from 'sql.js';
import { config } from '../config';
import { ElementSelector, SelectorCandidate } from '../types';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

/**
 * Repository for storing and retrieving element selectors
 */
export class SelectorRepository {
  private db: Database | null = null;
  private static instance: SelectorRepository;
  private initialized = false;

  private constructor() {
    // Database will be initialized asynchronously
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SelectorRepository {
    if (!SelectorRepository.instance) {
      SelectorRepository.instance = new SelectorRepository();
      // Auto-initialize in background
      SelectorRepository.instance.initialize().catch((err) => {
        logger.error('Failed to auto-initialize database:', err);
      });
    }
    return SelectorRepository.instance;
  }

  /**
   * Ensure database is initialized (sync check with lazy init)
   */
  private ensureInitialized(): void {
    if (!this.db && !this.initialized) {
      // Trigger async initialization if not already done
      this.initialize().catch((err) => {
        logger.error('Failed to initialize database:', err);
      });
      throw new Error('Database is initializing. Please wait and retry.');
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    const dbPath = config.database.path;
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    logger.info(`Database initialized at: ${dbPath}`);

    // Create selectors table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS selectors (
        id TEXT PRIMARY KEY,
        original_selector TEXT NOT NULL,
        strategy TEXT NOT NULL,
        page_url TEXT NOT NULL,
        element_attributes TEXT,
        timestamp INTEGER NOT NULL,
        success_rate REAL DEFAULT 1.0,
        last_used INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Create healing_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS healing_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        selector_id TEXT NOT NULL,
        original_selector TEXT NOT NULL,
        healed_selector TEXT,
        strategy TEXT,
        confidence REAL,
        success BOOLEAN NOT NULL,
        attempts INTEGER NOT NULL,
        reasoning TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (selector_id) REFERENCES selectors(id)
      )
    `);

    // Create alternative_selectors table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alternative_selectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        selector_id TEXT NOT NULL,
        alternative_selector TEXT NOT NULL,
        strategy TEXT NOT NULL,
        confidence REAL NOT NULL,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (selector_id) REFERENCES selectors(id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_selectors_page_url ON selectors(page_url);
      CREATE INDEX IF NOT EXISTS idx_healing_history_selector_id ON healing_history(selector_id);
      CREATE INDEX IF NOT EXISTS idx_alternative_selectors_selector_id ON alternative_selectors(selector_id);
    `);

    this.initialized = true;
    logger.info('Database schema initialized');
  }

  /**
   * Save database to disk
   */
  private saveToDisk(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
  }

  /**
   * Save element selector
   */
  saveSelector(selector: ElementSelector): void {
    this.ensureInitialized();
    
    this.db!.run(`
      INSERT OR REPLACE INTO selectors (
        id, original_selector, strategy, page_url, element_attributes,
        timestamp, success_rate, last_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      selector.id,
      selector.originalSelector,
      selector.strategy,
      selector.pageUrl,
      JSON.stringify(selector.elementAttributes),
      selector.timestamp,
      selector.successRate,
      selector.lastUsed,
      Date.now()
    ]);

    this.saveToDisk();
    logger.debug(`Selector saved: ${selector.id}`);
  }

  /**
   * Get selector by ID
   */
  getSelector(id: string): ElementSelector | null {
    this.ensureInitialized();
    
    const results = this.db!.exec(`
      SELECT * FROM selectors WHERE id = ?
    `, [id]);

    if (results.length === 0 || results[0].values.length === 0) return null;
    
    const row = results[0];
    const values = row.values[0];
    const columns = row.columns;
    const getCol = (name: string) => {
      const index = columns.indexOf(name);
      return index >= 0 ? values[index] : null;
    };

    return {
      id: getCol('id') as string,
      originalSelector: getCol('original_selector') as string,
      strategy: getCol('strategy') as any,
      pageUrl: getCol('page_url') as string,
      elementAttributes: JSON.parse((getCol('element_attributes') as string) || '{}'),
      timestamp: getCol('timestamp') as number,
      successRate: getCol('success_rate') as number,
      lastUsed: getCol('last_used') as number,
    };
  }

  /**
   * Update selector success rate
   */
  updateSuccessRate(id: string, success: boolean): void {
    this.ensureInitialized();
    const selector = this.getSelector(id);
    if (!selector) return;

    // Calculate new success rate using exponential moving average
    const alpha = 0.2;
    const newRate = success
      ? selector.successRate * (1 - alpha) + alpha
      : selector.successRate * (1 - alpha);

    this.db!.run(`
      UPDATE selectors
      SET success_rate = ?, last_used = ?
      WHERE id = ?
    `, [newRate, Date.now(), id]);

    this.saveToDisk();
    logger.debug(`Success rate updated for ${id}: ${(newRate * 100).toFixed(1)}%`);
  }

  /**
   * Save healing history
   */
  saveHealingHistory(history: {
    selectorId: string;
    originalSelector: string;
    healedSelector?: string;
    strategy?: string;
    confidence?: number;
    success: boolean;
    attempts: number;
    reasoning?: string;
  }): void {
    this.ensureInitialized();
    
    this.db!.run(`
      INSERT INTO healing_history (
        selector_id, original_selector, healed_selector, strategy,
        confidence, success, attempts, reasoning, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      history.selectorId,
      history.originalSelector,
      history.healedSelector || null,
      history.strategy || null,
      history.confidence || null,
      history.success ? 1 : 0,
      history.attempts,
      history.reasoning || null,
      Date.now()
    ]);

    this.saveToDisk();
  }

  /**
   * Save alternative selectors
   */
  saveAlternatives(selectorId: string, candidates: SelectorCandidate[]): void {
    this.ensureInitialized();
    
    for (const candidate of candidates) {
      this.db!.run(`
        INSERT INTO alternative_selectors (
          selector_id, alternative_selector, strategy, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        selectorId,
        candidate.selector,
        candidate.strategy,
        candidate.confidence,
        Date.now()
      ]);
    }

    this.saveToDisk();
    logger.debug(`Saved ${candidates.length} alternative selectors for ${selectorId}`);
  }

  /**
   * Get alternative selectors
   */
  getAlternatives(selectorId: string): SelectorCandidate[] {
    this.ensureInitialized();
    
    const results = this.db!.exec(`
      SELECT alternative_selector, strategy, confidence
      FROM alternative_selectors
      WHERE selector_id = ?
      ORDER BY confidence DESC, success_count DESC
    `, [selectorId]);

    if (results.length === 0) return [];

    const row = results[0];
    return row.values.map((values) => ({
      selector: values[0] as string,
      strategy: values[1] as any,
      confidence: values[2] as number,
      reasoning: 'Retrieved from database',
    }));
  }

  /**
   * Get healing statistics
   */
  getHealingStats(): {
    totalAttempts: number;
    successfulHeals: number;
    failedHeals: number;
    successRate: number;
  } {
    try {
      this.ensureInitialized();
    } catch {
      return {
        totalAttempts: 0,
        successfulHeals: 0,
        failedHeals: 0,
        successRate: 0,
      };
    }

    const results = this.db!.exec(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
      FROM healing_history
    `);

    if (results.length === 0 || results[0].values.length === 0) {
      return {
        totalAttempts: 0,
        successfulHeals: 0,
        failedHeals: 0,
        successRate: 0,
      };
    }

    const values = results[0].values[0];
    const total = values[0] as number || 0;
    const successful = values[1] as number || 0;

    return {
      totalAttempts: total,
      successfulHeals: successful,
      failedHeals: total - successful,
      successRate: total > 0 ? successful / total : 0,
    };
  }

  /**
   * Get detailed analysis data
   */
  getDetailedAnalysis(): {
    trends: {
      firstAttempt: string | null;
      lastAttempt: string | null;
      mostActiveHour: string | null;
    };
    confidenceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    byPage: Array<{
      pageUrl: string;
      attempts: number;
      successRate: number;
    }>;
  } {
    try {
      this.ensureInitialized();
    } catch {
      return {
        trends: { firstAttempt: null, lastAttempt: null, mostActiveHour: null },
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
        byPage: [],
      };
    }

    // Get trends
    const trendsResult = this.db!.exec(`
      SELECT 
        MIN(timestamp) as first_attempt,
        MAX(timestamp) as last_attempt
      FROM healing_history
    `);

    let firstAttempt = null;
    let lastAttempt = null;
    
    if (trendsResult.length > 0 && trendsResult[0].values.length > 0) {
      const values = trendsResult[0].values[0];
      firstAttempt = values[0] ? new Date(values[0] as number).toISOString() : null;
      lastAttempt = values[1] ? new Date(values[1] as number).toISOString() : null;
    }

    // Get confidence distribution
    const confResult = this.db!.exec(`
      SELECT 
        SUM(CASE WHEN confidence > 0.8 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN confidence >= 0.5 AND confidence <= 0.8 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN confidence < 0.5 AND confidence IS NOT NULL THEN 1 ELSE 0 END) as low
      FROM healing_history
      WHERE success = 1
    `);

    let confidenceDistribution = { high: 0, medium: 0, low: 0 };
    if (confResult.length > 0 && confResult[0].values.length > 0) {
      const values = confResult[0].values[0];
      confidenceDistribution = {
        high: values[0] as number || 0,
        medium: values[1] as number || 0,
        low: values[2] as number || 0,
      };
    }

    // Get page analysis
    const pageResult = this.db!.exec(`
      SELECT 
        s.page_url,
        COUNT(h.id) as attempts,
        CAST(SUM(CASE WHEN h.success = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(h.id) as success_rate
      FROM healing_history h
      JOIN selectors s ON h.selector_id = s.id
      WHERE s.page_url IS NOT NULL AND s.page_url != ''
      GROUP BY s.page_url
      ORDER BY attempts DESC
      LIMIT 10
    `);

    const byPage = pageResult.length > 0 ? pageResult[0].values.map((values) => ({
      pageUrl: values[0] as string,
      attempts: values[1] as number,
      successRate: values[2] as number || 0,
    })) : [];

    return {
      trends: { firstAttempt, lastAttempt, mostActiveHour: null },
      confidenceDistribution,
      byPage,
    };
  }

  /**
   * Get strategy analysis
   */
  getStrategyAnalysis(): Array<{
    strategy: string;
    count: number;
    successful: number;
    successRate: number;
  }> {
    try {
      this.ensureInitialized();
    } catch {
      return [];
    }

    const results = this.db!.exec(`
      SELECT 
        strategy,
        COUNT(*) as count,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as success_rate
      FROM healing_history
      WHERE strategy IS NOT NULL
      GROUP BY strategy
      ORDER BY success_rate DESC, count DESC
    `);

    if (results.length === 0) return [];

    return results[0].values.map((values) => ({
      strategy: values[0] as string,
      count: values[1] as number,
      successful: values[2] as number,
      successRate: values[3] as number || 0,
    }));
  }

  /**
   * Get top selectors
   */
  getTopSelectors(limit: number = 10): {
    successful: Array<{
      selector: string;
      successRate: number;
      usageCount: number;
    }>;
    failed: Array<{
      selector: string;
      failureCount: number;
      lastAttempt: number;
    }>;
  } {
    try {
      this.ensureInitialized();
    } catch {
      return { successful: [], failed: [] };
    }

    // Get top successful selectors
    const successfulResult = this.db!.exec(`
      SELECT 
        original_selector,
        success_rate,
        1 as usage_count
      FROM selectors
      WHERE success_rate > 0.5
      ORDER BY success_rate DESC, last_used DESC
      LIMIT ?
    `, [limit]);

    const successful = successfulResult.length > 0 ? successfulResult[0].values.map((values) => ({
      selector: values[0] as string,
      successRate: values[1] as number,
      usageCount: values[2] as number,
    })) : [];

    // Get top failed selectors
    const failedResult = this.db!.exec(`
      SELECT 
        h.original_selector,
        COUNT(*) as failure_count,
        MAX(h.timestamp) as last_attempt
      FROM healing_history h
      WHERE h.success = 0
      GROUP BY h.original_selector
      ORDER BY failure_count DESC
      LIMIT ?
    `, [limit]);

    const failed = failedResult.length > 0 ? failedResult[0].values.map((values) => ({
      selector: values[0] as string,
      failureCount: values[1] as number,
      lastAttempt: values[2] as number,
    })) : [];

    return { successful, failed };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.saveToDisk();
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('Database connection closed');
    }
  }
}
