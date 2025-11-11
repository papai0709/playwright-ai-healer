import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * MCP Server for DOM analysis and element healing
 */
export class MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: config.mcp.name,
        version: config.mcp.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP server handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_dom',
            description: 'Analyze DOM structure and extract element information',
            inputSchema: {
              type: 'object',
              properties: {
                html: {
                  type: 'string',
                  description: 'HTML content to analyze',
                },
              },
              required: ['html'],
            },
          },
          {
            name: 'find_element',
            description: 'Find element using various selector strategies',
            inputSchema: {
              type: 'object',
              properties: {
                html: {
                  type: 'string',
                  description: 'HTML content',
                },
                selector: {
                  type: 'string',
                  description: 'Element selector',
                },
              },
              required: ['html', 'selector'],
            },
          },
          {
            name: 'generate_selectors',
            description: 'Generate alternative selectors for an element',
            inputSchema: {
              type: 'object',
              properties: {
                html: {
                  type: 'string',
                  description: 'HTML content',
                },
                attributes: {
                  type: 'object',
                  description: 'Element attributes',
                },
                text: {
                  type: 'string',
                  description: 'Element text content',
                },
              },
              required: ['html'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args) {
          throw new Error('Missing arguments');
        }

        switch (name) {
          case 'analyze_dom':
            return await this.analyzeDom(args.html as string);
          
          case 'find_element':
            return await this.findElement(
              args.html as string,
              args.selector as string
            );
          
          case 'generate_selectors':
            return await this.generateSelectors(
              args.html as string,
              args.attributes as Record<string, string>,
              args.text as string
            );
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        throw error;
      }
    });
  }

  /**
   * Analyze DOM structure
   */
  private async analyzeDom(html: string) {
    // Use JSDOM or similar to parse HTML
    const stats = {
      totalElements: (html.match(/<[^/][^>]*>/g) || []).length,
      uniqueIds: (html.match(/id="[^"]+"/g) || []).length,
      commonClasses: this.extractCommonClasses(html),
      landmarks: this.extractLandmarks(html),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  /**
   * Find element in HTML
   */
  private async findElement(html: string, selector: string) {
    // Simplified element finding
    const matches = html.match(new RegExp(`<[^>]*${selector}[^>]*>`, 'g')) || [];
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            found: matches.length > 0,
            count: matches.length,
            matches: matches.slice(0, 3),
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Generate alternative selectors
   */
  private async generateSelectors(
    html: string,
    attributes?: Record<string, string>,
    text?: string
  ) {
    const selectors: string[] = [];

    // Generate CSS selectors based on attributes
    if (attributes) {
      if (attributes.id) {
        selectors.push(`#${attributes.id}`);
      }
      if (attributes.class) {
        const classes = attributes.class.split(' ').filter(Boolean);
        selectors.push(`.${classes.join('.')}`);
      }
      if (attributes['data-testid']) {
        selectors.push(`[data-testid="${attributes['data-testid']}"]`);
      }
      if (attributes.name) {
        selectors.push(`[name="${attributes.name}"]`);
      }
    }

    // Generate text-based selector
    if (text) {
      selectors.push(`text=${text}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ selectors }, null, 2),
        },
      ],
    };
  }

  /**
   * Extract common classes from HTML
   */
  private extractCommonClasses(html: string): string[] {
    const classMatches = html.match(/class="([^"]+)"/g) || [];
    const classCount: Record<string, number> = {};

    classMatches.forEach((match) => {
      const classes = match.replace(/class="|"/g, '').split(' ');
      classes.forEach((cls) => {
        if (cls) {
          classCount[cls] = (classCount[cls] || 0) + 1;
        }
      });
    });

    return Object.entries(classCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cls]) => cls);
  }

  /**
   * Extract landmark elements
   */
  private extractLandmarks(html: string): string[] {
    const landmarks = ['nav', 'main', 'header', 'footer', 'aside', 'section'];
    return landmarks.filter((tag) => html.includes(`<${tag}`));
  }

  /**
   * Start MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new MCPServer();
  server.start().catch((error) => {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
