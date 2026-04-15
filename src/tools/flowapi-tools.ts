import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

const ListFlowApisSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetFlowApiSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required")
});

const CreateFlowApiSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  method: z.string().optional(),
  connectors: z.string().optional(),
  queryParameters: z.string().optional(),
  bodyType: z.string().optional(),
  requestContentType: z.string().optional(),
  requestBody: z.string().optional(),
  responseContentType: z.string().optional(),
  requestSample: z.string().optional(),
  responseSample: z.string().optional()
});

const DeleteFlowApiSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required")
});

export function createFlowApiTools(client: ArcApiClient) {
  return [
    {
      name: "list_flow_apis",
      description: "List Arc flow APIs with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'WorkspaceId,Name,Method')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"WorkspaceId eq 'default'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Name ASC')"
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
        const validated = ListFlowApisSchema.parse(args);

        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby,
          $top: validated.top,
          $skip: validated.skip
        };

        const flowApis = await client.getFlowApis(queryParams);

        if (flowApis.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No flow APIs found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Found ${flowApis.length} flow API(s):**\n\n` +
              flowApis.map(f => {
                return `• **${f.Name || 'N/A'}** (Workspace: ${f.WorkspaceId})\n` +
                  (f.Description ? `  Description: ${f.Description}\n` : '') +
                  `  Method: ${f.Method || 'N/A'}\n` +
                  `  Connectors: ${f.Connectors || 'N/A'}\n` +
                  `  Body Type: ${f.BodyType || 'N/A'}\n` +
                  `  Request Content-Type: ${f.RequestContentType || 'N/A'}\n` +
                  `  Response Content-Type: ${f.ResponseContentType || 'N/A'}\n`;
              }).join('\n')
          }]
        };
      }
    },

    {
      name: "get_flow_api",
      description: "Get detailed information about a specific Arc flow API by workspace ID",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID of the flow API to retrieve"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = GetFlowApiSchema.parse(args);
        const flowApi = await client.getFlowApi(validated.workspaceId);

        if (!flowApi) {
          return {
            content: [{
              type: "text",
              text: `Flow API for workspace '${validated.workspaceId}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Flow API Details**\n\n` +
              `**Workspace ID:** ${flowApi.WorkspaceId}\n` +
              `**Name:** ${flowApi.Name || 'N/A'}\n` +
              `**Description:** ${flowApi.Description || 'N/A'}\n` +
              `**Method:** ${flowApi.Method || 'N/A'}\n` +
              `**Connectors:** ${flowApi.Connectors || 'N/A'}\n` +
              `**Query Parameters:** ${flowApi.QueryParameters || 'N/A'}\n` +
              `**Body Type:** ${flowApi.BodyType || 'N/A'}\n` +
              `**Request Content-Type:** ${flowApi.RequestContentType || 'N/A'}\n` +
              `**Request Body:** ${flowApi.RequestBody || 'N/A'}\n` +
              `**Response Content-Type:** ${flowApi.ResponseContentType || 'N/A'}\n` +
              (flowApi.RequestSample
                ? `**Request Sample:**\n\`\`\`\n${flowApi.RequestSample}\n\`\`\`\n`
                : '') +
              (flowApi.ResponseSample
                ? `**Response Sample:**\n\`\`\`\n${flowApi.ResponseSample}\n\`\`\`\n`
                : '')
          }]
        };
      }
    },

    {
      name: "create_flow_api",
      description: "Create a new Arc flow API for a workspace",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID to associate with the flow API (required)"
          },
          name: {
            type: "string",
            description: "The name of the flow API"
          },
          description: {
            type: "string",
            description: "A description of the flow API"
          },
          method: {
            type: "string",
            description: "The HTTP method supported by the flow API (e.g., GET, POST)"
          },
          connectors: {
            type: "string",
            description: "Comma-separated list of connector IDs associated with the flow API"
          },
          queryParameters: {
            type: "string",
            description: "Colon-delimited list of query parameter names"
          },
          bodyType: {
            type: "string",
            description: "The data type of the HTTP request body (e.g., Raw, Form-Data, x-www-form-urlencoded)"
          },
          requestContentType: {
            type: "string",
            description: "The content type of the HTTP request"
          },
          requestBody: {
            type: "string",
            description: "Colon-delimited list of key names when body type is Form-Data or x-www-form-urlencoded"
          },
          responseContentType: {
            type: "string",
            description: "The content type of the HTTP response"
          },
          requestSample: {
            type: "string",
            description: "Sample request data when body type is Raw"
          },
          responseSample: {
            type: "string",
            description: "Sample response data"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = CreateFlowApiSchema.parse(args);

        const flowApiData = {
          WorkspaceId: validated.workspaceId,
          ...(validated.name !== undefined && { Name: validated.name }),
          ...(validated.description !== undefined && { Description: validated.description }),
          ...(validated.method !== undefined && { Method: validated.method }),
          ...(validated.connectors !== undefined && { Connectors: validated.connectors }),
          ...(validated.queryParameters !== undefined && { QueryParameters: validated.queryParameters }),
          ...(validated.bodyType !== undefined && { BodyType: validated.bodyType }),
          ...(validated.requestContentType !== undefined && { RequestContentType: validated.requestContentType }),
          ...(validated.requestBody !== undefined && { RequestBody: validated.requestBody }),
          ...(validated.responseContentType !== undefined && { ResponseContentType: validated.responseContentType }),
          ...(validated.requestSample !== undefined && { RequestSample: validated.requestSample }),
          ...(validated.responseSample !== undefined && { ResponseSample: validated.responseSample })
        };

        const flowApi = await client.createFlowApi(flowApiData);

        return {
          content: [{
            type: "text",
            text: `**Flow API Created Successfully**\n\n` +
              `**Workspace ID:** ${flowApi.WorkspaceId}\n` +
              `**Name:** ${flowApi.Name || 'N/A'}\n` +
              `**Method:** ${flowApi.Method || 'N/A'}\n` +
              `**Connectors:** ${flowApi.Connectors || 'N/A'}`
          }]
        };
      }
    },

    {
      name: "delete_flow_api",
      description: "Delete an Arc flow API permanently",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID of the flow API to delete"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = DeleteFlowApiSchema.parse(args);
        await client.deleteFlowApi(validated.workspaceId);

        return {
          content: [{
            type: "text",
            text: `**Flow API Deleted**\n\nFlow API for workspace '${validated.workspaceId}' has been permanently deleted.`
          }]
        };
      }
    }
  ];
}
