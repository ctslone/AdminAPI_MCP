import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetTransactionsSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(), 
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required")
});

const GetLogsSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetLogSchema = z.object({
  logId: z.string().min(1, "Log ID is required")
});

const DeleteLogSchema = z.object({
  logId: z.string().min(1, "Log ID is required")
});

const DeleteTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required")
});

const GetTransactionsCountSchema = z.object({
  filter: z.string().optional()
});

const GetTransactionPropertySchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  propertyName: z.string().min(1, "Property name is required")
});

const GetMessageCountSchema = z.object({
  workspaceId: z.string().optional(),
  connectorId: z.string().optional()
});

const GetTransactionLogsSchema = z.object({
  workspaceId: z.string().optional(),
  connectorId: z.string().optional(),
  portId: z.string().optional(),
  messageId: z.string().min(1, "Message ID is required"),
  direction: z.string().min(1, "Direction is required"),
  type: z.string().optional(),
  includeContent: z.string().optional()
});

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function getStatusIcon(status?: string): string {
  if (!status) return 'UNKNOWN';

  const statusLower = status.toLowerCase();
  if (statusLower.includes('success') || statusLower.includes('complete')) return 'SUCCESS';
  if (statusLower.includes('error') || statusLower.includes('fail')) return 'ERROR';
  if (statusLower.includes('running') || statusLower.includes('process')) return 'RUNNING';
  if (statusLower.includes('pending') || statusLower.includes('wait')) return 'PENDING';
  return 'UNKNOWN';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatTime(timeMs: number): string {
  if (timeMs < 1000) {
    return `${timeMs}ms`;
  } else if (timeMs < 60000) {
    return `${(timeMs / 1000).toFixed(2)}s`;
  } else {
    return `${(timeMs / 60000).toFixed(2)}m`;
  }
}

function getLogLevelIcon(level?: string): string {
  if (!level) return 'LOG';

  const levelLower = level.toLowerCase();
  if (levelLower.includes('error')) return 'ERROR';
  if (levelLower.includes('warn')) return 'WARN';
  if (levelLower.includes('info')) return 'INFO';
  if (levelLower.includes('debug')) return 'DEBUG';
  return 'LOG';
}

export function createMonitoringTools(client: ArcApiClient) {
  return [
    {
      name: "list_transactions",
      description: "List Arc transactions with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Id,Status,ConnectorId')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"Status eq 'Success'\" or \"ConnectorId eq 'MyConnector'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'StartTime DESC' or 'Id ASC')"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return"
          },
          skip: {
            type: "number",
            description: "Number of results to skip for pagination"
          }
        }
      },
      handler: async (args: any) => {
        const validated = GetTransactionsSchema.parse(args);
        
        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby || 'StartTime DESC',
          $top: validated.top,
          $skip: validated.skip
        };

        const transactions = await client.getTransactions(queryParams);
        
        if (transactions.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No transactions found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${transactions.length} transactions:\n\n` +
              transactions.map(t => 
                `${getStatusIcon(t.Status)} **Transaction ${t.Id}**\n` +
                `  Connector: ${t.ConnectorId || 'Unknown'}\n` +
                `  Status: ${t.Status || 'Unknown'}\n` +
                `  Timestamp: ${formatDate(t.Timestamp)}\n` +
                `  Direction: ${t.Direction || 'Unknown'}\n` +
                `  Filename: ${t.Filename || 'None'}\n` +
                `  File Size: ${t.FileSize ? formatBytes(t.FileSize) : 'Unknown'}\n` +
                `  Processing Time: ${t.ProcessingTime ? formatTime(t.ProcessingTime) : 'Unknown'}\n`
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "get_transaction",
      description: "Get detailed information about a specific Arc transaction",
      inputSchema: {
        type: "object",
        properties: {
          transactionId: {
            type: "string",
            description: "The unique identifier of the transaction"
          }
        },
        required: ["transactionId"]
      },
      handler: async (args: any) => {
        const validated = GetTransactionSchema.parse(args);
        const transaction = await client.getTransaction(validated.transactionId);
        
        if (!transaction) {
          return {
            content: [{
              type: "text",
              text: `Transaction '${validated.transactionId}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `${getStatusIcon(transaction.Status)} **Transaction Details**\n\n` +
              `**ID:** ${transaction.Id}\n` +
              `**Connector ID:** ${transaction.ConnectorId || 'Unknown'}\n` +
              `**Status:** ${transaction.Status || 'Unknown'}\n` +
              `**Timestamp:** ${formatDate(transaction.Timestamp)}\n` +
              `**Direction:** ${transaction.Direction || 'Unknown'}\n` +
              `**Filename:** ${transaction.Filename || 'None'}\n` +
              `**File Path:** ${transaction.FilePath || 'Unknown'}\n` +
              `**File Size:** ${transaction.FileSize ? formatBytes(transaction.FileSize) : 'Unknown'}\n` +
              `**Processing Time:** ${transaction.ProcessingTime ? formatTime(transaction.ProcessingTime) : 'Unknown'}\n` +
              `**Connector Type:** ${transaction.ConnectorType || 'Unknown'}\n` +
              (transaction.BatchGroupId ? `**Batch Group ID:** ${transaction.BatchGroupId}\n` : '') +
              (transaction.ETag ? `**ETag:** ${transaction.ETag}\n` : '')
          }]
        };
      }
    },

    {
      name: "get_recent_transactions",
      description: "Get recent transactions with status summary",
      inputSchema: {
        type: "object", 
        properties: {
          hours: {
            type: "number",
            description: "Number of hours back to look for transactions (default: 24)"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return (default: 50)"
          }
        }
      },
      handler: async (args: any) => {
        const hours = z.number().positive().default(24).parse(args.hours || 24);
        const top = z.number().positive().default(50).parse(args.top || 50);
        
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const isoDate = cutoffDate.toISOString();
        
        const queryParams = {
          $filter: `Timestamp ge '${isoDate}'`,
          $orderby: 'Timestamp DESC',
          $top: top
        };

        const transactions = await client.getTransactions(queryParams);
        
        if (transactions.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No transactions found in the last ${hours} hours.`
            }]
          };
        }

        // Group by status
        const statusGroups = transactions.reduce((groups: any, t) => {
          const status = t.Status || 'Unknown';
          if (!groups[status]) groups[status] = 0;
          groups[status]++;
          return groups;
        }, {});

        // Group by connector
        const connectorGroups = transactions.reduce((groups: any, t) => {
          const connector = t.ConnectorId || 'Unknown';
          if (!groups[connector]) groups[connector] = [];
          groups[connector].push(t);
          return groups;
        }, {});

        let result = `**Recent Transactions (Last ${hours} hours)**\n\n`;
        result += `**Total Transactions:** ${transactions.length}\n\n`;
        
        result += `**Status Summary:**\n`;
        Object.entries(statusGroups).forEach(([status, count]) => {
          result += `  ${getStatusIcon(status)} ${status}: ${count}\n`;
        });
        result += '\n';

        result += `**By Connector:**\n`;
        Object.entries(connectorGroups).forEach(([connectorId, connectorTransactions]) => {
          const transactions = connectorTransactions as any[];
          result += `**${connectorId}** (${transactions.length} transactions)\n`;
          transactions.slice(0, 3).forEach(t => {
            result += `  ${getStatusIcon(t.Status)} ${t.Id} - ${formatDate(t.Timestamp)}\n`;
          });
          if (transactions.length > 3) {
            result += `  ... and ${transactions.length - 3} more\n`;
          }
          result += '\n';
        });

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    },

    {
      name: "list_logs",
      description: "List Arc logs with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Id,Type,Message')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"Type eq 'Error'\" or \"ConnectorId eq 'MyConnector'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Timestamp DESC' or 'Type ASC')"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return"
          },
          skip: {
            type: "number",
            description: "Number of results to skip for pagination"
          }
        }
      },
      handler: async (args: any) => {
        const validated = GetLogsSchema.parse(args);
        
        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby || 'Timestamp DESC',
          $top: validated.top,
          $skip: validated.skip
        };

        const logs = await client.getLogs(queryParams);
        
        if (logs.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No logs found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${logs.length} log entries:\n\n` +
              logs.map(l =>
                `${getLogLevelIcon(l.Type)} **${formatDate(l.Timestamp)}** [${l.Type || 'INFO'}]\n` +
                `  ${l.Message || 'No message'}\n` +
                (l.ConnectorId ? `  Connector: ${l.ConnectorId}\n` : '') +
                (l.Category ? `  Category: ${l.Category}\n` : '')
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "get_log",
      description: "Get detailed information about a specific log entry",
      inputSchema: {
        type: "object",
        properties: {
          logId: {
            type: "string",
            description: "The unique identifier of the log entry"
          }
        },
        required: ["logId"]
      },
      handler: async (args: any) => {
        const validated = GetLogSchema.parse(args);
        const log = await client.getLog(validated.logId);
        
        if (!log) {
          return {
            content: [{
              type: "text",
              text: `Log entry '${validated.logId}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `${getLogLevelIcon(log.Type)} **Log Entry Details**\n\n` +
              `**ID:** ${log.Id}\n` +
              `**Timestamp:** ${formatDate(log.Timestamp)}\n` +
              `**Type:** ${log.Type || 'INFO'}\n` +
              `**Message:** ${log.Message || 'No message'}\n` +
              (log.ConnectorId ? `**Connector ID:** ${log.ConnectorId}\n` : '') +
              (log.Category ? `**Category:** ${log.Category}\n` : '')
          }]
        };
      }
    },

    {
      name: "get_error_logs",
      description: "Get recent error logs to help with troubleshooting",
      inputSchema: {
        type: "object",
        properties: {
          hours: {
            type: "number",
            description: "Number of hours back to look for errors (default: 24)"
          },
          connectorId: {
            type: "string",
            description: "Filter errors for a specific connector"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return (default: 20)"
          }
        }
      },
      handler: async (args: any) => {
        const hours = z.number().positive().default(24).parse(args.hours || 24);
        const connectorId = z.string().optional().parse(args.connectorId);
        const top = z.number().positive().default(20).parse(args.top || 20);
        
        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const isoDate = cutoffDate.toISOString();
        
        let filter = `Timestamp ge '${isoDate}' and Type eq 'Error'`;
        if (connectorId) {
          filter += ` and ConnectorId eq '${connectorId}'`;
        }
        
        const queryParams = {
          $filter: filter,
          $orderby: 'Timestamp DESC',
          $top: top
        };

        const logs = await client.getLogs(queryParams);
        
        if (logs.length === 0) {
          const scope = connectorId ? ` for connector '${connectorId}'` : '';
          return {
            content: [{
              type: "text",
              text: `No error logs found in the last ${hours} hours${scope}.`
            }]
          };
        }

        let result = `🔴 **Error Logs (Last ${hours} hours)**\n\n`;
        if (connectorId) {
          result += `**Connector:** ${connectorId}\n`;
        }
        result += `**Total Errors:** ${logs.length}\n\n`;
        
        logs.forEach(l => {
          result += `🔴 **${formatDate(l.Timestamp)}**\n`;
          result += `  ${l.Message || 'No message'}\n`;
          if (l.ConnectorId && !connectorId) {
            result += `  Connector: ${l.ConnectorId}\n`;
          }
          if (l.Category) {
            result += `  Category: ${l.Category}\n`;
          }
          result += '\n';
        });

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    },

    {
      name: "delete_transaction",
      description: "Delete a specific transaction",
      inputSchema: {
        type: "object",
        properties: {
          transactionId: {
            type: "string",
            description: "The unique identifier of the transaction to delete"
          }
        },
        required: ["transactionId"]
      },
      handler: async (args: any) => {
        const validated = DeleteTransactionSchema.parse(args);

        await client.deleteTransaction(validated.transactionId);

        return {
          content: [{
            type: "text",
            text: `**Transaction Deleted**\n\nTransaction '${validated.transactionId}' has been permanently deleted.`
          }]
        };
      }
    },

    {
      name: "get_transactions_count",
      description: "Get the total count of transactions with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "OData filter expression to count specific transactions (e.g., \"Status eq 'Success'\")"
          }
        }
      },
      handler: async (args: any) => {
        const validated = GetTransactionsCountSchema.parse(args);

        const queryParams = validated.filter ? { $filter: validated.filter } : undefined;
        const count = await client.getTransactionsCount(queryParams);

        const filterText = validated.filter ? ` matching filter '${validated.filter}'` : '';

        return {
          content: [{
            type: "text",
            text: `**Transactions Count**\n\nTotal transactions${filterText}: **${count}**`
          }]
        };
      }
    },

    {
      name: "get_transaction_property",
      description: "Get a specific property value from a transaction",
      inputSchema: {
        type: "object",
        properties: {
          transactionId: {
            type: "string",
            description: "The unique identifier of the transaction"
          },
          propertyName: {
            type: "string",
            description: "The name of the property to retrieve (e.g., 'Filename', 'Status', 'Direction')"
          }
        },
        required: ["transactionId", "propertyName"]
      },
      handler: async (args: any) => {
        const validated = GetTransactionPropertySchema.parse(args);

        try {
          const propertyValue = await client.getTransactionProperty(validated.transactionId, validated.propertyName);

          return {
            content: [{
              type: "text",
              text: `**Transaction Property**\n\n**Transaction ID:** ${validated.transactionId}\n**Property:** ${validated.propertyName}\n**Value:** ${propertyValue || 'null'}`
            }]
          };
        } catch (error: any) {
          if (error.response?.status === 404) {
            return {
              content: [{
                type: "text",
                text: `Transaction '${validated.transactionId}' or property '${validated.propertyName}' not found.`
              }]
            };
          }
          throw error;
        }
      }
    },

    {
      name: "delete_log",
      description: "Delete a specific log entry",
      inputSchema: {
        type: "object",
        properties: {
          logId: {
            type: "string",
            description: "The unique identifier of the log entry to delete"
          }
        },
        required: ["logId"]
      },
      handler: async (args: any) => {
        const validated = DeleteLogSchema.parse(args);
        
        await client.deleteLog(validated.logId);
        
        return {
          content: [{
            type: "text",
            text: `**Log Deleted**\n\nLog entry '${validated.logId}' has been permanently deleted.`
          }]
        };
      }
    },

    {
      name: "get_message_count",
      description: "Get the unsent messages count for connectors - counts all messages in Send folders",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID to filter by. If not specified, returns counts for all workspaces"
          },
          connectorId: {
            type: "string",
            description: "The connector ID to filter by. If not specified, returns counts for all connectors"
          }
        }
      },
      handler: async (args: any) => {
        const validated = GetMessageCountSchema.parse(args);

        const messageCountInput = {
          WorkspaceId: validated.workspaceId,
          ConnectorId: validated.connectorId
        };

        const results = await client.getMessageCount(messageCountInput);

        if (!results || results.length === 0) {
          return {
            content: [{
              type: "text",
              text: "**No Message Counts Found**\n\nNo connectors found matching the specified criteria."
            }]
          };
        }

        // Build summary
        const totalMessages = results.reduce((sum, result) => {
          const count = parseInt(result.Count || '0');
          return sum + count;
        }, 0);

        let responseText = `**Message Count Summary**\n\n` +
          `**Total Unsent Messages:** ${totalMessages}\n` +
          `**Connectors Checked:** ${results.length}\n\n`;

        // Add details for each connector
        responseText += "**Per Connector:**\n";
        results.forEach(result => {
          const count = result.Count || '0';
          const workspace = result.Workspace || 'Unknown';
          responseText += `• **${result.ConnectorId}** (${workspace}): ${count} messages\n`;
        });

        // Add filter information
        if (validated.workspaceId || validated.connectorId) {
          responseText += "\n**Filters Applied:**\n";
          if (validated.workspaceId) responseText += `• Workspace: ${validated.workspaceId}\n`;
          if (validated.connectorId) responseText += `• Connector: ${validated.connectorId}\n`;
        }

        return {
          content: [{
            type: "text",
            text: responseText
          }]
        };
      }
    },

    {
      name: "get_transaction_logs",
      description: "Retrieve transaction details and log files for a specific message transaction",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID"
          },
          connectorId: {
            type: "string",
            description: "The connector ID"
          },
          portId: {
            type: "string",
            description: "The port ID"
          },
          messageId: {
            type: "string",
            description: "The message ID (required)"
          },
          direction: {
            type: "string",
            description: "The direction of the transaction (required)"
          },
          type: {
            type: "string",
            description: "The type of the log file to filter by"
          },
          includeContent: {
            type: "string",
            description: "Whether to return the content of the log file (True/False, default: False)"
          }
        },
        required: ["messageId", "direction"]
      },
      handler: async (args: any) => {
        const validated = GetTransactionLogsSchema.parse(args);

        const transactionLogsInput = {
          WorkspaceId: validated.workspaceId,
          ConnectorId: validated.connectorId,
          PortId: validated.portId,
          MessageId: validated.messageId,
          Direction: validated.direction,
          Type: validated.type,
          IncludeContent: validated.includeContent || "False"
        };

        const results = await client.getTransactionLogs(transactionLogsInput);

        if (!results || results.length === 0) {
          return {
            content: [{
              type: "text",
              text: "**No Transaction Logs Found**\n\nNo log files found for the specified transaction."
            }]
          };
        }

        let responseText = `**Transaction Logs**\n\n` +
          `**Message ID:** ${validated.messageId}\n` +
          `**Direction:** ${validated.direction}\n`;

        if (validated.workspaceId) responseText += `**Workspace:** ${validated.workspaceId}\n`;
        if (validated.connectorId) responseText += `**Connector:** ${validated.connectorId}\n`;
        if (validated.portId) responseText += `**Port:** ${validated.portId}\n`;
        if (validated.type) responseText += `**Log Type Filter:** ${validated.type}\n`;

        responseText += `\n**Found ${results.length} log file(s):**\n\n`;

        results.forEach((log, index) => {
          responseText += `**Log ${index + 1}:**\n`;
          responseText += `• **File:** ${log.File || 'Unknown'}\n`;
          responseText += `• **Type:** ${log.Type || 'Unknown'}\n`;
          responseText += `• **Created:** ${formatDate(log.TimeCreated)}\n`;
          responseText += `• **Path:** ${log.Path || 'N/A'}\n`;

          if (log.Content && validated.includeContent === "True") {
            const contentPreview = log.Content.length > 200
              ? log.Content.substring(0, 200) + "..."
              : log.Content;
            responseText += `• **Content:** ${contentPreview}\n`;
          }

          responseText += "\n";
        });

        if (validated.includeContent !== "True") {
          responseText += "*Note: Set includeContent to 'True' to see log file contents*";
        }

        return {
          content: [{
            type: "text",
            text: responseText
          }]
        };
      }
    }
  ];
}