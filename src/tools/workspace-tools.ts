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
            const type = w.workspacetype || '(not set)';

            // Show key properties regardless of whether they're set
            const properties = [
              `Type: ${type}`,
              `Email Protocol: ${w.emailprotocol || '(not set)'}`,
              `SMTP Server: ${w.smtpserver || '(not set)'}`,
              `S3 Bucket: ${w.s3bucket || '(not set)'}`,
              `Performance Override: ${w.overrideperformancesettings || 'false'}`,
              `Email Override: ${w.overrideemailsettings || 'false'}`
            ];

            return `**${id}**\n  ${properties.join('\n  ')}`;
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

          // Show ALL properties from the workspace object
          const details = [];

          // Get the workspace ID
          const workspaceId = workspace.workspaceid || workspace.Workspaceid || 'Unknown';
          details.push(`**Workspace ID:** ${workspaceId}`);

          // Core settings
          details.push(`\n**Core Settings:**`);
          details.push(`  Workspace Type: ${workspace.workspacetype || '(not set)'}`);

          // Email & SMTP Settings
          details.push(`\n**Email & SMTP Settings:**`);
          details.push(`  Email Protocol: ${workspace.emailprotocol || '(not set)'}`);
          details.push(`  SMTP Server: ${workspace.smtpserver || '(not set)'}`);
          details.push(`  SMTP Port: ${workspace.smtpport || '(not set)'}`);
          details.push(`  SMTP User: ${workspace.smtpuser || '(not set)'}`);
          details.push(`  SMTP Auth Mechanism: ${workspace.smtpauthmechanism || '(not set)'}`);
          details.push(`  SMTP SSL Mode: ${workspace.smtpsslmode || '(not set)'}`);
          details.push(`  SMTP SSL Certificate: ${workspace.smtpsslcert || '(not set)'}`);
          details.push(`  SMTP Other Configs: ${workspace.smtpotherconfigs || '(not set)'}`);
          details.push(`  SendGrid URL: ${workspace.emailsendgridurl || '(not set)'}`);
          details.push(`  SendGrid API Key: ${workspace.emailsendgridapikey || '(not set)'}`);

          // Notification Settings
          details.push(`\n**Notification Settings:**`);
          details.push(`  Notify Email: ${workspace.notifyemail || '(not set)'}`);
          details.push(`  Notify Email To: ${workspace.notifyemailto || '(not set)'}`);
          details.push(`  Notify Email From: ${workspace.notifyemailfrom || '(not set)'}`);
          details.push(`  Notify Email Subject: ${workspace.notifyemailsubject || '(not set)'}`);
          details.push(`  Allow Arc Script in Alerts Subject: ${workspace.allowarcscriptinalertssubject || '(not set)'}`);

          // S3 Settings
          details.push(`\n**S3 Settings:**`);
          details.push(`  S3 URL: ${workspace.s3url || '(not set)'}`);
          details.push(`  S3 Bucket: ${workspace.s3bucket || '(not set)'}`);
          details.push(`  S3 Access Key: ${workspace.s3accesskey || '(not set)'}`);
          details.push(`  S3 Region: ${workspace.s3region || '(not set)'}`);
          details.push(`  S3 Prefix: ${workspace.s3prefix || '(not set)'}`);

          // Archive & Cleanup Settings
          details.push(`\n**Archive & Cleanup Settings:**`);
          details.push(`  Archive Folder: ${workspace.archivefolder || '(not set)'}`);
          details.push(`  Archive Destination: ${workspace.archivedestination || '(not set)'}`);
          details.push(`  Cleanup Send Folder: ${workspace.cleanupsendfolder || '(not set)'}`);
          details.push(`  Cleanup Receive Folder: ${workspace.cleanupreceivefolder || '(not set)'}`);
          details.push(`  Cleanup Sent Folder: ${workspace.cleanupsentfolder || '(not set)'}`);
          details.push(`  Cleanup Transactions: ${workspace.cleanuptransactions || '(not set)'}`);

          // Performance Settings
          details.push(`\n**Performance Settings:**`);
          details.push(`  Max Workers per Port: ${workspace.maxworkersperport || '(not set)'}`);
          details.push(`  Max Files per Port: ${workspace.maxfilesperport || '(not set)'}`);
          details.push(`  Backoff Interval: ${workspace.backoffinterval || '(not set)'}`);
          details.push(`  Backoff Min Threshold: ${workspace.backoffminthreshold || '(not set)'}`);
          details.push(`  Backoff Max Threshold: ${workspace.backoffmaxthreshold || '(not set)'}`);

          // Auto Task Settings
          details.push(`\n**Auto Task Settings:**`);
          details.push(`  Auto Task Type: ${workspace.autotasktype || '(not set)'}`);
          details.push(`  Auto Task Interval: ${workspace.autotaskinterval || '(not set)'}`);

          // Override Settings
          details.push(`\n**Override Settings:**`);
          details.push(`  Override Performance Settings: ${workspace.overrideperformancesettings || 'false'}`);
          details.push(`  Override Cleanup Options: ${workspace.overridecleanupoptions || 'false'}`);
          details.push(`  Override Email Settings: ${workspace.overrideemailsettings || 'false'}`)

          return {
            content: [{
              type: "text",
              text: `**Workspace Details**\n\n${details.join('\n')}`
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