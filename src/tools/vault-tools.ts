import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetVaultEntriesSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetVaultEntrySchema = z.object({
  vaultId: z.string().min(1, "Vault ID is required")
});

const CreateVaultEntrySchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  value: z.string().min(1, "Value is required"),
  type: z.string().optional(),
  showType: z.string().optional(),
  tags: z.string().optional()
});

const UpdateVaultEntrySchema = z.object({
  vaultId: z.string().min(1, "Vault ID is required"),
  name: z.string().optional(),
  value: z.string().optional(),
  type: z.string().optional(),
  showType: z.string().optional(),
  tags: z.string().optional()
});

const DeleteVaultEntrySchema = z.object({
  vaultId: z.string().min(1, "Vault ID is required")
});

const GetVaultCountSchema = z.object({
  filter: z.string().optional()
});

const GetVaultPropertySchema = z.object({
  vaultId: z.string().min(1, "Vault ID is required"),
  propertyName: z.string().min(1, "Property name is required")
});

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function createVaultTools(client: ArcApiClient) {
  return [
    {
      name: "list_vault_entries",
      description: "List vault entries with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Id,Name,Type')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"Name eq 'MySecret'\" or \"Type eq 'Password'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Name ASC' or 'Id DESC')"
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
        const validated = GetVaultEntriesSchema.parse(args);

        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby || 'Name ASC',
          $top: validated.top,
          $skip: validated.skip
        };

        const vaultEntries = await client.getVaultEntries(queryParams);

        if (vaultEntries.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No vault entries found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${vaultEntries.length} vault entries:\n\n` +
              vaultEntries.map(v =>
                `**${v.Name || v.name || 'Unknown'}**\n` +
                `  ID: ${v.Id || v.id}\n` +
                `  Type: ${v.Type || v.type || 'Unknown'}\n` +
                `  Show Type: ${v.ShowType || v.showType || 'Unknown'}\n` +
                `  Tags: ${v.Tags || v.tags || 'None'}\n` +
                `  Value: ${v.value || v.Value || 'Not set'}\n`
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "get_vault_entry",
      description: "Get detailed information about a specific vault entry",
      inputSchema: {
        type: "object",
        properties: {
          vaultId: {
            type: "string",
            description: "The unique identifier of the vault entry"
          }
        },
        required: ["vaultId"]
      },
      handler: async (args: any) => {
        const validated = GetVaultEntrySchema.parse(args);

        // Get ALL vault entries first (no filtering)
        const allVaultEntries = await client.getVaultEntries();

        // Search through all entries to find matching name
        const matchingEntries = allVaultEntries.filter(v =>
          (v.Name && v.Name.toLowerCase() === validated.vaultId.toLowerCase()) ||
          (v.name && v.name.toLowerCase() === validated.vaultId.toLowerCase())
        );

        if (matchingEntries.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Vault entry with name '${validated.vaultId}' not found.`
            }]
          };
        }

        if (matchingEntries.length > 1) {
          return {
            content: [{
              type: "text",
              text: `Multiple vault entries found with name '${validated.vaultId}':\n\n` +
                matchingEntries.map(v => `• ${v.Name || v.name} (ID: ${v.Id || v.id})`).join('\n') +
                `\n\nPlease use a more specific name.`
            }]
          };
        }

        // Found exactly one vault entry
        const vaultEntry = matchingEntries[0];

        return {
          content: [{
            type: "text",
            text: `**Vault Entry Details**\n\n` +
              `**Name:** ${vaultEntry.Name || vaultEntry.name || 'Unknown'}\n` +
              `**ID:** ${vaultEntry.Id || vaultEntry.id}\n` +
              `**Type:** ${vaultEntry.Type || vaultEntry.type || 'Unknown'}\n` +
              `**Show Type:** ${vaultEntry.ShowType || vaultEntry.showType || 'Unknown'}\n` +
              `**Tags:** ${vaultEntry.Tags || vaultEntry.tags || 'None'}\n` +
              `**Value:** ${vaultEntry.value || vaultEntry.Value || 'Not set'}\n`
          }]
        };
      }
    },

    {
      name: "create_vault_entry",
      description: "Create a new vault entry",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the vault entry"
          },
          name: {
            type: "string",
            description: "Name of the vault entry"
          },
          value: {
            type: "string",
            description: "The secret value to store"
          },
          type: {
            type: "string",
            description: "Type of the vault entry (e.g., 'Password', 'APIKey', 'Token')"
          },
          showType: {
            type: "string",
            description: "Whether to output type or displayName"
          },
          tags: {
            type: "string",
            description: "Tags for categorizing the vault entry"
          }
        },
        required: ["id", "name", "value"]
      },
      handler: async (args: any) => {
        const validated = CreateVaultEntrySchema.parse(args);

        const vaultEntry = {
          Id: validated.id,
          Name: validated.name,
          Value: validated.value,
          Type: validated.type,
          ShowType: validated.showType,
          Tags: validated.tags
        };

        const createdEntry = await client.createVaultEntry(vaultEntry);

        return {
          content: [{
            type: "text",
            text: `**Vault Entry Created**\n\n` +
              `**ID:** ${createdEntry.Id}\n` +
              `**Name:** ${createdEntry.Name || 'Unknown'}\n` +
              `**Type:** ${createdEntry.Type || 'Unknown'}\n` +
              `**Show Type:** ${createdEntry.ShowType || 'Unknown'}\n` +
              `**Tags:** ${createdEntry.tags || createdEntry.Tags || 'None'}\n` +
              `**Value:** ${createdEntry.value || createdEntry.Value || 'Not set'}\n\n` +
              `Vault entry has been successfully created.`
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
          vaultId: {
            type: "string",
            description: "The unique identifier of the vault entry to update"
          },
          name: {
            type: "string",
            description: "New name for the vault entry"
          },
          value: {
            type: "string",
            description: "New secret value"
          },
          type: {
            type: "string",
            description: "New type for the vault entry"
          },
          showType: {
            type: "string",
            description: "New show type setting"
          },
          tags: {
            type: "string",
            description: "New tags for the vault entry"
          }
        },
        required: ["vaultId"]
      },
      handler: async (args: any) => {
        const validated = UpdateVaultEntrySchema.parse(args);

        // Get ALL vault entries first (no filtering)
        const allVaultEntries = await client.getVaultEntries();

        // Search through all entries to find matching name
        const matchingEntries = allVaultEntries.filter(v =>
          (v.Name && v.Name.toLowerCase() === validated.vaultId.toLowerCase()) ||
          (v.name && v.name.toLowerCase() === validated.vaultId.toLowerCase())
        );

        if (matchingEntries.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Vault entry with name '${validated.vaultId}' not found.`
            }]
          };
        }

        if (matchingEntries.length > 1) {
          return {
            content: [{
              type: "text",
              text: `Multiple vault entries found with name '${validated.vaultId}':\n\n` +
                matchingEntries.map(v => `• ${v.Name || v.name} (ID: ${v.Id || v.id})`).join('\n') +
                `\n\nPlease use a more specific name.`
            }]
          };
        }

        // Found exactly one vault entry, use its actual ID
        const vaultEntry = matchingEntries[0];
        const actualId = vaultEntry.Id || vaultEntry.id;

        // Build update data with required @odata.type field
        const updateData: any = {
          '@odata.type': 'CDataAPI.Vault'
        };

        if (validated.name !== undefined) updateData.Name = validated.name;
        if (validated.value !== undefined) updateData.Value = validated.value;
        if (validated.type !== undefined) updateData.Type = validated.type;
        if (validated.showType !== undefined) updateData.ShowType = validated.showType;
        if (validated.tags !== undefined) updateData.Tags = validated.tags;

        const updatedEntry = await client.updateVaultEntry(actualId!, updateData);

        return {
          content: [{
            type: "text",
            text: `**Vault Entry Updated**\n\n` +
              `**Name:** ${updatedEntry.Name || updatedEntry.name || 'Unknown'}\n` +
              `**ID:** ${updatedEntry.Id || updatedEntry.id}\n` +
              `**Type:** ${updatedEntry.Type || updatedEntry.type || 'Unknown'}\n` +
              `**Show Type:** ${updatedEntry.ShowType || updatedEntry.showType || 'Unknown'}\n` +
              `**Tags:** ${updatedEntry.Tags || updatedEntry.tags || 'None'}\n` +
              `**Value:** ${updatedEntry.value || updatedEntry.Value || 'Not set'}\n\n` +
              `Vault entry has been successfully updated.`
          }]
        };
      }
    },

    {
      name: "delete_vault_entry",
      description: "Delete a specific vault entry",
      inputSchema: {
        type: "object",
        properties: {
          vaultId: {
            type: "string",
            description: "The unique identifier of the vault entry to delete"
          }
        },
        required: ["vaultId"]
      },
      handler: async (args: any) => {
        const validated = DeleteVaultEntrySchema.parse(args);

        // Get ALL vault entries first (no filtering)
        const allVaultEntries = await client.getVaultEntries();

        // Search through all entries to find matching name
        const matchingEntries = allVaultEntries.filter(v =>
          (v.Name && v.Name.toLowerCase() === validated.vaultId.toLowerCase()) ||
          (v.name && v.name.toLowerCase() === validated.vaultId.toLowerCase())
        );

        if (matchingEntries.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Vault entry with name '${validated.vaultId}' not found.`
            }]
          };
        }

        if (matchingEntries.length > 1) {
          return {
            content: [{
              type: "text",
              text: `Multiple vault entries found with name '${validated.vaultId}':\n\n` +
                matchingEntries.map(v => `• ${v.Name || v.name} (ID: ${v.Id || v.id})`).join('\n') +
                `\n\nPlease use a more specific name.`
            }]
          };
        }

        // Found exactly one vault entry, use its actual ID
        const vaultEntry = matchingEntries[0];
        const actualId = vaultEntry.Id || vaultEntry.id;

        await client.deleteVaultEntry(actualId!);

        return {
          content: [{
            type: "text",
            text: `**Vault Entry Deleted**\n\nVault entry '${vaultEntry.Name || vaultEntry.name}' (ID: ${actualId}) has been permanently deleted.`
          }]
        };
      }
    },

    {
      name: "get_vault_count",
      description: "Get the total count of vault entries with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "OData filter expression to count specific entries (e.g., \"Type eq 'Password'\")"
          }
        }
      },
      handler: async (args: any) => {
        const validated = GetVaultCountSchema.parse(args);

        const queryParams = validated.filter ? { $filter: validated.filter } : undefined;
        const count = await client.getVaultCount(queryParams);

        const filterText = validated.filter ? ` matching filter '${validated.filter}'` : '';

        return {
          content: [{
            type: "text",
            text: `**Vault Entries Count**\n\nTotal vault entries${filterText}: **${count}**`
          }]
        };
      }
    },

    {
      name: "get_vault_property",
      description: "Get a specific property value from a vault entry",
      inputSchema: {
        type: "object",
        properties: {
          vaultId: {
            type: "string",
            description: "The unique identifier of the vault entry"
          },
          propertyName: {
            type: "string",
            description: "The name of the property to retrieve (e.g., 'Name', 'Type', 'Value', 'Tags')"
          }
        },
        required: ["vaultId", "propertyName"]
      },
      handler: async (args: any) => {
        const validated = GetVaultPropertySchema.parse(args);

        try {
          const propertyValue = await client.getVaultProperty(validated.vaultId, validated.propertyName);

          // Special handling for sensitive values
          const isSensitive = validated.propertyName.toLowerCase() === 'value';
          const displayValue = propertyValue || 'null';

          return {
            content: [{
              type: "text",
              text: `**Vault Property**\n\n**Vault ID:** ${validated.vaultId}\n**Property:** ${validated.propertyName}\n**Value:** ${displayValue}`
            }]
          };
        } catch (error: any) {
          if (error.response?.status === 404) {
            return {
              content: [{
                type: "text",
                text: `Vault entry '${validated.vaultId}' or property '${validated.propertyName}' not found.`
              }]
            };
          }
          throw error;
        }
      }
    },

    {
      name: "search_vault_by_type",
      description: "Search vault entries by type with additional filtering options",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "The type to search for (e.g., 'Password', 'APIKey', 'Token')"
          },
          tags: {
            type: "string",
            description: "Optional tags to filter by"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return (default: 50)"
          }
        },
        required: ["type"]
      },
      handler: async (args: any) => {
        const type = z.string().min(1).parse(args.type);
        const tags = z.string().optional().parse(args.tags);
        const top = z.number().positive().default(50).parse(args.top || 50);

        let filter = `Type eq '${type}'`;
        if (tags) {
          filter += ` and contains(Tags, '${tags}')`;
        }

        const queryParams = {
          $filter: filter,
          $orderby: 'Name ASC',
          $top: top
        };

        const vaultEntries = await client.getVaultEntries(queryParams);

        if (vaultEntries.length === 0) {
          const criteria = tags ? `type '${type}' and tags containing '${tags}'` : `type '${type}'`;
          return {
            content: [{
              type: "text",
              text: `No vault entries found with ${criteria}.`
            }]
          };
        }

        let result = `**Vault Entries by Type: ${type}**\n\n`;
        if (tags) {
          result += `**Filtered by tags containing:** ${tags}\n\n`;
        }
        result += `**Total found:** ${vaultEntries.length}\n\n`;

        vaultEntries.forEach(v => {
          result += `**${v.Name || 'Unnamed'}** (${v.Id})\n`;
          result += `  Type: ${v.Type || 'Unknown'}\n`;
          result += `  Tags: ${v.Tags || 'None'}\n`;
          result += `  Show Type: ${v.ShowType || 'Unknown'}\n`;
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