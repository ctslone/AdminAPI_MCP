import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const UpdateProfileSchema = z.object({
  LogLevel: z.string().optional(),
  MaxLogSize: z.number().positive().optional(),
  LogRetentionDays: z.number().positive().optional(),
  NotifyStopStart: z.boolean().optional(),
  SSOEnabled: z.boolean().optional(),
  SSOEnableJITProvisioning: z.boolean().optional(),
  SyslogEnable: z.boolean().optional(),
  SysLogEnabledLogs: z.string().optional(),
  SysLogSSLEnabled: z.boolean().optional()
});

const GetWorkspacesSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetWorkspaceSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required")
});

const CreateWorkspaceSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().optional(),
  description: z.string().optional()
});

const UpdateWorkspaceSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().optional(),
  description: z.string().optional()
});

const DeleteWorkspaceSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required")
});

const VaultEntrySchema = z.object({
  id: z.string().min(1, "Vault entry ID is required"),
  name: z.string().optional(),
  value: z.string().optional(),
  description: z.string().optional()
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
  if (bytes === undefined) return 'Unknown';
  if (bytes === 0) return '0 bytes';
  
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function createConfigurationTools(client: ArcApiClient) {
  return [
    {
      name: "get_profile",
      description: "Get current Arc application profile and configuration settings",
      inputSchema: {
        type: "object",
        properties: {}
      },
      handler: async (args: any) => {
        const profile = await client.getProfile();
        
        if (profile.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No profile configuration found."
            }]
          };
        }

        // Profile is typically returned as array with single object
        const config = profile[0];
        
        return {
          content: [{
            type: "text",
            text: `**Arc Application Profile**\n\n` +
              `**Logging Configuration:**\n` +
              `  • Log Level: ${config.LogLevel || 'Not set'}\n` +
              `  • Max Log Size: ${formatBytes(config.MaxLogSize)}\n` +
              `  • Log Retention Days: ${config.LogRetentionDays || 'Not set'}\n` +
              `  • Notify Start/Stop: ${config.NotifyStopStart ? 'Yes' : 'No'}\n\n` +
              
              `**Single Sign-On (SSO):**\n` +
              `  • SSO Enabled: ${config.SSOEnabled ? 'Yes' : 'No'}\n` +
              `  • JIT Provisioning: ${config.SSOEnableJITProvisioning ? 'Yes' : 'No'}\n\n` +
              
              `**Syslog Configuration:**\n` +
              `  • Syslog Enabled: ${config.SyslogEnable ? 'Yes' : 'No'}\n` +
              `  • Syslog SSL Enabled: ${config.SysLogSSLEnabled ? 'Yes' : 'No'}\n` +
              `  • Enabled Logs: ${config.SysLogEnabledLogs || 'Not set'}\n\n` +
              
              `**Other Settings:**\n` +
              Object.entries(config)
                .filter(([key]) => !['LogLevel', 'MaxLogSize', 'LogRetentionDays', 'NotifyStopStart', 
                                    'SSOEnabled', 'SSOEnableJITProvisioning', 'SyslogEnable', 
                                    'SysLogEnabledLogs', 'SysLogSSLEnabled'].includes(key))
                .map(([key, value]) => `  • ${key}: ${value}`)
                .join('\n')
          }]
        };
      }
    },

    {
      name: "update_profile",
      description: "Update Arc application profile configuration settings",
      inputSchema: {
        type: "object",
        properties: {
          LogLevel: {
            type: "string",
            description: "Log level (e.g., 'Debug', 'Info', 'Warning', 'Error')"
          },
          MaxLogSize: {
            type: "number",
            description: "Maximum log file size in bytes"
          },
          LogRetentionDays: {
            type: "number",
            description: "Number of days to retain log files"
          },
          NotifyStopStart: {
            type: "boolean",
            description: "Enable notification when application starts/stops"
          },
          SSOEnabled: {
            type: "boolean",
            description: "Enable Single Sign-On"
          },
          SSOEnableJITProvisioning: {
            type: "boolean",
            description: "Enable Just-In-Time provisioning for SSO users"
          },
          SyslogEnable: {
            type: "boolean",
            description: "Enable sending logs to syslog server"
          },
          SysLogEnabledLogs: {
            type: "string",
            description: "Types of logs to send to syslog"
          },
          SysLogSSLEnabled: {
            type: "boolean",
            description: "Enable SSL for syslog communication"
          }
        }
      },
      handler: async (args: any) => {
        const validated = UpdateProfileSchema.parse(args);
        
        // Filter out undefined values
        const updates = Object.fromEntries(
          Object.entries(validated).filter(([_, value]) => value !== undefined)
        );
        
        if (Object.keys(updates).length === 0) {
          return {
            content: [{
              type: "text",
              text: "No valid configuration updates provided."
            }]
          };
        }
        
        const updatedProfile = await client.updateProfile(updates);
        
        return {
          content: [{
            type: "text",
            text: `**Profile Updated Successfully**\n\n` +
              `Updated settings:\n` +
              Object.entries(updates).map(([key, value]) => `  • ${key}: ${value}`).join('\n')
          }]
        };
      }
    },

    {
      name: "list_workspaces",
      description: "List Arc workspaces with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Workspaceid,Name')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"Name eq 'Production'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Name ASC' or 'CreatedDate DESC')"
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
        const validated = GetWorkspacesSchema.parse(args);
        
        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby,
          $top: validated.top,
          $skip: validated.skip
        };

        const workspaces = await client.getWorkspaces(queryParams);
        
        if (workspaces.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No workspaces found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${workspaces.length} workspaces:\n\n` +
              workspaces.map(w => 
                `• **${w.Name || w.Workspaceid}** (${w.Workspaceid})\n` +
                (w.Description ? `  Description: ${w.Description}\n` : '') +
                `  Created: ${formatDate(w.CreatedDate)}\n`
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "get_workspace",
      description: "Get detailed information about a specific Arc workspace",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The unique identifier of the workspace"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = GetWorkspaceSchema.parse(args);
        const workspace = await client.getWorkspace(validated.workspaceId);
        
        if (!workspace) {
          return {
            content: [{
              type: "text",
              text: `Workspace '${validated.workspaceId}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Workspace Details**\n\n` +
              `**ID:** ${workspace.Workspaceid}\n` +
              `**Name:** ${workspace.Name || 'N/A'}\n` +
              `**Description:** ${workspace.Description || 'N/A'}\n` +
              `**Created Date:** ${formatDate(workspace.CreatedDate)}`
          }]
        };
      }
    },

    {
      name: "create_workspace",
      description: "Create a new Arc workspace",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "Unique identifier for the new workspace"
          },
          name: {
            type: "string",
            description: "Display name for the workspace"
          },
          description: {
            type: "string", 
            description: "Description of the workspace's purpose"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = CreateWorkspaceSchema.parse(args);
        
        const workspaceData = {
          Workspaceid: validated.workspaceId,
          Name: validated.name,
          Description: validated.description
        };

        const workspace = await client.createWorkspace(workspaceData);
        
        return {
          content: [{
            type: "text",
            text: `**Workspace Created Successfully**\n\n` +
              `**ID:** ${workspace.Workspaceid}\n` +
              `**Name:** ${workspace.Name || 'N/A'}\n` +
              `**Description:** ${workspace.Description || 'N/A'}`
          }]
        };
      }
    },

    {
      name: "update_workspace",
      description: "Update an existing Arc workspace",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The unique identifier of the workspace to update"
          },
          name: {
            type: "string",
            description: "New display name for the workspace"
          },
          description: {
            type: "string",
            description: "New description for the workspace"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = UpdateWorkspaceSchema.parse(args);
        
        const updates = {
          ...(validated.name !== undefined && { Name: validated.name }),
          ...(validated.description !== undefined && { Description: validated.description })
        };

        const workspace = await client.updateWorkspace(validated.workspaceId, updates);
        
        return {
          content: [{
            type: "text",
            text: `**Workspace Updated Successfully**\n\n` +
              `**ID:** ${workspace.Workspaceid}\n` +
              `**Name:** ${workspace.Name || 'N/A'}\n` +
              `**Description:** ${workspace.Description || 'N/A'}`
          }]
        };
      }
    },

    {
      name: "delete_workspace",
      description: "Delete an Arc workspace permanently",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The unique identifier of the workspace to delete"
          }
        },
        required: ["workspaceId"]
      },
      handler: async (args: any) => {
        const validated = DeleteWorkspaceSchema.parse(args);
        
        await client.deleteWorkspace(validated.workspaceId);
        
        return {
          content: [{
            type: "text",
            text: `**Workspace Deleted**\n\nWorkspace '${validated.workspaceId}' has been permanently deleted.`
          }]
        };
      }
    },

    {
      name: "list_vault_entries",
      description: "List Arc vault entries (secure configuration values)",
      inputSchema: {
        type: "object",
        properties: {
          top: {
            type: "number",
            description: "Maximum number of results to return"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Name ASC')"
          }
        }
      },
      handler: async (args: any) => {
        const top = z.number().positive().optional().parse(args.top);
        const orderby = z.string().optional().parse(args.orderby);
        
        const queryParams = {
          $top: top,
          $orderby: orderby || 'Name ASC'
        };

        const vaultEntries = await client.getVaultEntries(queryParams);
        
        if (vaultEntries.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No vault entries found."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${vaultEntries.length} vault entries:\n\n` +
              vaultEntries.map(v => 
                `🔐 **${v.Name || v.Id}** (${v.Id})\n` +
                (v.Description ? `  Description: ${v.Description}\n` : '') +
                `  Value: [SECURED]\n` // Never show actual values
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "create_vault_entry",
      description: "Create a new vault entry for secure storage of sensitive values",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the vault entry"
          },
          name: {
            type: "string",
            description: "Display name for the vault entry"
          },
          value: {
            type: "string",
            description: "Secure value to store (will be encrypted)"
          },
          description: {
            type: "string",
            description: "Description of the vault entry's purpose"
          }
        },
        required: ["id", "value"]
      },
      handler: async (args: any) => {
        const validated = VaultEntrySchema.parse(args);
        
        const entryData = {
          Id: validated.id,
          Name: validated.name,
          Value: validated.value,
          Description: validated.description
        };

        const entry = await client.createVaultEntry(entryData);
        
        return {
          content: [{
            type: "text",
            text: `🔐 **Vault Entry Created Successfully**\n\n` +
              `**ID:** ${entry.Id}\n` +
              `**Name:** ${entry.Name || 'N/A'}\n` +
              `**Description:** ${entry.Description || 'N/A'}\n` +
              `**Value:** [SECURED]`
          }]
        };
      }
    },

    {
      name: "update_vault_entry",
      description: "Update an existing vault entry",
      inputSchema: {
        type: "object", 
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the vault entry to update"
          },
          name: {
            type: "string",
            description: "New display name for the vault entry"
          },
          value: {
            type: "string",
            description: "New secure value (will be encrypted)"
          },
          description: {
            type: "string",
            description: "New description for the vault entry"
          }
        },
        required: ["id"]
      },
      handler: async (args: any) => {
        const validated = VaultEntrySchema.parse(args);
        
        const updates = {
          ...(validated.name !== undefined && { Name: validated.name }),
          ...(validated.value !== undefined && { Value: validated.value }),
          ...(validated.description !== undefined && { Description: validated.description })
        };

        const entry = await client.updateVaultEntry(validated.id, updates);
        
        return {
          content: [{
            type: "text",
            text: `🔐 **Vault Entry Updated Successfully**\n\n` +
              `**ID:** ${entry.Id}\n` +
              `**Name:** ${entry.Name || 'N/A'}\n` +
              `**Description:** ${entry.Description || 'N/A'}`
          }]
        };
      }
    },

    {
      name: "delete_vault_entry",
      description: "Delete a vault entry permanently",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the vault entry to delete"
          }
        },
        required: ["id"]
      },
      handler: async (args: any) => {
        const id = z.string().min(1).parse(args.id);
        
        await client.deleteVaultEntry(id);
        
        return {
          content: [{
            type: "text",
            text: `🔐 **Vault Entry Deleted**\n\nVault entry '${id}' has been permanently deleted.`
          }]
        };
      }
    }
  ];
}