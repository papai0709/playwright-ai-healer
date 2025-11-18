/**
 * TOON (Token-Oriented Object Notation) Parser
 * 
 * A token-efficient serialization format designed for LLM communication.
 * Reduces token usage by 30-40% compared to JSON.
 * 
 * Format:
 * - key:value pairs separated by spaces
 * - Nested objects use {} without quotes
 * - Arrays use [] without quotes
 * - Strings without special characters don't need quotes
 * - Special characters use quotes: "value with spaces"
 * 
 * Examples:
 * JSON: {"selector": "#email", "confidence": 0.95, "strategy": "css"}
 * TOON: selector:#email confidence:0.95 strategy:css
 * 
 * JSON: {"selectors": [{"old": "#btn", "new": "#submit"}]}
 * TOON: selectors:[{old:#btn new:#submit}]
 */

export interface ToonValue {
  [key: string]: any;
}

/**
 * Encodes a JavaScript object to TOON format
 */
export function encodeToon(obj: any): string {
  if (obj === null || obj === undefined) {
    return '';
  }

  if (typeof obj === 'string') {
    // Check if string needs quotes (contains spaces, special chars, or starts with digit)
    if (/[\s,:\[\]{}]/.test(obj) || /^\d/.test(obj)) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const encoded = obj.map(item => encodeToon(item)).join(' ');
    return `[${encoded}]`;
  }

  if (typeof obj === 'object') {
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const encodedValue = encodeToon(value);
      pairs.push(`${key}:${encodedValue}`);
    }
    return pairs.length > 0 ? pairs.join(' ') : '';
  }

  return String(obj);
}

/**
 * Decodes TOON format to JavaScript object
 */
export function decodeToon(toon: string): ToonValue {
  if (!toon || typeof toon !== 'string') {
    return {};
  }

  const trimmed = toon.trim();
  
  // Handle edge cases
  if (trimmed === '[]') return [];
  if (trimmed === '{}') return {};
  
  // Tokenize the input
  const tokens = tokenize(trimmed);
  const result = parse(tokens);
  
  return result.value;
}

/**
 * Tokenize TOON string into tokens
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (inQuotes) {
        tokens.push(`"${current}"`);
        current = '';
        inQuotes = false;
      } else {
        if (current) tokens.push(current);
        current = '';
        inQuotes = true;
      }
      continue;
    }

    if (inQuotes) {
      current += char;
      continue;
    }

    // Handle special characters outside quotes
    if ([' ', '\t', '\n', '\r'].includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    if (['[', ']', '{', '}', ':'].includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse tokens into value
 */
function parse(tokens: string[]): { value: any; consumed: number } {
  if (tokens.length === 0) {
    return { value: {}, consumed: 0 };
  }

  const first = tokens[0];

  // Handle array
  if (first === '[') {
    const items: any[] = [];
    let i = 1;
    
    while (i < tokens.length && tokens[i] !== ']') {
      if (tokens[i] === '{') {
        const objResult = parseObject(tokens.slice(i));
        items.push(objResult.value);
        i += objResult.consumed;
      } else if (tokens[i] === '[') {
        const arrResult = parse(tokens.slice(i));
        items.push(arrResult.value);
        i += arrResult.consumed;
      } else {
        items.push(parseValue(tokens[i]));
        i++;
      }
    }
    
    return { value: items, consumed: i + 1 };
  }

  // Handle object (key:value pairs)
  if (first === '{') {
    return parseObject(tokens);
  }

  // Handle key:value pairs at root level
  return parseObject(tokens);
}

/**
 * Parse object (key:value pairs)
 */
function parseObject(tokens: string[]): { value: any; consumed: number } {
  const obj: ToonValue = {};
  let i = 0;

  // Skip opening brace if present
  if (tokens[i] === '{') {
    i++;
  }

  while (i < tokens.length) {
    if (tokens[i] === '}') {
      i++;
      break;
    }

    // Expect key
    const key = tokens[i];
    if (!key || key === ':') {
      i++;
      continue;
    }

    i++;

    // Expect colon
    if (i >= tokens.length || tokens[i] !== ':') {
      // No colon found, treat as standalone value
      obj[key] = true;
      continue;
    }

    i++; // Skip colon

    // Parse value
    if (i >= tokens.length) {
      obj[key] = null;
      break;
    }

    const valueToken = tokens[i];

    if (valueToken === '[') {
      const arrResult = parse(tokens.slice(i));
      obj[key] = arrResult.value;
      i += arrResult.consumed;
    } else if (valueToken === '{') {
      const objResult = parseObject(tokens.slice(i));
      obj[key] = objResult.value;
      i += objResult.consumed;
    } else {
      obj[key] = parseValue(valueToken);
      i++;
    }
  }

  return { value: obj, consumed: i };
}

/**
 * Parse a primitive value
 */
function parseValue(token: string): any {
  if (!token) return null;

  // Handle quoted strings
  if (token.startsWith('"') && token.endsWith('"')) {
    return token.slice(1, -1).replace(/\\"/g, '"');
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return parseFloat(token);
  }

  // Handle booleans
  if (token === 'true') return true;
  if (token === 'false') return false;

  // Handle null
  if (token === 'null') return null;

  // Return as string
  return token;
}

/**
 * Encode healing request to TOON format
 */
export function encodeHealingRequest(data: {
  brokenSelector: string;
  htmlContext: string;
  pageUrl?: string;
}): string {
  return encodeToon({
    broken: data.brokenSelector,
    html: data.htmlContext,
    ...(data.pageUrl && { url: data.pageUrl })
  });
}

/**
 * Decode healing response from TOON format
 */
export function decodeHealingResponse(toon: string): {
  selector: string;
  confidence: number;
  strategy: string;
  reasoning?: string;
} {
  const decoded = decodeToon(toon);
  
  return {
    selector: decoded.selector || decoded.sel || '',
    confidence: typeof decoded.confidence === 'number' ? decoded.confidence : parseFloat(decoded.confidence || decoded.conf || '0.5'),
    strategy: decoded.strategy || decoded.strat || 'css',
    reasoning: decoded.reasoning || decoded.reason
  };
}

/**
 * Encode batch healing request to TOON format
 */
export function encodeBatchHealingRequest(data: {
  selectors: string[];
  htmlContext: string;
  pageUrl?: string;
}): string {
  return encodeToon({
    selectors: data.selectors,
    html: data.htmlContext,
    ...(data.pageUrl && { url: data.pageUrl })
  });
}

/**
 * Decode batch healing response from TOON format
 */
export function decodeBatchHealingResponse(toon: string): Array<{
  selector: string;
  confidence: number;
  strategy: string;
  reasoning?: string;
}> {
  const decoded = decodeToon(toon);
  
  if (!decoded.results && !decoded.res) {
    return [];
  }

  const results = decoded.results || decoded.res || [];
  
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((item: any) => ({
    selector: item.selector || item.sel || '',
    confidence: typeof item.confidence === 'number' ? item.confidence : (typeof item.conf === 'number' ? item.conf : parseFloat(item.confidence || item.conf || '0.5')),
    strategy: item.strategy || item.strat || 'css',
    reasoning: item.reasoning || item.reason
  }));
}
