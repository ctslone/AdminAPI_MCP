# CData Arc MCP Server

A Model Context Protocol (MCP) server for CData Arc that enables AI assistants like Claude to manage flows, messages, and application behavior through natural language interactions.

## Features

- **Connector Management**: Create, read, update, and delete Arc connectors (flows)
- **File & Message Management**: Handle files and track message processing
- **Transaction Monitoring**: Monitor and track data processing transactions
- **Log Management**: Access and analyze Arc application logs
- **Profile Configuration**: Manage Arc application settings and behavior
- **Workspace Management**: Organize and manage Arc workspaces
- **Security Management**: Handle certificates and vault operations

## Installation

```bash
npm install
npm run build
```

## Configuration

### Claude Desktop Configuration

Add to your Claude Desktop configuration with your Arc instance details. All configuration is done through environment variables in the Claude config:

**Required Variables:**
- `CDATA_BASE_URL`: Base URL for your CData Arc instance (e.g., `http://localhost:8181/api.rsc`)
- `CDATA_AUTH_TOKEN`: Authentication token for Arc API access

**Optional Variables:**
- `MCP_TRANSPORT_MODE`: Transport mode - `stdio` (default, recommended for Claude) or `http`
- `MCP_HTTP_PORT`: Port for HTTP transport (default: `3000`, only used when transport mode is `http`)

**Basic Configuration (recommended):**

```json
{
  "mcpServers": {
    "cdata-arc-server": {
      "command": "node",
      "args": ["/path/to/cdata-arc-mcp-server/dist/index.js"],
      "env": {
        "CDATA_BASE_URL": "http://localhost:8181/api.rsc",
        "CDATA_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Usage

Start the server:

```bash
npm run start
```

The server will expose various MCP tools that allow Claude to interact with your CData Arc instance, including:

- Managing connectors and flows
- Monitoring message processing
- Accessing logs and transaction history
- Configuring application settings

## Development

```bash
npm run dev        # Development mode with file watching
npm run typecheck  # Type checking
npm run lint       # Linting
npm run test       # Run tests
```

## License

MIT License