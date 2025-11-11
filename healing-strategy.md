# Self-Healing Strategy

## Overview

This framework uses **AI-powered automatic recovery** when element selectors break during test execution. The self-healing mechanism combines caching, AI analysis, and intelligent selector generation to maintain test resilience.

---

## How Self-Healing Works

### **1. Detection Phase**

When a test tries to interact with an element and the selector fails:
- The `SelfHealingLocator` catches the error
- It triggers the healing engine instead of failing the test immediately
- The failure is logged with context (selector, page URL, error message)

### **2. Healing Strategies (in priority order)**

#### **a) Cache-First Approach (Fast Path)**
- Checks the SQLite database for previously successful alternatives for this selector
- Uses a unique selector ID based on selector + page URL
- If cached alternatives exist, tries them first for immediate recovery
- **Benefit**: Sub-second recovery time, no API calls needed

#### **b) AI-Powered Generation (Intelligent Path)**

If no cached alternatives work, the LLM (GPT-4) generates new selectors through:

**Context Collection:**
- Analyzes the current page DOM (up to 15KB of HTML)
- Extracts element context:
  - **Attributes**: id, class, data-* attributes, role, etc.
  - **Text content**: visible text, labels, placeholders
  - **Position**: viewport coordinates (x, y)
- Captures the error message for root cause analysis

**AI Analysis:**
The LLM receives a structured prompt containing:
- Original failed selector
- Error message
- Element context (if partially matched)
- Relevant page HTML
- Task: Generate alternative selectors

**Selector Generation:**
The AI generates multiple selector candidates using different strategies:

1. **CSS Selectors** - Class/ID based
   - Example: `#email-input`, `.login-form input[type="email"]`
   
2. **XPath** - Structural path
   - Example: `//input[@name='email']`, `//div[@class='form']//input[1]`
   
3. **Text-based** - Content matching
   - Example: `text="Email"`, `label:has-text("Email") >> input`
   
4. **Attribute-based** - Data attributes
   - Example: `[data-testid="email-field"]`, `[aria-label="Email address"]`
   
5. **Structural** - Parent/sibling relationships
   - Example: `form.login >> input >> nth=0`, `div.container > input:first-child`

Each candidate includes:
- `selector`: The actual selector string
- `strategy`: Which approach was used
- `confidence`: Score from 0-1 indicating reliability
- `reasoning`: Explanation of why this selector should work

### **3. Selection & Validation**

For each generated candidate (up to `maxAttempts` config):
- Tests the selector on the current page
- Validates it finds **exactly 1 element** (prevents ambiguity)
- Skips selectors that match 0 or multiple elements
- Ranks by confidence score
- Returns the **first working selector** with highest confidence

**Success Criteria:**
- Selector must match exactly 1 element
- Element must be the correct target (verified by context)
- Confidence score typically > 0.7

### **4. Persistence & Learning**

When healing succeeds:
- **Saves to Database**: Stores the healed selector for future use
- **Updates Success Rates**: Tracks performance metrics
- **Caches Alternatives**: Makes them available for next failure
- **Records History**: Logs the healing attempt with:
  - Original selector
  - Healed selector
  - Strategy used
  - Confidence score
  - Number of attempts
  - Reasoning
  - Timestamp

When healing fails:
- Records the failure for analysis
- All attempted candidates are logged
- Can be reviewed in healing reports

### **5. Usage in Tests**

**Traditional Playwright:**
```typescript
await page.locator('#email').fill('test@example.com');
```

**With Self-Healing:**
```typescript
await selfHealingPage.healingLocator('#email').fill('test@example.com');
```

**Available Methods:**
- `click()` - Click with healing
- `fill()` - Fill input with healing
- `textContent()` - Get text with healing
- `isVisible()` - Check visibility with healing
- `waitFor()` - Wait for element with healing

---

## Architecture Components

### **SelfHealingEngine**
- Core healing logic
- Coordinates between LLM, cache, and validation
- Singleton pattern for shared state

### **LLMClient**
- OpenAI/Azure OpenAI integration
- Structured prompts for selector generation
- JSON response parsing

### **SelectorRepository**
- SQLite database for persistence
- Tables:
  - `selectors` - Original and healed selectors
  - `healing_history` - All healing attempts
  - `alternative_selectors` - Cached alternatives
- Tracks success rates and usage statistics

### **SelfHealingLocator**
- Extends Playwright's locator API
- Transparent healing integration
- Automatic fallback to healing on failure

---

## Configuration

### **Healing Modes**

```env
HEALING_MODE=auto    # Automatic healing (default)
HEALING_MODE=manual  # Requires confirmation
HEALING_MODE=disabled # No healing
```

### **LLM Configuration**

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=2000
```

### **Healing Parameters**

```typescript
healing: {
  mode: 'auto',
  maxAttempts: 5,        // Max alternatives to try
  cacheResults: true,    // Cache successful healings
  timeout: 30000,        // Healing timeout (ms)
}
```

---

## Key Benefits

✅ **Automatic Recovery** - No manual intervention needed when selectors break  
✅ **Intelligent Alternatives** - AI understands DOM semantics and structure  
✅ **Fast Caching** - Reuses successful alternatives for instant recovery  
✅ **Learning System** - Improves over time with success rate tracking  
✅ **Comprehensive Logging** - Tracks all healing attempts for debugging  
✅ **Multiple Strategies** - Increases success rate with diverse approaches  
✅ **Context-Aware** - Considers page state, element attributes, and position  
✅ **Production-Ready** - Database persistence, error handling, timeouts  

---

## Example Healing Flow

1. **Test runs**: `page.healingLocator('#old-selector').click()`
2. **Selector fails**: Element not found
3. **Cache check**: No cached alternatives found
4. **AI generation**: LLM analyzes DOM and generates 5 candidates:
   - `[data-testid="submit-btn"]` (confidence: 0.95)
   - `button.primary` (confidence: 0.85)
   - `//button[text()="Submit"]` (confidence: 0.80)
   - `form >> button >> nth=0` (confidence: 0.75)
   - `button#submit` (confidence: 0.70)
5. **Validation**: First candidate works (finds exactly 1 element)
6. **Success**: Click executes using healed selector
7. **Persistence**: Saves to database for future use
8. **Logging**: Records complete healing history

Next time the test runs, the cached alternative is used immediately!

---

## Reports & Analytics

The framework generates detailed reports:

- **healing-report.json** - Structured data for programmatic analysis
- **healing-report.md** - Human-readable markdown report
- **Metrics tracked**:
  - Total healing attempts
  - Success/failure rates
  - Average confidence scores
  - Strategy effectiveness
  - Time to heal
  - Cache hit rates

---

## Best Practices

1. **Use semantic selectors** - Start with data-testid, aria-labels
2. **Monitor healing reports** - Identify patterns in failures
3. **Update tests** - Replace healed selectors in code when stable
4. **Review AI suggestions** - Learn what makes selectors resilient
5. **Configure appropriately** - Adjust maxAttempts based on your needs
6. **Keep cache fresh** - Periodically clean old alternatives
7. **Test across browsers** - Healing works for all Playwright browsers

---

## Limitations

- Requires valid OpenAI/Azure OpenAI API key
- Adds latency on first failure (LLM call ~2-5 seconds)
- May not heal complex dynamic content without sufficient context
- Confidence scores are estimates, not guarantees
- Database grows over time (implement cleanup strategy)

---

## Future Enhancements

- Visual AI for image-based element identification
- Multi-page selector optimization
- Predictive healing before failures occur
- Integration with CI/CD for automatic test updates
- Advanced analytics dashboard
- Support for additional LLM providers
