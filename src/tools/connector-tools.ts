import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetConnectorsSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetConnectorSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required")
});

const CreateConnectorSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required"),
  workspaceId: z.string().optional(),
  connectorType: z.string().min(1, "Connector type is required"),
  automationSend: z.boolean().optional(),
  automationRetryInterval: z.number().optional(),
  automationMaxAttempts: z.number().optional(),
  automationReceive: z.boolean().optional(),
  receiveInterval: z.string().optional(),
  maxWorkers: z.number().optional(),
  maxFiles: z.number().optional(),
  sendFolder: z.string().optional(),
  receiveFolder: z.string().optional(),
  sentFolder: z.string().optional(),
  saveToSentFolder: z.boolean().optional(),
  sentFolderScheme: z.string().optional(),
  logLevel: z.string().optional(),
  logSubFolderScheme: z.string().optional(),
  logMessages: z.boolean().optional()
});

const UpdateConnectorSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required"),
  workspaceId: z.string().optional(),
  connectorType: z.string().optional(),
  automationSend: z.boolean().optional(),
  automationRetryInterval: z.number().optional(),
  automationMaxAttempts: z.number().optional(),
  automationReceive: z.boolean().optional(),
  receiveInterval: z.string().optional(),
  maxWorkers: z.number().optional(),
  maxFiles: z.number().optional(),
  sendFolder: z.string().optional(),
  receiveFolder: z.string().optional(),
  sentFolder: z.string().optional(),
  saveToSentFolder: z.boolean().optional(),
  sentFolderScheme: z.string().optional(),
  logLevel: z.string().optional(),
  logSubFolderScheme: z.string().optional(),
  logMessages: z.boolean().optional()
});

const DeleteConnectorSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required")
});

const CopyConnectorSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  connectorId: z.string().min(1, "Connector ID is required"),
  newConnectorId: z.string().min(1, "New connector ID is required"),
  newWorkspaceId: z.string().optional()
});

const ReceiveFileSchema = z.object({
  workspaceId: z.string().optional(),
  connectorId: z.string().min(1, "Connector ID is required")
});

const SendFileSchema = z.object({
  workspaceId: z.string().optional(),
  connectorId: z.string().min(1, "Connector ID is required"),
  portId: z.string().optional(),
  messageId: z.string().optional(),
  file: z.string().optional(),
  subfolder: z.string().optional(),
  attachment: z.string().optional(),
  formatResult: z.string().optional()
});

const SetFlowSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  connections: z.array(z.object({
    connectorId: z.string().min(1, "Connector ID is required"),
    connections: z.array(z.union([
      z.string(), // Simple string connection
      z.object({  // Complex connection object
        dest: z.string().optional(),
        output: z.string().optional()
      })
    ]))
  })).min(1, "At least one connector connection is required")
});

export function createConnectorTools(client: ArcApiClient) {
  return [
    {
      name: "list_connectors",
      description: "List Arc connectors with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'ConnectorId,Name,Type')"
          },
          filter: {
            type: "string", 
            description: "OData filter expression (e.g., \"Type eq 'AS2'\" or \"Enabled eq true\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Name ASC' or 'ConnectorId DESC')"
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
        const validated = GetConnectorsSchema.parse(args);
        
        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby,
          $top: validated.top,
          $skip: validated.skip
        };

        const connectors = await client.getConnectors(queryParams);
        
        return {
          content: [
            {
              type: "text",
              text: `**Found ${connectors.length} connectors:**\n\n` +
                connectors.map(c => 
                  `• **${c.ConnectorId}**\n` +
                  `  Workspace: ${c.WorkspaceId || 'default'}\n` +
                  `  Type: ${c.ConnectorType || 'Unknown'}\n` +
                  `  Auto Send: ${c.AutomationSend ? 'Yes' : 'No'}\n` +
                  `  Auto Receive: ${c.AutomationReceive ? 'Yes' : 'No'}\n` +
                  `  Log Level: ${c.LogLevel || 'N/A'}\n`
                ).join('\n')
            }
          ]
        };
      }
    },

    {
      name: "get_connector", 
      description: "Get detailed information about a specific Arc connector",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The unique identifier of the connector"
          }
        },
        required: ["connectorId"]
      },
      handler: async (args: any) => {
        const validated = GetConnectorSchema.parse(args);
        const connector = await client.getConnector(validated.connectorId);
        
        if (!connector) {
          return {
            content: [{
              type: "text", 
              text: `Connector '${validated.connectorId}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Connector Details**\n\n` +
              `**ID:** ${connector.ConnectorId}\n` +
              `**Workspace:** ${connector.WorkspaceId || 'default'}\n` +
              `**Type:** ${connector.ConnectorType || 'Unknown'}\n` +
              `**Auto Send:** ${connector.AutomationSend ? 'Yes' : 'No'}\n` +
              `**Auto Receive:** ${connector.AutomationReceive ? 'Yes' : 'No'}\n` +
              `**Retry Interval:** ${connector.AutomationRetryInterval || 'N/A'} minutes\n` +
              `**Max Attempts:** ${connector.AutomationMaxAttempts || 'N/A'}\n` +
              `**Receive Interval:** ${connector.ReceiveInterval || 'N/A'}\n` +
              `**Max Workers:** ${connector.MaxWorkers || 'Default'}\n` +
              `**Max Files:** ${connector.MaxFiles || 'Default'}\n` +
              `**Log Level:** ${connector.LogLevel || 'N/A'}\n` +
              `**Log Messages:** ${connector.LogMessages ? 'Yes' : 'No'}\n` +
              `**Save To Sent:** ${connector.SaveToSentFolder ? 'Yes' : 'No'}\n` +
              (connector.SentFolderScheme ? `**Sent Folder Scheme:** ${connector.SentFolderScheme}\n` : '') +
              (connector.LogSubFolderScheme ? `**Log Subfolder Scheme:** ${connector.LogSubFolderScheme}\n` : '')
          }]
        };
      }
    },

    {
      name: "create_connector",
      description: "Create a new Arc connector. Requires connectorId and connectorType. If workspaceId is not specified, connector is created in the default workspace.",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string", 
            description: "Unique identifier for the new connector (required)"
          },
          workspaceId: {
            type: "string",
            description: "The workspace ID (defaults to 'default' if not specified)"
          },
          connectorType: {
            type: "string",
            description: "Connector type (e.g., 'AS2', 'FTP', 'SFTP', 'REST')"
          },
          automationSend: {
            type: "boolean",
            description: "Whether to automatically process files in the Send folder"
          },
          automationRetryInterval: {
            type: "number",
            description: "Time to wait after error before retry, in minutes"
          },
          automationMaxAttempts: {
            type: "number",
            description: "Maximum retry attempts (0 for unlimited)"
          },
          automationReceive: {
            type: "boolean",
            description: "Whether to automatically receive files at specified interval"
          },
          receiveInterval: {
            type: "string", 
            description: "Interval for automatic file receiving"
          },
          maxWorkers: {
            type: "number",
            description: "Maximum workers from pool for this connector"
          },
          maxFiles: {
            type: "number",
            description: "Maximum files to process per worker assignment"
          },
          logLevel: {
            type: "string",
            description: "Log level: None, Error, Warning, Info, Debug, or Trace"
          },
          logMessages: {
            type: "boolean",
            description: "Whether to keep message copies in Logs directory"
          },
          saveToSentFolder: {
            type: "boolean",
            description: "Whether to keep copies in Sent folder"
          },
          sentFolderScheme: {
            type: "string",
            description: "Sent folder structure: Daily, Weekly, Monthly, or Yearly"
          },
          logSubFolderScheme: {
            type: "string",
            description: "Log folder structure: Daily, Weekly, Monthly, or Yearly"
          }
        },
        required: ["connectorId", "connectorType"]
      },
      handler: async (args: any) => {
        const validated = CreateConnectorSchema.parse(args);
        
        const connectorData = {
          ConnectorId: validated.connectorId,
          WorkspaceId: validated.workspaceId,
          ConnectorType: validated.connectorType,
          AutomationSend: validated.automationSend,
          AutomationRetryInterval: validated.automationRetryInterval,
          AutomationMaxAttempts: validated.automationMaxAttempts,
          AutomationReceive: validated.automationReceive,
          ReceiveInterval: validated.receiveInterval,
          MaxWorkers: validated.maxWorkers,
          MaxFiles: validated.maxFiles,
          SendFolder: validated.sendFolder,
          ReceiveFolder: validated.receiveFolder,
          SentFolder: validated.sentFolder,
          SaveToSentFolder: validated.saveToSentFolder,
          SentFolderScheme: validated.sentFolderScheme,
          LogLevel: validated.logLevel,
          LogSubFolderScheme: validated.logSubFolderScheme,
          LogMessages: validated.logMessages
        };

        try {
          const connector = await client.createConnector(connectorData);
          
          let responseText = `**Connector Created Successfully**\n\n` +
            `**ID:** ${connector.ConnectorId}\n` +
            `**Workspace:** ${connector.WorkspaceId || 'default'}\n` +
            `**Type:** ${connector.ConnectorType}`;

          // Only show automation settings if they were explicitly provided
          if (validated.automationSend !== undefined) {
            responseText += `\n**Auto Send:** ${connector.AutomationSend ? 'Yes' : 'No'}`;
          }
          if (validated.automationReceive !== undefined) {
            responseText += `\n**Auto Receive:** ${connector.AutomationReceive ? 'Yes' : 'No'}`;
          }

          return {
            content: [{
              type: "text",
              text: responseText
            }]
          };
        } catch (error: any) {
          // Check for duplicate connector error
          if (error.response?.data?.error?.code === 'CreateConnector' && 
              error.response?.data?.error?.message?.includes('already exists')) {
            return {
              content: [{
                type: "text",
                text: `**Connector Already Exists**\n\nConnector '${validated.connectorId}' already exists in workspace '${validated.workspaceId || 'default'}'. Connector IDs are case-insensitive.`
              }]
            };
          }
          
          // Re-throw other errors to be handled by the main error handler
          throw error;
        }
      }
    },

    {
      name: "update_connector",
      description: "Update an existing Arc connector's configuration", 
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The unique identifier of the connector to update"
          },
          workspaceId: {
            type: "string",
            description: "The workspace ID"
          },
          connectorType: {
            type: "string",
            description: "Connector type (e.g., 'AS2', 'FTP', 'SFTP', 'REST')"
          },
          automationSend: {
            type: "boolean",
            description: "Whether to automatically process files in the Send folder"
          },
          automationRetryInterval: {
            type: "number",
            description: "Time to wait after error before retry, in minutes"
          },
          automationMaxAttempts: {
            type: "number",
            description: "Maximum retry attempts (0 for unlimited)"
          },
          automationReceive: {
            type: "boolean",
            description: "Whether to automatically receive files at specified interval"
          },
          receiveInterval: {
            type: "string", 
            description: "Interval for automatic file receiving"
          },
          maxWorkers: {
            type: "number",
            description: "Maximum workers from pool for this connector"
          },
          maxFiles: {
            type: "number",
            description: "Maximum files to process per worker assignment"
          },
          logLevel: {
            type: "string",
            description: "Log level: None, Error, Warning, Info, Debug, or Trace"
          },
          logMessages: {
            type: "boolean",
            description: "Whether to keep message copies in Logs directory"
          },
          saveToSentFolder: {
            type: "boolean",
            description: "Whether to keep copies in Sent folder"
          },
          sentFolderScheme: {
            type: "string",
            description: "Sent folder structure: Daily, Weekly, Monthly, or Yearly"
          },
          logSubFolderScheme: {
            type: "string",
            description: "Log folder structure: Daily, Weekly, Monthly, or Yearly"
          }
        },
        required: ["connectorId"]
      },
      handler: async (args: any) => {
        const validated = UpdateConnectorSchema.parse(args);
        
        const updates = {
          ...(validated.workspaceId !== undefined && { WorkspaceId: validated.workspaceId }),
          ...(validated.connectorType !== undefined && { ConnectorType: validated.connectorType }),
          ...(validated.automationSend !== undefined && { AutomationSend: validated.automationSend }),
          ...(validated.automationRetryInterval !== undefined && { AutomationRetryInterval: validated.automationRetryInterval }),
          ...(validated.automationMaxAttempts !== undefined && { AutomationMaxAttempts: validated.automationMaxAttempts }),
          ...(validated.automationReceive !== undefined && { AutomationReceive: validated.automationReceive }),
          ...(validated.receiveInterval !== undefined && { ReceiveInterval: validated.receiveInterval }),
          ...(validated.maxWorkers !== undefined && { MaxWorkers: validated.maxWorkers }),
          ...(validated.maxFiles !== undefined && { MaxFiles: validated.maxFiles }),
          ...(validated.sendFolder !== undefined && { SendFolder: validated.sendFolder }),
          ...(validated.receiveFolder !== undefined && { ReceiveFolder: validated.receiveFolder }),
          ...(validated.sentFolder !== undefined && { SentFolder: validated.sentFolder }),
          ...(validated.saveToSentFolder !== undefined && { SaveToSentFolder: validated.saveToSentFolder }),
          ...(validated.sentFolderScheme !== undefined && { SentFolderScheme: validated.sentFolderScheme }),
          ...(validated.logLevel !== undefined && { LogLevel: validated.logLevel }),
          ...(validated.logSubFolderScheme !== undefined && { LogSubFolderScheme: validated.logSubFolderScheme }),
          ...(validated.logMessages !== undefined && { LogMessages: validated.logMessages })
        };

        const connector = await client.updateConnector(validated.connectorId, updates);
        
        return {
          content: [{
            type: "text", 
            text: `**Connector Updated Successfully**\n\n` +
              `**ID:** ${connector.ConnectorId}\n` +
              `**Workspace:** ${connector.WorkspaceId || 'default'}\n` +
              `**Type:** ${connector.ConnectorType || 'Unknown'}\n` +
              `**Auto Send:** ${connector.AutomationSend ? 'Yes' : 'No'}\n` +
              `**Auto Receive:** ${connector.AutomationReceive ? 'Yes' : 'No'}`
          }]
        };
      }
    },

    {
      name: "delete_connector",
      description: "Delete an Arc connector permanently",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The unique identifier of the connector to delete"
          }
        },
        required: ["connectorId"]
      },
      handler: async (args: any) => {
        const validated = DeleteConnectorSchema.parse(args);

        await client.deleteConnector(validated.connectorId);

        return {
          content: [{
            type: "text",
            text: `**Connector Deleted**\n\nConnector '${validated.connectorId}' has been permanently deleted.`
          }]
        };
      }
    },

    {
      name: "copy_connector",
      description: "Copy an Arc connector settings to a new connector with a specified ID. Optionally copy to a different workspace.",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The ID of the workspace containing the source connector"
          },
          connectorId: {
            type: "string",
            description: "The ID of the connector to copy"
          },
          newConnectorId: {
            type: "string",
            description: "The ID for the new connector"
          },
          newWorkspaceId: {
            type: "string",
            description: "The ID of the destination workspace. If not specified, the new connector will be created in the same workspace as the source connector"
          }
        },
        required: ["workspaceId", "connectorId", "newConnectorId"]
      },
      handler: async (args: any) => {
        const validated = CopyConnectorSchema.parse(args);

        const copyInput = {
          WorkspaceId: validated.workspaceId,
          ConnectorId: validated.connectorId,
          NewConnectorId: validated.newConnectorId,
          NewWorkspaceId: validated.newWorkspaceId
        };

        const result = await client.copyConnector(copyInput);

        const targetWorkspace = validated.newWorkspaceId || validated.workspaceId;
        let responseText = `**Connector Copied Successfully**\n\n` +
          `**Source:** ${validated.connectorId} (workspace: ${validated.workspaceId})\n` +
          `**Destination:** ${validated.newConnectorId} (workspace: ${targetWorkspace})`;

        if (result && result.length > 0 && result[0].AllowedPrivileges) {
          responseText += `\n**Privileges:** ${result[0].AllowedPrivileges}`;
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
      name: "receive_file",
      description: "Trigger the receive action of a connector to download/receive files",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID of the connector"
          },
          connectorId: {
            type: "string",
            description: "The connector ID (required) - triggers the receive action for this connector"
          }
        },
        required: ["connectorId"]
      },
      handler: async (args: any) => {
        const validated = ReceiveFileSchema.parse(args);

        const receiveInput = {
          WorkspaceId: validated.workspaceId,
          ConnectorId: validated.connectorId
        };

        const results = await client.receiveFile(receiveInput);

        if (!results || results.length === 0) {
          return {
            content: [{
              type: "text",
              text: "**No Files Received**\n\nNo files were downloaded or the connector returned no results."
            }]
          };
        }

        // Filter out null/empty file entries (when operation succeeds but no files downloaded)
        const actualFiles = results.filter(r => r.File && r.File.trim() !== '');

        if (actualFiles.length === 0) {
          return {
            content: [{
              type: "text",
              text: `**Receive Operation Completed**\n\n` +
                `**Connector:** ${validated.connectorId}\n` +
                (validated.workspaceId ? `**Workspace:** ${validated.workspaceId}\n` : '') +
                `**Result:** Operation completed successfully but no files were available to download.`
            }]
          };
        }

        let responseText = `**File Receive Operation Completed**\n\n` +
          `**Connector:** ${validated.connectorId}\n`;

        if (validated.workspaceId) responseText += `**Workspace:** ${validated.workspaceId}\n`;

        responseText += `**Files Processed:** ${actualFiles.length}\n\n`;

        const successfulFiles = actualFiles.filter(r => !r.ErrorMessage);
        const failedFiles = actualFiles.filter(r => r.ErrorMessage);

        if (successfulFiles.length > 0) {
          responseText += `**Successfully Received (${successfulFiles.length}):**\n`;
          successfulFiles.forEach(file => {
            responseText += `• **${file.File || 'Unknown'}**`;
            if (file.FileSize) responseText += ` (${file.FileSize} bytes)`;
            if (file.Subfolder) responseText += ` in ${file.Subfolder}`;
            if (file.MessageId) responseText += ` [${file.MessageId}]`;
            responseText += "\n";
          });
          responseText += "\n";
        }

        if (failedFiles.length > 0) {
          responseText += `**Failed (${failedFiles.length}):**\n`;
          failedFiles.forEach(file => {
            responseText += `• **${file.File || 'Unknown'}**: ${file.ErrorMessage}\n`;
          });
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
      name: "send_file",
      description: "Trigger the send action of a connector to upload/send files from the send folder",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID of the connector"
          },
          connectorId: {
            type: "string",
            description: "The connector ID (required) - triggers the send action for this connector"
          },
          portId: {
            type: "string",
            description: "The port ID"
          },
          messageId: {
            type: "string",
            description: "The message ID"
          },
          file: {
            type: "string",
            description: "The specific file name to send"
          },
          subfolder: {
            type: "string",
            description: "The subfolder of the file"
          },
          attachment: {
            type: "string",
            description: "The attachment file"
          },
          formatResult: {
            type: "string",
            description: "Whether to format the result"
          }
        },
        required: ["connectorId"]
      },
      handler: async (args: any) => {
        const validated = SendFileSchema.parse(args);

        const sendInput = {
          WorkspaceId: validated.workspaceId,
          ConnectorId: validated.connectorId,
          PortId: validated.portId,
          MessageId: validated.messageId,
          File: validated.file,
          Subfolder: validated.subfolder,
          'Attachment#': validated.attachment,
          FormatResult: validated.formatResult
        };

        try {
          const results = await client.sendFile(sendInput);

        if (!results || results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `**Send Operation Completed**\n\n` +
                `**Connector:** ${validated.connectorId}\n` +
                (validated.workspaceId ? `**Workspace:** ${validated.workspaceId}\n` : '') +
                `**Result:** Operation completed successfully but no files were available to send from the send folder.`
            }]
          };
        }

        // Filter out null/empty file entries (similar to receiveFile)
        const actualFiles = results.filter(r => r.File && r.File.trim() !== '');

        if (actualFiles.length === 0) {
          return {
            content: [{
              type: "text",
              text: `**Send Operation Completed**\n\n` +
                `**Connector:** ${validated.connectorId}\n` +
                (validated.workspaceId ? `**Workspace:** ${validated.workspaceId}\n` : '') +
                `**Result:** Operation completed successfully but no files were available to send from the send folder.`
            }]
          };
        }

        let responseText = `**File Send Operation Completed**\n\n` +
          `**Connector:** ${validated.connectorId}\n`;

        if (validated.workspaceId) responseText += `**Workspace:** ${validated.workspaceId}\n`;
        if (validated.file) responseText += `**Specific File:** ${validated.file}\n`;
        if (validated.subfolder) responseText += `**Subfolder:** ${validated.subfolder}\n`;

        responseText += `**Files Sent:** ${actualFiles.length}\n\n`;

        responseText += `**Successfully Sent:**\n`;
        actualFiles.forEach(file => {
          responseText += `• **${file.File || 'Unknown'}**`;
          if (file.MessageId) responseText += ` [${file.MessageId}]`;
          responseText += "\n";
        });

        return {
          content: [{
            type: "text",
            text: responseText
          }]
        };
        } catch (error: any) {
          // Handle API errors that contain detailed error information
          let errorMessage = `Error during send operation: ${error.message}`;

          if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            errorMessage = `**Send Operation Failed**\n\n` +
              `**Connector:** ${validated.connectorId}\n` +
              (validated.workspaceId ? `**Workspace:** ${validated.workspaceId}\n` : '') +
              `**Error Code:** ${apiError.code || 'Unknown'}\n` +
              `**Error Message:** ${apiError.message || 'No details provided'}`;
          }

          return {
            content: [{
              type: "text",
              text: errorMessage
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'set_flow',
      description: 'Configure connector flow connections within a workspace',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The workspace ID where the flow connections will be configured'
          },
          connections: {
            type: 'array',
            description: 'Array of connector flow configurations',
            items: {
              type: 'object',
              properties: {
                connectorId: {
                  type: 'string',
                  description: 'The source connector ID'
                },
                connections: {
                  type: 'array',
                  description: 'Array of destination connections (strings or objects with dest/output properties)',
                  items: {
                    oneOf: [
                      {
                        type: 'string',
                        description: 'Simple destination connector ID'
                      },
                      {
                        type: 'object',
                        properties: {
                          dest: {
                            type: 'string',
                            description: 'Destination connector ID'
                          },
                          output: {
                            type: 'string',
                            description: 'Output name for the connection'
                          }
                        }
                      }
                    ]
                  }
                }
              },
              required: ['connectorId', 'connections']
            }
          }
        },
        required: ['workspaceId', 'connections']
      },
      handler: async (args: any) => {
        try {
          const validated = SetFlowSchema.parse(args);

          const setFlowInput = {
            WorkspaceId: validated.workspaceId,
            Value: validated.connections.map(conn => ({
              ConnectorId: conn.connectorId,
              Connections: conn.connections
            }))
          };

          await client.setFlow(setFlowInput);

          let responseText = `**Flow Configuration Updated Successfully**\n\n` +
            `**Workspace:** ${validated.workspaceId}\n` +
            `**Connectors Configured:** ${validated.connections.length}\n\n`;

          responseText += `**Flow Connections:**\n`;
          validated.connections.forEach(conn => {
            responseText += `• **${conn.connectorId}** → `;
            const connectionList = conn.connections.map(c =>
              typeof c === 'string' ? c : `${c.dest || 'N/A'}${c.output ? ` (${c.output})` : ''}`
            ).join(', ');
            responseText += `${connectionList}\n`;
          });

          return {
            content: [{
              type: "text",
              text: responseText
            }]
          };
        } catch (error: any) {
          let errorMessage = `Error configuring flow: ${error.message}`;

          if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            errorMessage = `**Flow Configuration Failed**\n\n` +
              `**Workspace:** ${args.workspaceId || 'N/A'}\n` +
              `**Error Code:** ${apiError.code || 'Unknown'}\n` +
              `**Error Message:** ${apiError.message || 'No details provided'}`;
          }

          return {
            content: [{
              type: "text",
              text: errorMessage
            }],
            isError: true
          };
        }
      }
    }
  ];
}