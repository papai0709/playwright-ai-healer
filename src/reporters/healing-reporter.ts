import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { SelectorRepository } from '../healing/selector-repository';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Custom reporter for self-healing statistics
 */
export default class HealingReporter implements Reporter {
  private healingEvents: Array<{
    test: string;
    selector: string;
    healed: boolean;
    timestamp: number;
  }> = [];

  onBegin(config: FullConfig, suite: Suite) {
    logger.info('🧪 Starting test run with self-healing framework');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Test completed - we'll collect healing stats after all tests
  }

  async onEnd(result: FullResult) {
    logger.info('\n📊 Generating self-healing report...');

    try {
      const repository = SelectorRepository.getInstance();
      const stats = repository.getHealingStats();
      const detailedAnalysis = repository.getDetailedAnalysis();
      const strategyAnalysis = repository.getStrategyAnalysis();
      const topSelectors = repository.getTopSelectors(10);

      const report = {
        summary: {
          totalAttempts: stats.totalAttempts,
          successfulHeals: stats.successfulHeals,
          failedHeals: stats.failedHeals,
          successRate: `${(stats.successRate * 100).toFixed(2)}%`,
          avgAttemptsPerHeal: stats.totalAttempts > 0 
            ? (stats.totalAttempts / (stats.successfulHeals + stats.failedHeals)).toFixed(2)
            : '0',
        },
        analysis: {
          strategies: strategyAnalysis,
          topSuccessfulSelectors: topSelectors.successful,
          topFailedSelectors: topSelectors.failed,
          healingTrends: detailedAnalysis.trends,
          confidenceDistribution: detailedAnalysis.confidenceDistribution,
          pageAnalysis: detailedAnalysis.byPage,
        },
        timestamp: new Date().toISOString(),
        testRun: {
          status: result.status,
          duration: result.duration,
          durationMinutes: (result.duration / 60000).toFixed(2),
        },
        recommendations: this.generateRecommendations(stats, strategyAnalysis, detailedAnalysis),
      };

      // Write JSON report
      const reportDir = path.join(process.cwd(), 'test-results');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const reportPath = path.join(reportDir, 'healing-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      // Write Markdown report
      const mdReportPath = path.join(reportDir, 'healing-report.md');
      const mdReport = this.generateMarkdownReport(report, stats, strategyAnalysis, detailedAnalysis, topSelectors);
      fs.writeFileSync(mdReportPath, mdReport);

      // Print summary to console
      this.printConsoleSummary(stats, strategyAnalysis, reportPath);

      logger.info('Healing report generated successfully');
    } catch (error) {
      logger.error('Error generating healing report:', error);
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(stats: any, strategyAnalysis: any, detailedAnalysis: any): string[] {
    const recommendations: string[] = [];

    // Low success rate
    if (stats.successRate < 0.5) {
      recommendations.push('⚠️ Success rate is below 50%. Consider reviewing selector stability and page structure changes.');
    }

    // Strategy recommendations
    if (strategyAnalysis.length > 0) {
      const bestStrategy = strategyAnalysis[0];
      if (bestStrategy.successRate > 0.8) {
        recommendations.push(`✅ ${bestStrategy.strategy} strategy has the highest success rate (${(bestStrategy.successRate * 100).toFixed(1)}%). Consider prioritizing this strategy.`);
      }
    }

    // Confidence distribution
    if (detailedAnalysis.confidenceDistribution.low > detailedAnalysis.confidenceDistribution.high) {
      recommendations.push('⚠️ More low-confidence heals detected. Consider improving selector stability or updating test selectors.');
    }

    // General recommendations
    if (stats.totalAttempts === 0) {
      recommendations.push('ℹ️ No healing attempts recorded. Selectors appear stable or healing was not triggered.');
    } else if (stats.totalAttempts > 20) {
      recommendations.push('⚠️ High number of healing attempts. Consider reviewing and updating frequently broken selectors.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Framework is performing well. Continue monitoring healing metrics.');
    }

    return recommendations;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(
    report: any,
    stats: any,
    strategyAnalysis: any,
    detailedAnalysis: any,
    topSelectors: any
  ): string {
    let md = '# Self-Healing Test Framework Report\n\n';
    md += `**Generated:** ${report.timestamp}\n\n`;
    md += `**Test Run Status:** ${report.testRun.status}\n`;
    md += `**Duration:** ${report.testRun.durationMinutes} minutes\n\n`;
    md += '---\n\n';

    // Summary
    md += '## 📊 Executive Summary\n\n';
    md += `- **Total Healing Attempts:** ${stats.totalAttempts}\n`;
    md += `- **Successful Heals:** ${stats.successfulHeals}\n`;
    md += `- **Failed Heals:** ${stats.failedHeals}\n`;
    md += `- **Success Rate:** ${(stats.successRate * 100).toFixed(2)}%\n`;
    md += `- **Average Attempts per Heal:** ${report.summary.avgAttemptsPerHeal}\n\n`;

    // Strategy Analysis
    md += '## 🎯 Healing Strategy Performance\n\n';
    if (strategyAnalysis.length > 0) {
      md += '| Strategy | Total Uses | Successful | Success Rate |\n';
      md += '|----------|------------|------------|-------------|\n';
      strategyAnalysis.forEach((s: any) => {
        md += `| ${s.strategy} | ${s.count} | ${s.successful} | ${(s.successRate * 100).toFixed(1)}% |\n`;
      });
    } else {
      md += '*No strategy data available*\n';
    }
    md += '\n';

    // Confidence Distribution
    md += '## 📈 Confidence Distribution\n\n';
    md += `- **High Confidence (>0.8):** ${detailedAnalysis.confidenceDistribution.high}\n`;
    md += `- **Medium Confidence (0.5-0.8):** ${detailedAnalysis.confidenceDistribution.medium}\n`;
    md += `- **Low Confidence (<0.5):** ${detailedAnalysis.confidenceDistribution.low}\n\n`;

    // Top Selectors
    md += '## ✅ Top Successful Selectors\n\n';
    if (topSelectors.successful.length > 0) {
      md += '| Original Selector | Success Rate | Times Used |\n';
      md += '|-------------------|--------------|------------|\n';
      topSelectors.successful.forEach((s: any) => {
        md += `| \`${s.selector.substring(0, 50)}${s.selector.length > 50 ? '...' : ''}\` | ${(s.successRate * 100).toFixed(1)}% | ${s.usageCount} |\n`;
      });
    } else {
      md += '*No data available*\n';
    }
    md += '\n';

    // Failed Selectors
    if (topSelectors.failed.length > 0) {
      md += '## ❌ Top Failed Selectors\n\n';
      md += '| Original Selector | Failures | Last Attempt |\n';
      md += '|-------------------|----------|-------------|\n';
      topSelectors.failed.forEach((s: any) => {
        const date = new Date(s.lastAttempt).toLocaleString();
        md += `| \`${s.selector.substring(0, 50)}${s.selector.length > 50 ? '...' : ''}\` | ${s.failureCount} | ${date} |\n`;
      });
      md += '\n';
    }

    // Page Analysis
    md += '## 🌐 Page-wise Analysis\n\n';
    if (detailedAnalysis.byPage.length > 0) {
      md += '| Page URL | Healing Attempts | Success Rate |\n';
      md += '|----------|------------------|-------------|\n';
      detailedAnalysis.byPage.forEach((p: any) => {
        md += `| ${p.pageUrl.substring(0, 60)}${p.pageUrl.length > 60 ? '...' : ''} | ${p.attempts} | ${(p.successRate * 100).toFixed(1)}% |\n`;
      });
    } else {
      md += '*No page data available*\n';
    }
    md += '\n';

    // Recommendations
    md += '## 💡 Recommendations\n\n';
    report.recommendations.forEach((rec: string) => {
      md += `- ${rec}\n`;
    });
    md += '\n';

    // Trends
    md += '## 📉 Healing Trends\n\n';
    md += `- **First Healing Attempt:** ${detailedAnalysis.trends.firstAttempt || 'N/A'}\n`;
    md += `- **Last Healing Attempt:** ${detailedAnalysis.trends.lastAttempt || 'N/A'}\n`;
    md += `- **Most Active Hour:** ${detailedAnalysis.trends.mostActiveHour || 'N/A'}\n\n`;

    md += '---\n\n';
    md += '*Report generated by Self-Healing Test Framework*\n';

    return md;
  }

  /**
   * Print console summary
   */
  private printConsoleSummary(stats: any, strategyAnalysis: any, reportPath: string) {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║         Self-Healing Test Framework Report          ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log(`\n  📊 SUMMARY`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Total Healing Attempts:   ${stats.totalAttempts}`);
    console.log(`  Successful Heals:         ${stats.successfulHeals}`);
    console.log(`  Failed Heals:             ${stats.failedHeals}`);
    console.log(`  Success Rate:             ${(stats.successRate * 100).toFixed(2)}%`);

    if (strategyAnalysis.length > 0) {
      console.log(`\n  🎯 TOP STRATEGY`);
      console.log(`  ─────────────────────────────────────────────────────`);
      const top = strategyAnalysis[0];
      console.log(`  Strategy:                 ${top.strategy}`);
      console.log(`  Success Rate:             ${(top.successRate * 100).toFixed(1)}%`);
      console.log(`  Times Used:               ${top.count}`);
    }

    console.log(`\n  📁 REPORTS GENERATED`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  MD:   ${reportPath.replace('.json', '.md')}`);
    console.log('');
  }
}

