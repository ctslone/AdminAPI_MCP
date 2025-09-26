import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetRequestsSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required")
});

const DeleteRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required")
});

const GetRequestsCountSchema = z.object({
  filter: z.string().optional()
});

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatTime(timeMs?: number): string {
  if (!timeMs) return 'Unknown';

  if (timeMs < 1000) {
    return `${timeMs}ms`;
  } else if (timeMs < 60000) {
    return `${(timeMs / 1000).toFixed(2)}s`;
  } else {
    return `${(timeMs / 60000).toFixed(2)}m`;
  }
}

export function createRequestTools(client: ArcApiClient) {
  return [
    {
      name: "list_requests",
      description: "List HTTP request logs with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Id,Method,URL,status')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"Method eq 'GET'\" or \"status eq '200'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Timestamp DESC' or 'Id ASC')"
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
        const validated = GetRequestsSchema.parse(args);

        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby || 'Timestamp DESC',
          $top: validated.top,
          $skip: validated.skip
        };

        const requests = await client.getRequests(queryParams);

        if (requests.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No request logs found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${requests.length} request logs:\n\n` +
              requests.map(r =>
                `**Request ${r.Id}**\n` +
                `  Method: ${r.Method || 'Unknown'}\n` +
                `  URL: ${r.URL || 'Unknown'}\n` +
                `  Status: ${r.status || 'Unknown'}\n` +
                `  User: ${r.User || 'Unknown'}\n` +
                `  Remote IP: ${r.RemoteIP || 'Unknown'}\n` +
                `  Timestamp: ${formatDate(r.Timestamp)}\n` +
                `  Size: ${formatBytes(r.Bytes)}\n` +
                `  Time: ${formatTime(r.Time)}\n` +
                (r.Error ? `  Error: ${r.Error}\n` : '') +
                (r.Script ? `  Script: ${r.Script}\n` : '') +
                (r.InstanceId ? `  Instance: ${r.InstanceId}\n` : '')
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "get_request",
      description: "Get detailed information about a specific request log",
      inputSchema: {
        type: "object",
        properties: {
          requestId: {
            type: "string",
            description: "The unique identifier of the request log"
          }
        },
        required: ["requestId"]
      },
      handler: async (args: any) => {
        const validated = GetRequestSchema.parse(args);
        const request = await client.getRequest(validated.requestId);

        if (!request) {
          return {
            content: [{
              type: "text",
              text: `Request log '${validated.requestId}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Request Log Details**\n\n` +
              `**ID:** ${request.Id}\n` +
              `**Timestamp:** ${formatDate(request.Timestamp)}\n` +
              `**Method:** ${request.Method || 'Unknown'}\n` +
              `**URL:** ${request.URL || 'Unknown'}\n` +
              `**Status:** ${request.status || 'Unknown'}\n` +
              `**User:** ${request.User || 'Unknown'}\n` +
              `**Remote IP:** ${request.RemoteIP || 'Unknown'}\n` +
              `**Size:** ${formatBytes(request.Bytes)}\n` +
              `**Response Time:** ${formatTime(request.Time)}\n` +
              (request.Script ? `**Script:** ${request.Script}\n` : '') +
              (request.Error ? `**Error:** ${request.Error}\n` : '') +
              (request.InstanceId ? `**Instance ID:** ${request.InstanceId}\n` : '')
          }]
        };
      }
    },

    {
      name: "delete_request",
      description: "Delete a specific request log",
      inputSchema: {
        type: "object",
        properties: {
          requestId: {
            type: "string",
            description: "The unique identifier of the request log to delete"
          }
        },
        required: ["requestId"]
      },
      handler: async (args: any) => {
        const validated = DeleteRequestSchema.parse(args);

        await client.deleteRequest(validated.requestId);

        return {
          content: [{
            type: "text",
            text: `**Request Log Deleted**\n\nRequest log '${validated.requestId}' has been permanently deleted.`
          }]
        };
      }
    },

    {
      name: "get_requests_count",
      description: "Get the total count of request logs with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "OData filter expression to count specific requests (e.g., \"Method eq 'GET'\")"
          }
        }
      },
      handler: async (args: any) => {
        const validated = GetRequestsCountSchema.parse(args);

        const queryParams = validated.filter ? { $filter: validated.filter } : undefined;
        const count = await client.getRequestsCount(queryParams);

        const filterText = validated.filter ? ` matching filter '${validated.filter}'` : '';

        return {
          content: [{
            type: "text",
            text: `**Request Logs Count**\n\nTotal request logs${filterText}: **${count}**`
          }]
        };
      }
    },

    {
      name: "get_recent_requests",
      description: "Get recent HTTP requests with status summary and filtering",
      inputSchema: {
        type: "object",
        properties: {
          hours: {
            type: "number",
            description: "Number of hours back to look for requests (default: 24)"
          },
          method: {
            type: "string",
            description: "Filter by HTTP method (GET, POST, PUT, DELETE, etc.)"
          },
          status: {
            type: "string",
            description: "Filter by HTTP status code or range (e.g., '200', '4xx', '5xx')"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return (default: 50)"
          }
        }
      },
      handler: async (args: any) => {
        const hours = z.number().positive().default(24).parse(args.hours || 24);
        const method = z.string().optional().parse(args.method);
        const status = z.string().optional().parse(args.status);
        const top = z.number().positive().default(50).parse(args.top || 50);

        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const isoDate = cutoffDate.toISOString();

        let filter = `Timestamp ge ${isoDate}`;
        if (method) {
          filter += ` and Method eq '${method.toUpperCase()}'`;
        }
        if (status) {
          if (status.endsWith('xx')) {
            // Handle status ranges like 4xx, 5xx
            const prefix = status.charAt(0);
            filter += ` and startswith(status, '${prefix}')`;
          } else {
            filter += ` and status eq '${status}'`;
          }
        }

        const queryParams = {
          $filter: filter,
          $orderby: 'Timestamp DESC',
          $top: top
        };

        const requests = await client.getRequests(queryParams);

        if (requests.length === 0) {
          let criteria = `last ${hours} hours`;
          if (method) criteria += `, method: ${method}`;
          if (status) criteria += `, status: ${status}`;

          return {
            content: [{
              type: "text",
              text: `No requests found for criteria: ${criteria}.`
            }]
          };
        }

        // Group by status code ranges
        const statusGroups = requests.reduce((groups: any, r) => {
          const statusCode = r.status || 'Unknown';
          const range = getStatusRange(statusCode);
          if (!groups[range]) groups[range] = 0;
          groups[range]++;
          return groups;
        }, {});

        // Group by method
        const methodGroups = requests.reduce((groups: any, r) => {
          const method = r.Method || 'Unknown';
          if (!groups[method]) groups[method] = 0;
          groups[method]++;
          return groups;
        }, {});

        let result = `**Recent HTTP Requests (Last ${hours} hours)**\n\n`;
        result += `**Total Requests:** ${requests.length}\n\n`;

        result += `**Status Summary:**\n`;
        Object.entries(statusGroups).forEach(([range, count]) => {
          result += `  ${range}: ${count}\n`;
        });
        result += '\n';

        result += `**Method Summary:**\n`;
        Object.entries(methodGroups).forEach(([method, count]) => {
          result += `  ${method}: ${count}\n`;
        });
        result += '\n';

        result += `**Recent Requests:**\n`;
        requests.slice(0, 10).forEach(r => {
          result += `${r.Method || 'Unknown'} ${r.URL || 'Unknown'}\n`;
          result += `  Status: ${r.status || 'Unknown'} | User: ${r.User || 'Unknown'} | ${formatDate(r.Timestamp)}\n`;
          if (r.Error) {
            result += `  Error: ${r.Error}\n`;
          }
          result += '\n';
        });

        if (requests.length > 10) {
          result += `... and ${requests.length - 10} more requests\n`;
        }

        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    },

    {
      name: "get_error_requests",
      description: "Get recent failed HTTP requests for troubleshooting",
      inputSchema: {
        type: "object",
        properties: {
          hours: {
            type: "number",
            description: "Number of hours back to look for errors (default: 24)"
          },
          statusRange: {
            type: "string",
            description: "Status code range to filter (e.g., '4xx', '5xx', or specific code like '500')"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return (default: 20)"
          }
        }
      },
      handler: async (args: any) => {
        const hours = z.number().positive().default(24).parse(args.hours || 24);
        const statusRange = z.string().default('4xx,5xx').parse(args.statusRange || '4xx,5xx');
        const top = z.number().positive().default(20).parse(args.top || 20);

        const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const isoDate = cutoffDate.toISOString();

        let filter = `Timestamp ge ${isoDate}`;

        // Handle status range filtering
        const ranges = statusRange.split(',').map(s => s.trim());
        const statusFilters = ranges.map(range => {
          if (range.endsWith('xx')) {
            const prefix = range.charAt(0);
            return `startswith(status, '${prefix}')`;
          } else {
            return `status eq '${range}'`;
          }
        });

        if (statusFilters.length > 0) {
          filter += ` and (${statusFilters.join(' or ')})`;
        }

        const queryParams = {
          $filter: filter,
          $orderby: 'Timestamp DESC',
          $top: top
        };

        const requests = await client.getRequests(queryParams);

        if (requests.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No error requests found in the last ${hours} hours for status range: ${statusRange}.`
            }]
          };
        }

        let result = `**Error Requests (Last ${hours} hours)**\n\n`;
        result += `**Status Range:** ${statusRange}\n`;
        result += `**Total Errors:** ${requests.length}\n\n`;

        requests.forEach(r => {
          result += `**${formatDate(r.Timestamp)}**\n`;
          result += `  ${r.Method || 'Unknown'} ${r.URL || 'Unknown'}\n`;
          result += `  Status: ${r.status || 'Unknown'}\n`;
          result += `  User: ${r.User || 'Unknown'} | IP: ${r.RemoteIP || 'Unknown'}\n`;
          result += `  Size: ${formatBytes(r.Bytes)} | Time: ${formatTime(r.Time)}\n`;
          if (r.Error) {
            result += `  Error: ${r.Error}\n`;
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
    }
  ];
}

function getStatusRange(status: string): string {
  const code = parseInt(status);
  if (code >= 200 && code < 300) return '2xx Success';
  if (code >= 300 && code < 400) return '3xx Redirect';
  if (code >= 400 && code < 500) return '4xx Client Error';
  if (code >= 500) return '5xx Server Error';
  return 'Unknown';
}