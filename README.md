# Self-Healing Test Automation Framework

A production-ready test automation framework with self-healing capabilities using MCP Server, LLM (OpenAI/Azure), and Playwright for the Amazon India sign-in page.

## 🚀 Features

- **Self-Healing Selectors**: Automatically recovers from broken element locators using AI
- **MCP Server Integration**: Model Context Protocol server for DOM analysis
- **LLM-Powered**: Uses GPT-4 or Azure OpenAI for intelligent selector generation
- **Multiple Healing Strategies**: CSS, XPath, text-based, attribute-based, and structural selectors
- **Selector Repository**: SQLite database for caching and tracking selector success rates
- **Comprehensive Reporting**: Detailed healing statistics and test reports
- **TypeScript**: Fully typed for better development experience
- **Playwright**: Modern, reliable browser automation

## 📋 Prerequisites

- Node.js 18+ or 20+
- npm, yarn, or pnpm
- OpenAI API key or Azure OpenAI access

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o
   HEALING_MODE=auto
   ```

## 🏗️ Project Structure

```
.
├── src/
│   ├── config/              # Configuration and setup
│   │   ├── index.ts         # Main configuration
│   │   ├── global-setup.ts  # Test setup
│   │   └── global-teardown.ts
│   ├── fixtures/            # Playwright fixtures
│   │   └── self-healing-fixtures.ts
│   ├── healing/             # Self-healing engine
│   │   ├── self-healing-engine.ts
│   │   └── selector-repository.ts
│   ├── llm/                 # LLM integration
│   │   └── client.ts
│   ├── mcp-server/          # MCP server
│   │   └── index.ts
│   ├── reporters/           # Custom reporters
│   │   └── healing-reporter.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   └── utils/               # Utilities
│       ├── helpers.ts
│       └── logger.ts
├── tests/                   # Test files
│   ├── amazon-signin.spec.ts
│   └── examples.spec.ts
├── playwright.config.ts     # Playwright configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies
└── README.md               # This file
```

## 📖 Usage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Run tests with UI mode
npm run test:ui

# Run specific test file
npx playwright test tests/amazon-signin.spec.ts
```

### Building the Project

```bash
# Compile TypeScript
npm run build

# Watch mode for development
npm run build:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### View Reports

```bash
# Open HTML report
npm run report

# Healing report is at: test-results/healing-report.json
```

## 🧪 Writing Tests with Self-Healing

### Basic Example

```typescript
import { test, expect } from '../src/fixtures/self-healing-fixtures';

test('my test', async ({ selfHealingPage }) => {
  await selfHealingPage.goto('https://www.amazon.in');
  
  // Use healingLocator for self-healing capabilities
  const searchBox = selfHealingPage.healingLocator('#twotabsearchtextbox');
  await searchBox.fill('laptop');
  await searchBox.click();
});
```

### Advanced Usage

```typescript
test('advanced example', async ({ selfHealingPage }) => {
  await selfHealingPage.goto('https://www.amazon.in');
  
  // Self-healing locator with multiple actions
  const signInButton = selfHealingPage.healingLocator('#nav-link-accountList');
  
  // Wait for element (with auto-healing)
  await signInButton.waitFor({ state: 'visible' });
  
  // Click (with auto-healing)
  await signInButton.click();
  
  // Check visibility (with auto-healing)
  const isVisible = await signInButton.isVisible();
  expect(isVisible).toBe(true);
});
```

## ⚙️ Configuration

### Healing Modes

Set `HEALING_MODE` in `.env`:

- **`auto`**: Automatically applies healed selectors (recommended)
- **`manual`**: Suggests healed selectors but requires confirmation
- **`disabled`**: Disables self-healing

### Healing Parameters

```env
HEALING_CONFIDENCE_THRESHOLD=0.75  # Minimum confidence (0-1)
HEALING_MAX_ATTEMPTS=3             # Max healing attempts per selector
HEALING_AUTO_APPLY=true            # Auto-apply healed selectors
```

### LLM Configuration

#### OpenAI
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
```

#### Azure OpenAI
```env
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## 🔍 How It Works

1. **Test Execution**: Playwright runs tests using custom fixtures
2. **Failure Detection**: When a selector fails, the healing engine is triggered
3. **Context Extraction**: Page HTML and element context are extracted
4. **LLM Analysis**: GPT-4 analyzes the DOM and generates alternative selectors
5. **Validation**: Each alternative is tested against the live page
6. **Selection**: The best working selector (highest confidence) is chosen
7. **Caching**: Successful alternatives are cached in SQLite for future use
8. **Reporting**: All healing attempts are logged and reported

## 📊 Self-Healing Strategies

The framework employs multiple strategies:

1. **CSS Selectors**: Class-based, ID-based, attribute-based
2. **XPath**: Absolute and relative paths
3. **Text-based**: Using visible text content
4. **Attribute-based**: data-testid, aria-label, name, etc.
5. **Structural**: Parent-child relationships
6. **AI-Visual**: (Future) Computer vision-based

## 🗄️ Database Schema

Selector data is stored in SQLite (`data/selectors.db`):

- **selectors**: Original and healed selectors with success rates
- **healing_history**: All healing attempts and outcomes
- **alternative_selectors**: Cached alternative selectors

## 🐳 Docker Support

Build and run:
```bash
docker build -t self-healing-tests .
docker run --env-file .env self-healing-tests
```

Or with docker-compose:
```bash
docker-compose up
```

## 📈 Monitoring & Reports

### Healing Report

After test execution, view the healing report:

```bash
cat test-results/healing-report.json
```

Example output:
```json
{
  "summary": {
    "totalAttempts": 15,
    "successfulHeals": 12,
    "failedHeals": 3,
    "successRate": "80.00%"
  },
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

### Logs

Logs are written to `logs/framework.log` (if enabled in `.env`).

## 🆘 Troubleshooting

### Issue: Tests failing with "Cannot find module"
**Solution**: Run `npm install` and `npm run build`

### Issue: Healing not working
**Solution**: 
1. Check your OpenAI API key in `.env`
2. Verify `HEALING_MODE=auto`
3. Check logs in `logs/framework.log`

### Issue: Database locked errors
**Solution**: Close all connections and delete `data/selectors.db`, it will be recreated

### Issue: LLM rate limits
**Solution**: 
1. Reduce concurrent tests
2. Add retry logic
3. Use Azure OpenAI for higher limits

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenAI API](https://platform.openai.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 💡 Best Practices

1. **Use Stable Selectors**: Start with `data-testid`, IDs, or semantic HTML
2. **Monitor Success Rates**: Review healing reports regularly
3. **Cache Alternatives**: Let the framework learn over time
4. **Review Healed Selectors**: Periodically check if healed selectors are optimal
5. **Limit LLM Calls**: Use cached alternatives when possible

## 🎯 Next Steps

1. Copy `.env.example` to `.env` and add your OpenAI API key
2. Run `npm install` to install dependencies
3. Run `npx playwright install` to install browsers
4. Run `npm run build` to compile TypeScript
5. Run `npm test` to execute tests

---

Built with ❤️ for robust test automation
# playwright-ai-healer
