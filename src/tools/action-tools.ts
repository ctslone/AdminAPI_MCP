import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';
import type { CleanupInput } from '../types/arc-api.js';

const ExportSchema = z.object({
  workspaceId: z.string().optional(),
  connectorId: z.string().optional(),
  flowAPI: z.string().optional(),
  includeProfile: z.string().optional(),
  flowPassword: z.string().optional(),
  globalSettings: z.string().optional(),
  profileSettings: z.string().optional()
});

const ImportSchema = z.object({
  arcflow: z.string().min(1, "Arcflow data is required"),
  duplicateAction: z.string().optional(),
  overwrite: z.string().optional(),
  workspaceId: z.string().optional(),
  inputName: z.string().optional(),
  dataDirectory: z.string().optional(),
  decryptPassword: z.string().optional(),
  globalSettings: z.string().optional(),
  profileSettings: z.string().optional()
});

export function createActionTools(client: ArcApiClient) {
  return [
    {
      name: 'cleanup_files',
      description: 'Clean up log files for specified workspaces and connectors',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Whether to Archive or Delete files when performing the cleanup. If not specified, the cleanup settings specified in the application will be used.',
            enum: ['Archive', 'Delete']
          },
          age: {
            type: 'string',
            description: 'Minimum age of the files to be cleaned up, in days. Files more recent than the specified age will not be cleaned up. If not specified, the cleanup settings specified in the application will be used.'
          },
          workspaceId: {
            type: 'string',
            description: 'The Id of the workspace. If not set, all workspaces will be cleaned up.'
          },
          connectorId: {
            type: 'string',
            description: 'The Id of the connector to be cleaned up. If not set, all connectors in the applicable workspace(s) will be cleaned up.'
          }
        }
      },
      handler: async (args: any) => {
        try {
          const cleanupInput: CleanupInput = {};

          // Map the input parameters to the cleanup input format
          if (args.type) cleanupInput.Type = args.type;
          if (args.age) cleanupInput.Age = args.age;
          if (args.workspaceId) cleanupInput.WorkspaceId = args.workspaceId;
          if (args.connectorId) cleanupInput.ConnectorId = args.connectorId;

          const result = await client.cleanup(cleanupInput);

          // Build summary message
          let summary = 'Cleanup operation completed successfully';

          const scope = [];
          if (args.workspaceId) {
            scope.push(`workspace: ${args.workspaceId}`);
          } else {
            scope.push('all workspaces');
          }

          if (args.connectorId) {
            scope.push(`connector: ${args.connectorId}`);
          } else {
            scope.push('all connectors');
          }

          const scopeText = scope.join(', ');
          const typeText = args.type ? ` (${args.type} mode)` : ' (using default settings)';
          const ageText = args.age ? ` for files older than ${args.age} days` : '';

          summary = `Cleanup operation completed for ${scopeText}${typeText}${ageText}`;

          // Include any additional response data
          let details = '';
          if (result && typeof result === 'object') {
            const responseKeys = Object.keys(result).filter(key => key !== 'success');
            if (responseKeys.length > 0) {
              const responseDetails = responseKeys.map(key => `${key}: ${result[key]}`).join('\n');
              details = `\n\n**Response Details:**\n${responseDetails}`;
            }
          }

          return {
            content: [{
              type: "text",
              text: `${summary}${details}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error during cleanup operation: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'export_settings',
      description: 'Export connector settings and workspace configuration to arcflow format',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The ID of the workspace to export. If unspecified, defaults to \'default\''
          },
          connectorId: {
            type: 'string',
            description: 'The ID of the connector to export. If unspecified, all connectors will be exported'
          },
          flowAPI: {
            type: 'string',
            description: 'The ID of the flow API'
          },
          includeProfile: {
            type: 'string',
            description: 'Whether profile related settings should be included in the exported arcflow'
          },
          flowPassword: {
            type: 'string',
            description: 'The password for encrypting sensitive values'
          },
          globalSettings: {
            type: 'string',
            description: 'Global settings to include. Comma-separated values or "ALL". Values: Partners, Documents, Users, Roles, Certificates, Connections, Vaults, Reports, Alerts, Advanced, AdminAPI, SSO'
          },
          profileSettings: {
            type: 'string',
            description: 'Profiles to include. Comma-separated values or "MATCHING" for matching profiles. Values: AS2, AS4, GISB, RosettaNet, FTPServer, SFTPServer, HL7MLLP, OFTP'
          }
        }
      },
      handler: async (args: any) => {
        try {
          const validated = ExportSchema.parse(args);

          const exportInput = {
            WorkspaceId: validated.workspaceId,
            'ConnectorId#': validated.connectorId,
            'FlowAPI#': validated.flowAPI,
            IncludeProfile: validated.includeProfile,
            FlowPassword: validated.flowPassword,
            GlobalSettings: validated.globalSettings,
            ProfileSettings: validated.profileSettings
          };

          const result = await client.export(exportInput);

          let responseText = `**Export Completed Successfully**`;

          // Add export parameters
          if (validated.workspaceId) responseText += `\n**Workspace:** ${validated.workspaceId}`;
          if (validated.connectorId) responseText += `\n**Connector:** ${validated.connectorId}`;
          if (validated.flowAPI) responseText += `\n**Flow API:** ${validated.flowAPI}`;
          if (validated.includeProfile) responseText += `\n**Include Profile:** ${validated.includeProfile}`;
          if (validated.globalSettings) responseText += `\n**Global Settings:** ${validated.globalSettings}`;
          if (validated.profileSettings) responseText += `\n**Profile Settings:** ${validated.profileSettings}`;

          // Add arcflow details
          if (result && result.length > 0 && result[0].Arcflow) {
            const arcflowSize = result[0].Arcflow.length;
            responseText += `\n\n**Arcflow Generated:** Base64 encoded (${arcflowSize} characters)`;
            responseText += `\n**Preview:** ${result[0].Arcflow.substring(0, 100)}...`;
          }

          return {
            content: [{
              type: "text",
              text: responseText
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error during export operation: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'import_settings',
      description: 'Import partner/connector profiles from arcflow data (base64 encoded)',
      inputSchema: {
        type: 'object',
        properties: {
          arcflow: {
            type: 'string',
            description: 'Base64 encoded string containing the zip data for the arcflow (required)'
          },
          duplicateAction: {
            type: 'string',
            description: 'How to handle duplicates: "Overwrite", "Rename", or "Skip"'
          },
          overwrite: {
            type: 'string',
            description: 'Whether to overwrite duplicated sources (True/False, default: False)'
          },
          workspaceId: {
            type: 'string',
            description: 'The workspace to import into. If unspecified, auto-detects or uses default workspace'
          },
          inputName: {
            type: 'string',
            description: 'The name of the form input when uploading files from a form'
          },
          dataDirectory: {
            type: 'string',
            description: 'The data directory or zipped file where profiles are stored'
          },
          decryptPassword: {
            type: 'string',
            description: 'The password for decrypting sensitive values'
          },
          globalSettings: {
            type: 'string',
            description: 'Global settings to import. Comma-separated values or "ALL". Values: Partners, Documents, Users, Roles, Certificates, Connections, Vaults, Reports, Alerts, Advanced, AdminAPI, SSO'
          },
          profileSettings: {
            type: 'string',
            description: 'Profiles to import. Comma-separated values or "ALL". Values: AS2, AS4, GISB, RosettaNet, FTPServer, SFTPServer, HL7MLLP, OFTP'
          }
        },
        required: ['arcflow']
      },
      handler: async (args: any) => {
        try {
          const validated = ImportSchema.parse(args);

          const importInput = {
            Arcflow: validated.arcflow,
            DuplicateAction: validated.duplicateAction,
            Overwrite: validated.overwrite || "False",
            WorkspaceId: validated.workspaceId,
            InputName: validated.inputName,
            DataDirectory: validated.dataDirectory,
            DecryptPassword: validated.decryptPassword,
            GlobalSettings: validated.globalSettings,
            ProfileSettings: validated.profileSettings
          };

          const result = await client.import(importInput);

          let responseText = `**Import Completed Successfully**`;

          // Add import parameters
          if (validated.workspaceId) responseText += `\n**Target Workspace:** ${validated.workspaceId}`;
          if (validated.duplicateAction) responseText += `\n**Duplicate Action:** ${validated.duplicateAction}`;
          if (validated.overwrite) responseText += `\n**Overwrite:** ${validated.overwrite}`;
          if (validated.globalSettings) responseText += `\n**Global Settings:** ${validated.globalSettings}`;
          if (validated.profileSettings) responseText += `\n**Profile Settings:** ${validated.profileSettings}`;

          const arcflowSize = validated.arcflow.length;
          responseText += `\n\n**Arcflow Data:** Base64 encoded (${arcflowSize} characters)`;
          responseText += `\n**Preview:** ${validated.arcflow.substring(0, 100)}...`;

          // Add result details if available
          if (result) {
            if (result.message) responseText += `\n\n**Result:** ${result.message}`;
            if (result.success !== undefined) responseText += `\n**Status:** ${result.success ? 'Success' : 'Failed'}`;
          }

          return {
            content: [{
              type: "text",
              text: responseText
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error during import operation: ${error.message}`
            }],
            isError: true
          };
        }
      }
    }
  ];
}