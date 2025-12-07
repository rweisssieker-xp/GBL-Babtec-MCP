import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import logger from '../utils/logger.js';
import type { Config } from '../config/schema.js';

export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: Tool['inputSchema'];
  handler: (args: unknown, context: ToolContext) => Promise<unknown>;
  requiredPermissions?: string[];
}

export interface ToolContext {
  userId?: string;
  userRoles?: string[];
  config: Config;
}

export class BabtecMCPServer {
  private server: Server;
  private tools: Map<string, ToolHandler> = new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.server = new Server(
      {
        name: config.server.name,
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolList: Tool[] = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      logger.debug('List tools requested', { count: toolList.length });
      return { tools: toolList };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool "${name}" not found`
        );
      }

      logger.info('Tool called', { tool: name, args });

      try {
        // TODO: Add RBAC check here (Task 10)
        const context: ToolContext = {
          config: this.config,
          // userId and userRoles will come from MCP client context
        };

        const result = await tool.handler(args || {}, context);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Tool execution failed', { tool: name, error });
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupErrorHandling(): void {
    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      // Don't exit - let the server continue
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      // Don't exit - let the server continue
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  registerTool(tool: ToolHandler): void {
    if (this.tools.has(tool.name)) {
      logger.warn('Tool already registered, overwriting', { tool: tool.name });
    }
    this.tools.set(tool.name, tool);
    logger.debug('Tool registered', { tool: tool.name });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started and connected');
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP server...');
    // Complete in-flight requests
    // Close connections
    // Save audit logs
    await this.server.close();
    logger.info('MCP Server shut down gracefully');
    process.exit(0);
  }

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    tools: number;
    uptime: number;
  } {
    return {
      status: 'healthy',
      tools: this.tools.size,
      uptime: process.uptime(),
    };
  }
}

