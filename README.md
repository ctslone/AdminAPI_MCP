# CData Arc MCP Server

A comprehensive Model Context Protocol (MCP) server that enables AI assistants like Claude to manage CData Arc flows, messages, and application behavior through natural language interactions. Built with TypeScript and the MCP SDK, providing secure access to Arc's Admin API.

## 🚀 Overview

This MCP server provides complete administrative access to your CData Arc instance through natural language interactions. Claude can now create connectors, monitor transactions, manage configurations, troubleshoot issues, and perform administrative actions using conversational commands.

## 🛠️ Available Tools

### Connector Management (7 tools)
- **`list_connectors`** - List Arc connectors with filtering and pagination
- **`get_connector`** - Get detailed information about a specific connector
- **`create_connector`** - Create new connectors with custom configuration
- **`update_connector`** - Update existing connector settings
- **`delete_connector`** - Remove connectors permanently
- **`receive_file`** - Trigger file receive operations for connectors
- **`send_file`** - Trigger file send operations for connectors

### File & Message Management (7 tools)
- **`list_files`** - List processed files with filtering and pagination
- **`get_file`** - Get detailed information about specific files
- **`create_file`** - Create new files with custom metadata
- **`update_file`** - Update existing file metadata and content
- **`delete_file`** - Remove files permanently
- **`get_files_by_connector`** - List all files for a specific connector
- **`get_recent_files`** - View recently processed files across all connectors

### Transaction & Log Management (9 tools)
- **`list_logs`** - List Arc logs with level and category filtering
- **`get_log`** - Get detailed log entry information
- **`create_log`** - Create new log entries
- **`delete_log`** - Remove log entries
- **`list_transactions`** - List processing transactions with status filtering
- **`get_transaction`** - Get detailed transaction information
- **`get_recent_transactions`** - View recent transactions with status summary
- **`get_message_count`** - Get count of unsent messages by connector and workspace
- **`get_transaction_logs`** - Retrieve detailed transaction log files and content

### Workspace Management (4 tools)
- **`list_workspaces`** - List all workspaces with comprehensive property display
- **`get_workspace`** - Get detailed workspace configuration and settings
- **`create_workspace`** - Create new workspaces with custom configuration
- **`update_workspace`** - Update workspace settings including email, S3, cleanup, and performance options

### Certificate Management (6 tools)
- **`list_certificates`** - List Arc certificates with filtering and pagination
- **`get_certificate`** - Get detailed information about a specific certificate
- **`create_certificate`** - Create new certificates with custom configuration
- **`delete_certificate`** - Remove certificates permanently
- **`create_cert`** - Generate new public/private certificate key pairs
- **`exchange_cert`** - Exchange certificates for AS2/OFTP protocols with partners

### Vault Management (4 tools)
- **`list_vault_items`** - List vault items with filtering and pagination
- **`get_vault_item`** - Get detailed information about specific vault items
- **`create_vault_item`** - Create new vault entries for secure storage
- **`delete_vault_item`** - Remove vault items permanently

### Report Management (3 tools)
- **`list_reports`** - List available reports with filtering options
- **`get_report`** - Get detailed report information and configuration
- **`delete_report`** - Remove reports permanently

### Request Monitoring (2 tools)
- **`list_requests`** - List API requests with filtering and pagination
- **`get_request`** - Get detailed information about specific API requests

### Administrative Actions (6 tools)
- **`cleanup_files`** - Clean up log files for specified workspaces and connectors
- **`export_settings`** - Export connector settings and workspace configuration to arcflow format
- **`import_settings`** - Import partner/connector profiles from arcflow data
- **`copy_connector`** - Copy connector configurations between workspaces
- **`copy_workspace`** - Copy entire workspaces with all connectors
- **`set_flow`** - Configure connector flow connections within a workspace

### Profile & Configuration Management (2 tools)
- **`get_profile`** - View Arc application profile and settings
- **`update_profile`** - Update logging, email notifications, SMTP, SSO, and syslog configuration

## 🏗️ Architecture

### Core Components
- **`ArcApiClient`** - Handles HTTP communication with Arc Admin API with comprehensive error handling
- **Tool Modules** - Organized by functionality (connectors, files, logs, profile, certificates, actions, etc.)
- **Type Definitions** - Complete TypeScript interfaces for all Arc entities and API operations
- **Dual Transport** - Supports both stdio and HTTP transports

### Key Features
- **🔐 Secure Authentication** - Bearer token and Basic Auth support
- **🔍 Rich Filtering** - OData-style query parameters with advanced filtering
- **📊 Smart Formatting** - User-friendly output with comprehensive details and status information
- **⚡ Error Handling** - Comprehensive error handling with detailed API error parsing
- **🔄 Real-time Data** - Live access to Arc instance data with proper OData response handling
- **🎯 OData Compatibility** - Proper handling of OData responses and empty result sets
- **🚀 Action Support** - Administrative actions like cleanup, export/import, and flow configuration

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/cdata-arc-mcp-server.git
   cd cdata-arc-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

This creates the compiled JavaScript files in the `dist/` directory that Claude Desktop needs to run the MCP server.

## ⚙️ Configuration

### Claude Desktop Configuration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cdata-arc-server": {
      "command": "node",
      "args": ["C:/path/to/cdata-arc-mcp-server/dist/index.js"],
      "env": {
        "CDATA_BASE_URL": "http://localhost:8001/api.rsc",
        "CDATA_AUTH_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

**Important Configuration Notes:**
- Use forward slashes `/` or escaped backslashes `\\` in Windows paths
- Replace `localhost:8001` with your actual CData Arc instance URL
- Ensure the `dist/index.js` file exists by running `npm run build` first
- Restart Claude Desktop after making configuration changes

### Environment Variables

**Required:**
- `CDATA_BASE_URL`: Base URL for your CData Arc instance (e.g., `http://localhost:8001/api.rsc`)
- `CDATA_AUTH_TOKEN`: Your authtoken for your CData Arc instance (e.g., `username:1234567890`)
**Optional:**
- `MCP_TRANSPORT_MODE`: Transport mode - `stdio` (default) or `http`
- `MCP_HTTP_PORT`: Port for HTTP transport (default: `3000`)

### Transport Modes

This MCP server supports two communication modes:

#### STDIO Mode (Default)
- **How it works**: Claude Desktop launches the server as a child process and communicates via standard input/output
- **When to use**: Normal operation with Claude Desktop (recommended)
- **Configuration**: Claude Desktop handles starting/stopping the server automatically
- **Testing**: Use `npm run start` to test the server manually in stdio mode (it will wait for JSON-RPC messages on stdin)

#### HTTP Mode
- **How it works**: MCP server runs as a standalone HTTP service with a health check endpoint
- **When to use**: Designed for server deployments and monitoring
- **Current limitations**:
  - Only supports plaintext HTTP (SSL/TLS support planned for future release)
  - Only `/health` endpoint currently available (MCP protocol endpoints coming soon)
  - Not compatible with Claude Desktop remote connections (requires HTTPS and SSE endpoints)
- **Configuration**: Set `MCP_TRANSPORT_MODE=http` and optionally `MCP_HTTP_PORT=3000`
- **Testing**: Use `npm run start:http` with environment variables, then test the health endpoint at `http://localhost:3000/health`

## 🚦 Getting Started

1. **Install dependencies and build** the server:
   ```bash
   npm install
   npm run build
   ```

2. **Configure your Arc instance** URL and authentication token in environment variables or Claude Desktop config

3. **Add the MCP server** to your Claude Desktop configuration file

4. **Restart Claude Desktop** to load the new MCP server

5. **Start chatting** with Claude about your Arc instance! Try commands like:
   - "Show me all connectors in the default workspace"
   - "Get the recent transactions for the past hour"
   - "Clean up log files older than 30 days"
   - "Export the connector settings for workspace 'production'"

### Quick Start Commands

```bash
# Install and build
npm install
npm run build

# Run in development mode with file watching
npm run dev

# Start the server directly (for testing)
npm run start
```

## 🔧 Development

### Available Scripts

```bash
npm run dev        # Development mode with file watching and auto-restart
npm run build      # Build TypeScript to JavaScript
npm run start      # Start server in stdio mode (for manual testing - Claude Desktop normally handles this)
npm run start:http # Start server in HTTP mode on the port defined by `MCP_HTTP_PORT`
npm run typecheck  # Type checking only
```

### Project Structure
```
src/
├── index.ts                   # Main server entry point
├── services/
│   └── arc-client.ts         # Arc API client with comprehensive error handling
├── tools/
│   ├── connector-tools.ts    # Connector management and file operations
│   ├── monitoring-tools.ts   # Logs, transactions, and message monitoring
│   ├── workspace-tools.ts    # Workspace management operations
│   ├── certificate-tools.ts  # Certificate creation and exchange
│   ├── vault-tools.ts        # Vault/secrets management
│   ├── report-tools.ts       # Report management
│   ├── request-tools.ts      # API request monitoring
│   ├── action-tools.ts       # Administrative actions (cleanup, export/import)
│   └── config-tools.ts       # Profile and configuration management
├── types/
│   └── arc-api.ts           # Complete TypeScript type definitions
└── admin_api_swagger.json   # OpenAPI specification
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection errors**
   - Verify `CDATA_BASE_URL` is correct and CData Arc instance is running
   - Check `CDATA_AUTH_TOKEN` is valid and has proper permissions
   - Ensure the API endpoint `/api.rsc` is accessible

2. **Tool not found errors**
   - Run `npm run build` to ensure TypeScript is compiled
   - Restart Claude Desktop after configuration changes
   - Check that all file paths in configuration use forward slashes or escaped backslashes

3. **Authentication errors**
   - Test API access directly: `curl -H "x-cdata-authtoken: YOUR_TOKEN" http://localhost:8001/api.rsc/connectors`
   - Verify token has admin-level permissions for all operations

4. **Empty or error responses**
   - Check Arc instance logs for detailed error information
   - Verify workspace and connector IDs exist and are spelled correctly
   - Some endpoints return empty results when no data matches the criteria

### Debug Mode

Set `NODE_ENV=development` for additional debug logging:

```json
{
  "mcpServers": {
    "cdata-arc-server": {
      "command": "node",
      "args": ["C:/path/to/dist/index.js"],
      "env": {
        "CDATA_BASE_URL": "http://localhost:8001/api.rsc",
        "CDATA_AUTH_TOKEN": "your-token",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 📄 OpenAPI Integration

The server includes a complete OpenAPI specification (`admin_api_swagger.json`) with:
- All API endpoints used by the MCP tools
- Proper schema definitions with comprehensive type information
- OData-compliant request/response formats
- Authentication and error handling specifications
- Action endpoints for administrative operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests if applicable
4. Ensure code passes linting: `npm run lint`
5. Build and test: `npm run build && npm run test`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details.

## 🔗 Related Links

- [CData Arc Documentation](https://arc.cdata.com/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)