#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';

import { ArcApiClient } from './services/arc-client.js';
import { createConnectorTools } from './tools/connector-tools.js';
import { createFileTools } from './tools/file-tools.js';
import { createMonitoringTools } from './tools/monitoring-tools.js';
import { createConfigurationTools } from './tools/config-tools.js';
import { createCertificateTools } from './tools/certificate-tools.js';
import { createReportTools } from './tools/report-tools.js';

// Configuration from environment variables
const CDATA_BASE_URL = process.env.CDATA_BASE_URL || 'http://localhost:8181/api.rsc';
const CDATA_AUTH_TOKEN = process.env.CDATA_AUTH_TOKEN;
const MCP_TRANSPORT_MODE = process.env.MCP_TRANSPORT_MODE || 'stdio';
const MCP_HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || '3000');

console.error('[MCP] Starting CData Arc MCP Server...');

// Create server with minimal configuration
const server = new Server(
  {
    name: 'cdata-arc-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

console.error('[MCP] Server created');

// Lazy initialization of tools - only create when needed
let client: ArcApiClient | null = null;
let allTools: any[] | null = null;

function getClient(): ArcApiClient {
  if (!client) {
    console.error('[MCP] Creating Arc API client...');
    client = new ArcApiClient(CDATA_BASE_URL, CDATA_AUTH_TOKEN);
    console.error('[MCP] Arc API client created');
  }
  return client;
}

function getTools(): any[] {
  if (!allTools) {
    console.error('[MCP] Loading MCP tools...');
    const arcClient = getClient();
    
    allTools = [
      ...createConnectorTools(arcClient),
      ...createFileTools(arcClient),
      ...createMonitoringTools(arcClient),
      ...createConfigurationTools(arcClient),
      ...createCertificateTools(arcClient),
      ...createReportTools(arcClient)
    ];
    
    console.error(`[MCP] Loaded ${allTools.length} tools successfully`);
  }
  return allTools;
}

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[MCP] Tools list requested');
  try {
    const tools = getTools();
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  } catch (error) {
    console.error('[MCP] Error getting tools:', error);
    throw error;
  }
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[MCP] Tool execution requested: ${name}`);
  
  try {
    const tools = getTools();
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    console.error(`[MCP] Executing tool: ${name}`);
    const result = await tool.handler(args || {});
    console.error(`[MCP] Tool ${name} completed successfully`);
    return result;
  } catch (error: any) {
    console.error(`[MCP] Tool ${name} failed:`, error);
    
    // Return user-friendly error messages
    let errorMessage = error.message || 'An unexpected error occurred';
    
    // Handle common HTTP errors
    if (error.response?.status) {
      switch (error.response.status) {
        case 401:
          errorMessage = 'Authentication failed. Please check your CDATA_AUTH_TOKEN.';
          break;
        case 403:
          errorMessage = 'Permission denied. Insufficient privileges for this operation.';
          break;
        case 404:
          errorMessage = 'Resource not found. The requested item may not exist.';
          break;
        case 500:
          errorMessage = 'Server error. Please check your CData Arc instance.';
          break;
        default:
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText || errorMessage}`;
      }
    }

    return {
      content: [{
        type: "text",
        text: `❌ **Error executing ${name}**\n\n${errorMessage}`
      }],
      isError: true
    };
  }
});

console.error('[MCP] Request handlers set up');

async function startStdio() {
  try {
    console.error('[MCP] Starting stdio transport...');
    console.error(`[MCP] Arc API URL: ${CDATA_BASE_URL}`);
    console.error(`[MCP] Auth token configured: ${CDATA_AUTH_TOKEN ? 'Yes' : 'No'}`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Server connected and ready for requests');
    
  } catch (error) {
    console.error('[MCP] Failed to start stdio server:', error);
    process.exit(1);
  }
}

async function startHttp() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    try {
      const tools = getTools();
      res.json({
        status: 'healthy',
        server: 'cdata-arc-mcp-server',
        version: '1.0.0',
        arcUrl: CDATA_BASE_URL,
        authConfigured: !!CDATA_AUTH_TOKEN,
        tools: tools.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize tools' });
    }
  });

  app.listen(MCP_HTTP_PORT, () => {
    console.error(`[MCP] HTTP server running on port ${MCP_HTTP_PORT}`);
  });
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('[MCP] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MCP] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[MCP] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Main execution
async function main() {
  try {
    if (MCP_TRANSPORT_MODE === 'http') {
      await startHttp();
    } else {
      await startStdio();
    }
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('[MCP] Unhandled error in main:', error);
  process.exit(1);
});