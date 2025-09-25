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

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function formatDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return 'Unknown';
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`;
    } else {
      return `${(durationMs / 60000).toFixed(2)}m`;
    }
  } catch {
    return 'Unknown';
  }
}

function getStatusIcon(status?: string): string {
  if (!status) return '❓';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('success') || statusLower.includes('complete')) return '✅';
  if (statusLower.includes('error') || statusLower.includes('fail')) return '❌';
  if (statusLower.includes('running') || statusLower.includes('process')) return '🔄';
  if (statusLower.includes('pending') || statusLower.includes('wait')) return '⏳';
  return '❓';
}

function getLogLevelIcon(level?: string): string {
  if (!level) return '📄';
  
  const levelLower = level.toLowerCase();
  if (levelLower.includes('error')) return '🔴';
  if (levelLower.includes('warn')) return '🟡';
  if (levelLower.includes('info')) return '🔵';
  if (levelLower.includes('debug')) return '🔍';
  return '📄';
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
                `  Started: ${formatDate(t.StartTime)}\n` +
                `  Duration: ${formatDuration(t.StartTime, t.EndTime)}\n` +
                `  Messages: ${t.MessageCount || 0}\n` +
                (t.ErrorMessage ? `  Error: ${t.ErrorMessage}\n` : '')
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
              `**Start Time:** ${formatDate(transaction.StartTime)}\n` +
              `**End Time:** ${formatDate(transaction.EndTime)}\n` +
              `**Duration:** ${formatDuration(transaction.StartTime, transaction.EndTime)}\n` +
              `**Message Count:** ${transaction.MessageCount || 0}\n` +
              (transaction.ErrorMessage ? `**Error Message:** ${transaction.ErrorMessage}\n` : '')
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
          $filter: `StartTime ge ${isoDate}`,
          $orderby: 'StartTime DESC',
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
            result += `  ${getStatusIcon(t.Status)} ${t.Id} - ${formatDate(t.StartTime)}\n`;
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
            description: "Comma-separated list of properties to include (e.g., 'Id,Level,Message')"
          },
          filter: {
            type: "string", 
            description: "OData filter expression (e.g., \"Level eq 'Error'\" or \"ConnectorId eq 'MyConnector'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Timestamp DESC' or 'Level ASC')"
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
                `${getLogLevelIcon(l.Level)} **${formatDate(l.Timestamp)}** [${l.Level || 'INFO'}]\n` +
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
            text: `${getLogLevelIcon(log.Level)} **Log Entry Details**\n\n` +
              `**ID:** ${log.Id}\n` +
              `**Timestamp:** ${formatDate(log.Timestamp)}\n` +
              `**Level:** ${log.Level || 'INFO'}\n` +
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
        
        let filter = `Timestamp ge ${isoDate} and Level eq 'Error'`;
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
    }
  ];
}