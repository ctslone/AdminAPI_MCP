# CData Arc MCP Server

A comprehensive Model Context Protocol (MCP) server that enables AI assistants like Claude to manage CData Arc flows, messages, and application behavior through natural language interactions. Built with TypeScript and the MCP SDK, providing secure access to Arc's Admin API.

## 🚀 Overview

This MCP server provides complete administrative access to your CData Arc instance through natural language interactions. Claude can now create connectors, monitor transactions, manage configurations, and troubleshoot issues using conversational commands.

## 🛠️ Available Tools

### Connector Management (5 tools)
- **`list_connectors`** - List Arc connectors with filtering and pagination
- **`get_connector`** - Get detailed information about a specific connector
- **`create_connector`** - Create new connectors with custom configuration
- **`update_connector`** - Update existing connector settings
- **`delete_connector`** - Remove connectors permanently

### File & Message Management (7 tools)
- **`list_files`** - List processed files with filtering and pagination
- **`get_file`** - Get detailed information about specific files
- **`create_file`** - Create new files with custom metadata
- **`update_file`** - Update existing file metadata and content
- **`delete_file`** - Remove files permanently
- **`get_files_by_connector`** - List all files for a specific connector
- **`get_recent_files`** - View recently processed files across all connectors

### Log Management (7 tools)
- **`list_logs`** - List Arc logs with level and category filtering
- **`get_log`** - Get detailed log entry information
- **`create_log`** - Create new log entries
- **`delete_log`** - Remove log entries
- **`list_transactions`** - List processing transactions with status filtering
- **`get_transaction`** - Get detailed transaction information
- **`get_recent_transactions`** - View recent transactions with status summary

### Profile & Configuration Management (2 tools)
- **`get_profile`** - View Arc application profile and settings
- **`update_profile`** - Update logging, email notifications, SMTP, SSO, and syslog configuration

### Certificate Management (4 tools)
- **`list_certificates`** - List Arc certificates with filtering and pagination
- **`get_certificate`** - Get detailed information about a specific certificate
- **`create_certificate`** - Create new certificates with custom configuration
- **`delete_certificate`** - Remove certificates permanently

## 🏗️ Architecture

### Core Components
- **`ArcApiClient`** - Handles HTTP communication with Arc Admin API
- **Tool Modules** - Organized by functionality (connectors, files, logs, profile, certificates)
- **Type Definitions** - Complete TypeScript interfaces for all Arc entities
- **Dual Transport** - Supports both stdio and HTTP transports

### Key Features
- **🔐 Secure Authentication** - Bearer token and Basic Auth support
- **🔍 Rich Filtering** - OData-style query parameters
- **📊 Smart Formatting** - User-friendly output with icons and formatting
- **⚡ Error Handling** - Comprehensive error handling with helpful messages
- **🔄 Real-time Data** - Live access to Arc instance data
- **🎯 OData Compatibility** - Proper `@odata.type` handling for updates

## 📦 Installation

```bash
npm install
npm run build
```

## ⚙️ Configuration

### Authentication Options

The server supports multiple authentication methods:

1. **API Token** (recommended): Use `x-cdata-authtoken` header
2. **Basic Auth**: Use `username:password` format in auth token

### Claude Desktop Configuration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cdata-arc-server": {
      "command": "node",
      "args": ["/path/to/cdata-arc-mcp-server/dist/index.js"],
      "env": {
        "CDATA_BASE_URL": "http://localhost:8001/api.rsc",
        "CDATA_AUTH_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Environment Variables

**Required:**
- `CDATA_BASE_URL`: Base URL for your CData Arc instance (e.g., `http://localhost:8001/api.rsc`)
- `CDATA_AUTH_TOKEN`: Authentication token or `username:password` for Basic Auth

**Optional:**
- `MCP_TRANSPORT_MODE`: Transport mode - `stdio` (default) or `http`
- `MCP_HTTP_PORT`: Port for HTTP transport (default: `3000`)

## 🚦 Getting Started

1. **Install and build** the server
2. **Configure** your Arc instance URL and auth token
3. **Add** to Claude Desktop configuration
4. **Restart** Claude Desktop
5. **Start chatting** with Claude about your Arc instance!

```bash
# Quick start
npm install
npm run build
npm run start
```

## 🔧 Development

```bash
npm run dev        # Development mode with file watching
npm run typecheck  # Type checking
npm run lint       # Linting
npm run test       # Run tests
```

### Project Structure
```
src/
├── index.ts              # Main server entry point
├── services/
│   └── arc-client.ts     # Arc API client
├── tools/
│   ├── connector-tools.ts    # Connector management
│   ├── file-tools.ts         # File operations
│   ├── monitoring-tools.ts   # Logs & transactions
│   ├── config-tools.ts       # Profile configuration
│   └── certificate-tools.ts # Certificate management
└── types/
    └── arc-api.ts        # TypeScript type definitions
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection errors**
   - Check `CDATA_BASE_URL` is correct and Arc instance is running
   - Verify `CDATA_AUTH_TOKEN` is valid

2. **Tool not found errors**
   - Ensure server is built: `npm run build`
   - Restart Claude Desktop after configuration changes

## 📄 OpenAPI Integration

The server includes a complete OpenAPI specification (`admin_api_swagger.json`) with:
- All MCP tools mapped to REST endpoints
- Proper schema definitions with `$ref` references
- OData-compliant request/response formats
- Authentication and error handling specifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License

## 🔗 Related Links

- [CData Arc Documentation](https://arc.cdata.com/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)