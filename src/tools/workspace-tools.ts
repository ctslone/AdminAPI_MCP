import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';
import type { ArcWorkspace } from '../types/arc-api.js';

export function createWorkspaceTools(client: ArcApiClient) {
  return [
    {
      name: 'list_workspaces',
      description: 'List all workspaces with optional filtering and pagination',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'OData filter expression (e.g., "Name eq \'MyWorkspace\'")'
          },
          select: {
            type: 'string',
            description: 'Comma-separated list of properties to include'
          },
          orderby: {
            type: 'string',
            description: 'Property to order by with ASC/DESC (e.g., "Name ASC")'
          },
          top: {
            type: 'number',
            description: 'Maximum number of results to return'
          },
          skip: {
            type: 'number',
            description: 'Number of results to skip for pagination'
          }
        }
      },
      handler: async (args: any) => {
        try {
          const params: any = {};
          if (args.filter) params.$filter = args.filter;
          if (args.select) params.$select = args.select;
          if (args.orderby) params.$orderby = args.orderby;
          if (args.top) params.$top = args.top;
          if (args.skip) params.$skip = args.skip;

          const workspaces = await client.getWorkspaces(params);

          let summary = `Found ${workspaces.length} workspace(s)`;
          if (args.filter) summary += ` matching filter: ${args.filter}`;

          const workspaceList = workspaces.map(w => {
            const id = w.workspaceid || w.Workspaceid || 'Unknown';
            const type = w.workspacetype || 'Unknown';

            // Build a comprehensive property list
            const properties = [];

            // Core properties
            if (w.workspacetype) properties.push(`Type: ${w.workspacetype}`);

            // Email settings (only show if configured)
            if (w.smtpserver) properties.push(`SMTP Server: ${w.smtpserver}`);
            if (w.smtpport) properties.push(`SMTP Port: ${w.smtpport}`);
            if (w.smtpuser) properties.push(`SMTP User: ${w.smtpuser}`);
            if (w.emailprotocol) properties.push(`Email Protocol: ${w.emailprotocol}`);

            // S3 settings (only show if configured)
            if (w.s3bucket) properties.push(`S3 Bucket: ${w.s3bucket}`);
            if (w.s3region) properties.push(`S3 Region: ${w.s3region}`);
            if (w.s3url) properties.push(`S3 URL: ${w.s3url}`);

            // Performance settings (only show if configured)
            if (w.maxworkersperport) properties.push(`Max Workers: ${w.maxworkersperport}`);
            if (w.maxfilesperport) properties.push(`Max Files: ${w.maxfilesperport}`);

            // Override flags (only show if true)
            if (w.overrideperformancesettings === 'true') properties.push(`Performance Override: Yes`);
            if (w.overridecleanupoptions === 'true') properties.push(`Cleanup Override: Yes`);
            if (w.overrideemailsettings === 'true') properties.push(`Email Override: Yes`);

            const propSummary = properties.length > 0 ? `\n  ${properties.join(', ')}` : '';
            return `**${id}** (${type})${propSummary}`;
          }).join('\n\n');

          return {
            content: [{
              type: "text",
              text: `${summary}\n\n${workspaceList || 'No workspaces found'}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error listing workspaces: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'get_workspace',
      description: 'Get details for a specific workspace by ID',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The workspace ID to retrieve'
          },
          select: {
            type: 'string',
            description: 'Comma-separated list of properties to include'
          }
        },
        required: ['workspaceId']
      },
      handler: async (args: any) => {
        try {
          const params: any = {};
          if (args.select) params.$select = args.select;

          const workspace = await client.getWorkspace(args.workspaceId);

          if (!workspace) {
            return {
              content: [{
                type: "text",
                text: `Workspace '${args.workspaceId}' not found`
              }],
              isError: true
            };
          }

          const id = workspace.workspaceid || workspace.Workspaceid;
          const details = [`**Workspace ID:** ${id}`];

          // Core properties
          if (workspace.workspacetype) details.push(`**Type:** ${workspace.workspacetype}`);

          // Email configuration
          if (workspace.emailprotocol || workspace.smtpserver) {
            details.push(`\n**Email Configuration:**`);
            if (workspace.emailprotocol) details.push(`  Protocol: ${workspace.emailprotocol}`);
            if (workspace.smtpserver) details.push(`  SMTP Server: ${workspace.smtpserver}`);
            if (workspace.smtpport) details.push(`  SMTP Port: ${workspace.smtpport}`);
            if (workspace.smtpuser) details.push(`  SMTP User: ${workspace.smtpuser}`);
            if (workspace.smtpauthmechanism) details.push(`  Auth Mechanism: ${workspace.smtpauthmechanism}`);
            if (workspace.smtpsslmode) details.push(`  SSL Mode: ${workspace.smtpsslmode}`);
            if (workspace.emailsendgridurl) details.push(`  SendGrid URL: ${workspace.emailsendgridurl}`);
          }

          // Notification settings
          if (workspace.notifyemail || workspace.notifyemailto) {
            details.push(`\n**Notification Settings:**`);
            if (workspace.notifyemail) details.push(`  Notify Email: ${workspace.notifyemail}`);
            if (workspace.notifyemailto) details.push(`  Notify To: ${workspace.notifyemailto}`);
            if (workspace.notifyemailfrom) details.push(`  Notify From: ${workspace.notifyemailfrom}`);
            if (workspace.notifyemailsubject) details.push(`  Subject: ${workspace.notifyemailsubject}`);
          }

          // S3 configuration
          if (workspace.s3bucket || workspace.s3url) {
            details.push(`\n**S3 Configuration:**`);
            if (workspace.s3bucket) details.push(`  Bucket: ${workspace.s3bucket}`);
            if (workspace.s3region) details.push(`  Region: ${workspace.s3region}`);
            if (workspace.s3url) details.push(`  URL: ${workspace.s3url}`);
            if (workspace.s3prefix) details.push(`  Prefix: ${workspace.s3prefix}`);
            if (workspace.s3accesskey) details.push(`  Access Key: ${workspace.s3accesskey ? '[CONFIGURED]' : '[NOT SET]'}`);
          }

          // Archive and cleanup
          if (workspace.archivefolder || workspace.cleanupsendfolder) {
            details.push(`\n**Archive & Cleanup:**`);
            if (workspace.archivefolder) details.push(`  Archive Folder: ${workspace.archivefolder}`);
            if (workspace.archivedestination) details.push(`  Archive Destination: ${workspace.archivedestination}`);
            if (workspace.cleanupsendfolder) details.push(`  Cleanup Send Folder: ${workspace.cleanupsendfolder}`);
            if (workspace.cleanupreceivefolder) details.push(`  Cleanup Receive Folder: ${workspace.cleanupreceivefolder}`);
            if (workspace.cleanupsentfolder) details.push(`  Cleanup Sent Folder: ${workspace.cleanupsentfolder}`);
            if (workspace.cleanuptransactions) details.push(`  Cleanup Transactions: ${workspace.cleanuptransactions}`);
          }

          // Performance settings
          if (workspace.maxworkersperport || workspace.maxfilesperport) {
            details.push(`\n**Performance Settings:**`);
            if (workspace.maxworkersperport) details.push(`  Max Workers per Port: ${workspace.maxworkersperport}`);
            if (workspace.maxfilesperport) details.push(`  Max Files per Port: ${workspace.maxfilesperport}`);
            if (workspace.backoffinterval) details.push(`  Backoff Interval: ${workspace.backoffinterval}`);
            if (workspace.backoffminthreshold) details.push(`  Backoff Min Threshold: ${workspace.backoffminthreshold}`);
            if (workspace.backoffmaxthreshold) details.push(`  Backoff Max Threshold: ${workspace.backoffmaxthreshold}`);
          }

          // Auto task settings
          if (workspace.autotasktype || workspace.autotaskinterval) {
            details.push(`\n**Auto Task Settings:**`);
            if (workspace.autotasktype) details.push(`  Auto Task Type: ${workspace.autotasktype}`);
            if (workspace.autotaskinterval) details.push(`  Auto Task Interval: ${workspace.autotaskinterval}`);
          }

          // Override flags
          const overrides = [];
          if (workspace.overrideperformancesettings === 'true') overrides.push('Performance');
          if (workspace.overridecleanupoptions === 'true') overrides.push('Cleanup');
          if (workspace.overrideemailsettings === 'true') overrides.push('Email');
          if (overrides.length > 0) {
            details.push(`\n**Override Settings:** ${overrides.join(', ')}`);
          }

          return {
            content: [{
              type: "text",
              text: `**Workspace Details**\n\n${details}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error getting workspace: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'create_workspace',
      description: 'Create a new workspace',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The unique ID for the new workspace'
          },
          name: {
            type: 'string',
            description: 'Display name for the workspace'
          },
          description: {
            type: 'string',
            description: 'Description of the workspace'
          }
        },
        required: ['workspaceId']
      },
      handler: async (args: any) => {
        try {
          const workspaceData: Partial<ArcWorkspace> = {
            workspaceid: args.workspaceId
          };

          if (args.name) workspaceData.Name = args.name;
          if (args.description) workspaceData.Description = args.description;

          const workspace = await client.createWorkspace(workspaceData);

          return {
            content: [{
              type: "text",
              text: `Workspace '${workspace.Workspaceid}' created successfully`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error creating workspace: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'update_workspace',
      description: 'Update an existing workspace',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The workspace ID to update'
          },
          name: {
            type: 'string',
            description: 'New display name for the workspace'
          },
          description: {
            type: 'string',
            description: 'New description for the workspace'
          }
        },
        required: ['workspaceId']
      },
      handler: async (args: any) => {
        try {
          const workspaceData: Partial<ArcWorkspace> = {};

          if (args.name) workspaceData.Name = args.name;
          if (args.description) workspaceData.Description = args.description;

          if (Object.keys(workspaceData).length === 0) {
            return {
              content: [{
                type: "text",
                text: 'No update fields provided. Specify name and/or description to update.'
              }],
              isError: true
            };
          }

          const workspace = await client.updateWorkspace(args.workspaceId, workspaceData);

          return {
            content: [{
              type: "text",
              text: `Workspace '${args.workspaceId}' updated successfully`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error updating workspace: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'delete_workspace',
      description: 'Delete a workspace by ID',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The workspace ID to delete'
          }
        },
        required: ['workspaceId']
      },
      handler: async (args: any) => {
        try {
          await client.deleteWorkspace(args.workspaceId);

          return {
            content: [{
              type: "text",
              text: `Workspace '${args.workspaceId}' deleted successfully`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error deleting workspace: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'get_workspaces_count',
      description: 'Get the total count of workspaces with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'OData filter expression (e.g., "Name eq \'MyWorkspace\'")'
          }
        }
      },
      handler: async (args: any) => {
        try {
          const params: any = {};
          if (args.filter) params.$filter = args.filter;

          const count = await client.getWorkspacesCount(params);

          let message = `Total workspaces: ${count}`;
          if (args.filter) message += ` (filtered by: ${args.filter})`;

          return {
            content: [{
              type: "text",
              text: message
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error getting workspace count: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'get_workspace_property',
      description: 'Get a specific property value from a workspace',
      inputSchema: {
        type: 'object',
        properties: {
          workspaceId: {
            type: 'string',
            description: 'The workspace ID'
          },
          propertyName: {
            type: 'string',
            description: 'The property name to retrieve (e.g., "Name", "Description")'
          }
        },
        required: ['workspaceId', 'propertyName']
      },
      handler: async (args: any) => {
        try {
          const value = await client.getWorkspaceProperty(args.workspaceId, args.propertyName);

          return {
            content: [{
              type: "text",
              text: `**${args.propertyName}:** ${value}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error getting workspace property: ${error.message}`
            }],
            isError: true
          };
        }
      }
    },

    {
      name: 'search_workspaces',
      description: 'Search workspaces by name or description using contains filter',
      inputSchema: {
        type: 'object',
        properties: {
          searchTerm: {
            type: 'string',
            description: 'Term to search for in workspace names and descriptions'
          }
        },
        required: ['searchTerm']
      },
      handler: async (args: any) => {
        try {
          const filter = `contains(tolower(workspaceid),'${args.searchTerm.toLowerCase()}') or contains(tolower(workspacetype),'${args.searchTerm.toLowerCase()}')`;
          const workspaces = await client.getWorkspaces({ $filter: filter });

          const summary = `Found ${workspaces.length} workspace(s) matching "${args.searchTerm}"`;

          const workspaceList = workspaces.map(w => {
            const id = w.workspaceid || w.Workspaceid || 'Unknown';
            const type = w.workspacetype || 'Unknown';
            return `**${id}** (${type})`;
          }).join('\n');

          return {
            content: [{
              type: "text",
              text: `${summary}\n\n${workspaceList || 'No matching workspaces found'}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `Error searching workspaces: ${error.message}`
            }],
            isError: true
          };
        }
      }
    }
  ];
}