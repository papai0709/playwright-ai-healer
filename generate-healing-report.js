const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'selectors.db');
const db = new Database(dbPath, { readonly: true });

// Get healing history
const healingHistory = db.prepare(`
  SELECT * FROM healing_history 
  ORDER BY timestamp DESC 
  LIMIT 50
`).all();

// Get healing statistics
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total_attempts,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_heals,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_heals,
    AVG(CASE WHEN success = 1 THEN confidence ELSE NULL END) as avg_confidence,
    AVG(attempts) as avg_attempts
  FROM healing_history
`).get();

// Get strategy performance
const strategyStats = db.prepare(`
  SELECT 
    strategy,
    COUNT(*) as total_uses,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
    AVG(confidence) as avg_confidence
  FROM healing_history
  WHERE strategy IS NOT NULL
  GROUP BY strategy
  ORDER BY successes DESC
`).all();

// Generate Markdown Report
const report = `# Comprehensive Self-Healing Report

**Generated:** ${new Date().toISOString()}

---

## 📊 Overall Statistics

- **Total Healing Attempts:** ${stats.total_attempts}
- **Successful Heals:** ${stats.successful_heals}
- **Failed Heals:** ${stats.failed_heals}
- **Success Rate:** ${((stats.successful_heals / stats.total_attempts) * 100).toFixed(2)}%
- **Average Confidence:** ${(stats.avg_confidence * 100).toFixed(2)}%
- **Average Attempts per Heal:** ${stats.avg_attempts.toFixed(2)}

---

## 🎯 Strategy Performance

${strategyStats.map(s => `
### ${s.strategy || 'Unknown Strategy'}
- Total Uses: ${s.total_uses}
- Successes: ${s.successes}
- Success Rate: ${((s.successes / s.total_uses) * 100).toFixed(2)}%
- Average Confidence: ${(s.avg_confidence * 100).toFixed(2)}%
`).join('\n')}

---

## 📋 Recent Healing Attempts (Last 50)

${healingHistory.map((h, i) => `
### ${i + 1}. ${h.success ? '✅' : '❌'} ${h.original_selector}

- **Healed Selector:** \`${h.healed_selector || 'N/A'}\`
- **Strategy:** ${h.strategy || 'N/A'}
- **Confidence:** ${h.confidence ? (h.confidence * 100).toFixed(1) + '%' : 'N/A'}
- **Attempts:** ${h.attempts}
- **Notes:** ${h.notes || 'N/A'}
- **Timestamp:** ${new Date(h.timestamp).toLocaleString()}
`).join('\n')}

---

*Report generated from database: ${dbPath}*
`;

// Save report
const reportPath = path.join(__dirname, 'healing-report-comprehensive.md');
fs.writeFileSync(reportPath, report);

console.log(`\n✅ Comprehensive healing report generated!`);
console.log(`📄 Report saved to: ${reportPath}\n`);
console.log(`📊 Quick Summary:`);
console.log(`   Total Attempts: ${stats.total_attempts}`);
console.log(`   Successful: ${stats.successful_heals}`);
console.log(`   Failed: ${stats.failed_heals}`);
console.log(`   Success Rate: ${((stats.successful_heals / stats.total_attempts) * 100).toFixed(2)}%\n`);

db.close();
