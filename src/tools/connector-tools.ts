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
  properties: z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one property must be provided to update" }
  )
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
                connectors.map(c => {
                  // API returns lowercase property names
                  const id = c.connectorid || 'Unknown';
                  const workspace = c.workspaceid || 'default';
                  const type = c.connectortype || 'Unknown';
                  const autoSend = c.automationsend === 'true' || c.automationsend === true;
                  const autoReceive = c.automationreceive === 'true' || c.automationreceive === true;
                  const logLevel = c.loglevel || 'N/A';
                  const receiveInterval = c.receiveinterval || 'N/A';
                  const retryInterval = c.automationretryinterval || 'N/A';
                  const maxAttempts = c.automationmaxattempts || 'N/A';
                  const saveToSent = c.savetosentfolder === 'true' || c.savetosentfolder === true;
                  const logMessages = c.logmessages === 'true' || c.logmessages === true;
                  const maxWorkers = c.maxworkers || 'Default';
                  const maxFiles = c.maxfiles || 'Default';

                  return `• **${id}**\n` +
                    `  Workspace: ${workspace}\n` +
                    `  Type: ${type}\n` +
                    `  Auto Send: ${autoSend ? 'Yes' : 'No'}\n` +
                    `  Auto Receive: ${autoReceive ? 'Yes' : 'No'}\n` +
                    `  Receive Interval: ${receiveInterval}\n` +
                    `  Retry Interval: ${retryInterval} min\n` +
                    `  Max Attempts: ${maxAttempts}\n` +
                    `  Max Workers: ${maxWorkers}\n` +
                    `  Max Files: ${maxFiles}\n` +
                    `  Save To Sent: ${saveToSent ? 'Yes' : 'No'}\n` +
                    `  Log Level: ${logLevel}\n` +
                    `  Log Messages: ${logMessages ? 'Yes' : 'No'}\n`;
                }).join('\n')
            }
          ]
        };
      }
    },

    {
      name: "get_connector",
      description: "Get detailed information about a specific Arc connector. Shows all available properties and their current values. Use property names from this response directly in the update_connector tool to modify connector settings.",
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

        // Format the full connector config as JSON for easy reference
        const connectorJson = JSON.stringify(connector, null, 2);

        return {
          content: [{
            type: "text",
            text: `**Connector Details for: ${validated.connectorId}**\n\n` +
              `**Quick Summary:**\n` +
              `**ID:** ${connector.connectorid}\n` +
              `**Workspace:** ${connector.workspaceid || 'default'}\n` +
              `**Type:** ${connector.connectortype || 'Unknown'}\n` +
              `**Auto Send:** ${connector.automationsend === 'true' || connector.automationsend === true ? 'Yes' : 'No'}\n` +
              `**Auto Receive:** ${connector.automationreceive === 'true' || connector.automationreceive === true ? 'Yes' : 'No'}\n` +
              `**Log Level:** ${connector.loglevel || 'N/A'}\n\n` +
              `**Full Configuration (use property names from this to update the connector):**\n` +
              `\`\`\`json\n${connectorJson}\n\`\`\``
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
          connectorid: validated.connectorId,
          workspaceid: validated.workspaceId,
          connectortype: validated.connectorType,
          automationsend: validated.automationSend,
          automationretryinterval: validated.automationRetryInterval,
          automationmaxattempts: validated.automationMaxAttempts,
          automationreceive: validated.automationReceive,
          receiveinterval: validated.receiveInterval,
          maxworkers: validated.maxWorkers,
          maxfiles: validated.maxFiles,
          sendfolder: validated.sendFolder,
          receivefolder: validated.receiveFolder,
          sentfolder: validated.sentFolder,
          savetosentfolder: validated.saveToSentFolder,
          sentfolderscheme: validated.sentFolderScheme,
          loglevel: validated.logLevel,
          logsubfolderscheme: validated.logSubFolderScheme,
          logmessages: validated.logMessages
        };

        try {
          const connector = await client.createConnector(connectorData);

          let responseText = `**Connector Created Successfully**\n\n` +
            `**ID:** ${connector.connectorid}\n` +
            `**Workspace:** ${connector.workspaceid || 'default'}\n` +
            `**Type:** ${connector.connectortype}`;

          // Only show automation settings if they were explicitly provided
          if (validated.automationSend !== undefined) {
            responseText += `\n**Auto Send:** ${connector.automationsend === 'true' || connector.automationsend === true ? 'Yes' : 'No'}`;
          }
          if (validated.automationReceive !== undefined) {
            responseText += `\n**Auto Receive:** ${connector.automationreceive === 'true' || connector.automationreceive === true ? 'Yes' : 'No'}`;
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
      description: "Update an existing Arc connector's configuration. Automatically fetches the connector details to validate property names against available properties for that connector type. Only valid properties will be updated; invalid ones will be reported.\n\nIMPORTANT: The 'receiveinterval' property requires a 5-part cron expression: minute hour day-of-month month day-of-week. Example: '0 2 * * *' for daily at 2 AM. Ranges and lists supported (e.g., '*/2 8-17 * * 1,3,5' for every even minute 8AM-5PM on Mon/Wed/Fri).\n\nCommon SFTP examples: 'host', 'port', 'username', 'password', 'automationsend', 'receiveinterval'. Common AS2 examples: 'as2identifier', 'url', 'certificate', 'signingcertificate', 'useencryption', 'usesigning'.",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The unique identifier of the connector to update (required)"
          },
          properties: {
            type: "object",
            description: "Properties to update. Use lowercase property names exactly as shown in get_connector response (e.g., 'as2identifier', 'url', 'certificate', 'automationsend', etc.). Pass as a flat object of key-value pairs."
          }
        },
        required: ["connectorId", "properties"],
        additionalProperties: false
      },
      handler: async (args: any) => {
        const validated = UpdateConnectorSchema.parse(args);

        // First, fetch the connector details to see what properties are available
        const connectorDetails = await client.getConnector(validated.connectorId);

        if (!connectorDetails) {
          return {
            content: [{
              type: "text",
              text: `Connector '${validated.connectorId}' not found.`
            }]
          };
        }

        // Check for unrecognized properties and warn if any don't exist in the connector config
        const warnings: string[] = [];
        const validProperties = new Set(Object.keys(connectorDetails).map(k => k.toLowerCase()));

        const unknownProps = Object.keys(validated.properties).filter(prop =>
          !validProperties.has(prop.toLowerCase())
        );

        if (unknownProps.length > 0) {
          warnings.push(`The following properties don't exist in this connector type and were not updated:\n  • ${unknownProps.join('\n  • ')}`);
        }

        // Special validation for receiveinterval - must be a valid cron expression
        if (validated.properties.receiveinterval) {
          const cronPattern = String(validated.properties.receiveinterval).trim();
          // Basic cron validation: should have 5 parts separated by spaces
          // Format: minute hour day-of-month month day-of-week
          const cronParts = cronPattern.split(/\s+/);
          if (cronParts.length !== 5) {
            warnings.push(`'receiveinterval' value '${cronPattern}' doesn't appear to be a valid cron expression. Expected format: 'minute hour day-of-month month day-of-week' (e.g., '0 2 * * *' for daily at 2 AM). The value was not updated.`);
            // Remove receiveinterval from update since it's invalid
            delete validated.properties.receiveinterval;
          }
        }

        // Only update properties that exist in the connector configuration
        const validUpdateProps = Object.fromEntries(
          Object.entries(validated.properties).filter(([key]) => validProperties.has(key.toLowerCase()))
        );

        if (Object.keys(validUpdateProps).length === 0) {
          return {
            content: [{
              type: "text",
              text: `**No Valid Properties to Update**\n\n` +
                `None of the provided properties match this connector's available properties.\n\n` +
                `Available properties for ${connectorDetails.connectortype} connector:\n` +
                `${Object.keys(connectorDetails).sort().join(', ')}`
            }]
          };
        }

        const updatedConnector = await client.updateConnector(validated.connectorId, validUpdateProps);

        let resultText = `**Connector Updated Successfully**\n\n` +
          `**ID:** ${updatedConnector.connectorid}\n` +
          `**Workspace:** ${updatedConnector.workspaceid || 'default'}\n` +
          `**Type:** ${updatedConnector.connectortype || 'Unknown'}\n\n`;

        if (warnings.length > 0) {
          resultText += `**Warnings:**\n${warnings.join('\n')}\n\n`;
        }

        resultText += `**Successfully Updated Properties:**\n`;
        Object.entries(validUpdateProps).forEach(([key, value]) => {
          resultText += `  • ${key}: ${value}\n`;
        });

        return {
          content: [{
            type: "text",
            text: resultText
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