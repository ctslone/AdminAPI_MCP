import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetFilesSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetFileSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required"),
  folder: z.string().min(1, "Folder is required"),
  filename: z.string().min(1, "Filename is required"),
  messageId: z.string().min(1, "Message ID is required")
});

const CreateFileSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required"),
  folder: z.string().min(1, "Folder is required"),
  filename: z.string().min(1, "Filename is required"), 
  messageId: z.string().min(1, "Message ID is required"),
  subfolder: z.string().optional(),
  timeCreated: z.string().optional(),
  filePath: z.string().optional(),
  fileSize: z.number().optional(),
  content: z.string().optional(),
  batchGroupId: z.string().optional(),
  isBatchGroup: z.boolean().optional()
});

const UpdateFileSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required"),
  folder: z.string().min(1, "Folder is required"),
  filename: z.string().min(1, "Filename is required"), 
  messageId: z.string().min(1, "Message ID is required"),
  subfolder: z.string().optional(),
  timeCreated: z.string().optional(),
  filePath: z.string().optional(),
  fileSize: z.number().optional(),
  content: z.string().optional(),
  batchGroupId: z.string().optional(),
  isBatchGroup: z.boolean().optional()
});

const DeleteFileSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required"),
  folder: z.string().min(1, "Folder is required"),
  filename: z.string().min(1, "Filename is required"), 
  messageId: z.string().min(1, "Message ID is required")
});

function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return 'Unknown';
  if (bytes === 0) return '0 bytes';
  
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export function createFileTools(client: ArcApiClient) {
  return [
    {
      name: "list_files",
      description: "List Arc files with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'ConnectorId,Filename,Size')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"ConnectorId eq 'MyConnector'\" or \"Size gt 1024\")"
          },
          orderby: {
            type: "string", 
            description: "Order results by property (e.g., 'TimeCreated DESC' or 'Filename ASC')"
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
        const validated = GetFilesSchema.parse(args);
        
        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby,
          $top: validated.top,
          $skip: validated.skip
        };

        const files = await client.getFiles(queryParams);
        
        if (files.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No files found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Found ${files.length} files:**\n\n` +
              files.map(f => 
                `• **${f.Filename}** (${f.ConnectorId})\n` +
                `  Folder: ${f.Folder}\n` +
                `  Message ID: ${f.MessageId}\n` +
                `  Size: ${formatFileSize(f.FileSize)}\n` +
                `  Created: ${formatDate(f.TimeCreated)}\n` +
                (f.Subfolder ? `  Subfolder: ${f.Subfolder}\n` : '') +
                (f.BatchGroupId ? `  Batch Group: ${f.BatchGroupId}\n` : '') +
                (f.IsBatchGroup ? `  Is Batch Group: Yes\n` : '')
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "get_file",
      description: "Get detailed information about a specific Arc file",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The connector ID that processed the file"
          },
          folder: {
            type: "string", 
            description: "The folder where the file is located"
          },
          filename: {
            type: "string",
            description: "The name of the file"
          },
          messageId: {
            type: "string",
            description: "The message ID associated with the file"
          }
        },
        required: ["connectorId", "folder", "filename", "messageId"]
      },
      handler: async (args: any) => {
        const validated = GetFileSchema.parse(args);
        
        const file = await client.getFile(
          validated.connectorId, 
          validated.folder,
          validated.filename,
          validated.messageId
        );
        
        if (!file) {
          return {
            content: [{
              type: "text",
              text: `File not found: ${validated.filename} in ${validated.folder} for connector ${validated.connectorId}`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**File Details**\n\n` +
              `**Filename:** ${file.Filename}\n` +
              `**Connector ID:** ${file.ConnectorId}\n` +
              `**Folder:** ${file.Folder}\n` +
              `**Message ID:** ${file.MessageId}\n` +
              `**Size:** ${formatFileSize(file.FileSize)}\n` +
              `**Created:** ${formatDate(file.TimeCreated)}\n` +
              `**File Path:** ${file.FilePath || 'N/A'}\n` +
              (file.Subfolder ? `**Subfolder:** ${file.Subfolder}\n` : '') +
              (file.BatchGroupId ? `**Batch Group ID:** ${file.BatchGroupId}\n` : '') +
              (file.IsBatchGroup ? `**Is Batch Group:** Yes\n` : '') +
              (file.Content ? `**Has Content:** Yes (Base64 encoded)\n` : `**Has Content:** No\n`)
          }]
        };
      }
    },

    {
      name: "create_file",
      description: "Create a new Arc file",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The connector ID that will process the file"
          },
          folder: {
            type: "string", 
            description: "The folder where the file will be stored"
          },
          filename: {
            type: "string",
            description: "The name of the file"
          },
          messageId: {
            type: "string",
            description: "The message ID associated with the file"
          },
          subfolder: {
            type: "string",
            description: "Optional subfolder within the main folder"
          },
          timeCreated: {
            type: "string",
            description: "File creation timestamp (ISO format)"
          },
          filePath: {
            type: "string", 
            description: "Full path to the file"
          },
          fileSize: {
            type: "number",
            description: "Size of the file in bytes"
          },
          content: {
            type: "string",
            description: "Base64 encoded file content"
          },
          batchGroupId: {
            type: "string",
            description: "Batch group identifier for related files"
          },
          isBatchGroup: {
            type: "boolean",
            description: "Whether this file represents a batch group"
          }
        },
        required: ["connectorId", "folder", "filename", "messageId"]
      },
      handler: async (args: any) => {
        const validated = CreateFileSchema.parse(args);
        
        const fileData = {
          ConnectorId: validated.connectorId,
          Folder: validated.folder,
          Filename: validated.filename,
          MessageId: validated.messageId,
          Subfolder: validated.subfolder,
          TimeCreated: validated.timeCreated,
          FilePath: validated.filePath,
          FileSize: validated.fileSize,
          Content: validated.content,
          BatchGroupId: validated.batchGroupId,
          IsBatchGroup: validated.isBatchGroup
        };

        const file = await client.createFile(fileData);
        
        return {
          content: [{
            type: "text",
            text: `**File Created Successfully**\n\n` +
              `**Filename:** ${file.Filename}\n` +
              `**Connector ID:** ${file.ConnectorId}\n` +
              `**Folder:** ${file.Folder}\n` +
              `**Message ID:** ${file.MessageId}\n` +
              `**Size:** ${formatFileSize(file.FileSize)}\n` +
              `**Created:** ${formatDate(file.TimeCreated)}\n` +
              (file.Subfolder ? `**Subfolder:** ${file.Subfolder}\n` : '') +
              (file.BatchGroupId ? `**Batch Group ID:** ${file.BatchGroupId}\n` : '') +
              (file.IsBatchGroup ? `**Is Batch Group:** Yes\n` : '')
          }]
        };
      }
    },

    {
      name: "update_file",
      description: "Update an existing Arc file",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The connector ID that processed the file"
          },
          folder: {
            type: "string",
            description: "The folder where the file is located"
          },
          filename: {
            type: "string", 
            description: "The name of the file"
          },
          messageId: {
            type: "string",
            description: "The message ID associated with the file"
          },
          subfolder: {
            type: "string",
            description: "Optional subfolder within the main folder"
          },
          timeCreated: {
            type: "string",
            description: "File creation timestamp (ISO format)"
          },
          filePath: {
            type: "string",
            description: "Full path to the file"
          },
          fileSize: {
            type: "number",
            description: "Size of the file in bytes"
          },
          content: {
            type: "string",
            description: "Base64 encoded file content"
          },
          batchGroupId: {
            type: "string",
            description: "Batch group identifier for related files"
          },
          isBatchGroup: {
            type: "boolean",
            description: "Whether this file represents a batch group"
          }
        },
        required: ["connectorId", "folder", "filename", "messageId"]
      },
      handler: async (args: any) => {
        const validated = UpdateFileSchema.parse(args);
        
        const updates = {
          ...(validated.subfolder !== undefined && { Subfolder: validated.subfolder }),
          ...(validated.timeCreated !== undefined && { TimeCreated: validated.timeCreated }),
          ...(validated.filePath !== undefined && { FilePath: validated.filePath }),
          ...(validated.fileSize !== undefined && { FileSize: validated.fileSize }),
          ...(validated.content !== undefined && { Content: validated.content }),
          ...(validated.batchGroupId !== undefined && { BatchGroupId: validated.batchGroupId }),
          ...(validated.isBatchGroup !== undefined && { IsBatchGroup: validated.isBatchGroup })
        };

        const file = await client.updateFile(
          validated.connectorId,
          validated.folder,
          validated.filename,
          validated.messageId,
          updates
        );
        
        return {
          content: [{
            type: "text",
            text: `**File Updated Successfully**\n\n` +
              `**Filename:** ${file.Filename}\n` +
              `**Connector ID:** ${file.ConnectorId}\n` +
              `**Folder:** ${file.Folder}\n` +
              `**Message ID:** ${file.MessageId}\n` +
              `**Size:** ${formatFileSize(file.FileSize)}\n` +
              `**Updated:** ${formatDate(file.TimeCreated)}\n` +
              (file.Subfolder ? `**Subfolder:** ${file.Subfolder}\n` : '') +
              (file.BatchGroupId ? `**Batch Group ID:** ${file.BatchGroupId}\n` : '') +
              (file.IsBatchGroup ? `**Is Batch Group:** Yes\n` : '')
          }]
        };
      }
    },

    {
      name: "delete_file",
      description: "Delete a specific Arc file permanently",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The connector ID that processed the file"
          },
          folder: {
            type: "string",
            description: "The folder where the file is located"  
          },
          filename: {
            type: "string",
            description: "The name of the file to delete"
          },
          messageId: {
            type: "string",
            description: "The message ID associated with the file"
          }
        },
        required: ["connectorId", "folder", "filename", "messageId"]
      },
      handler: async (args: any) => {
        const validated = DeleteFileSchema.parse(args);
        
        await client.deleteFile(
          validated.connectorId,
          validated.folder, 
          validated.filename,
          validated.messageId
        );
        
        return {
          content: [{
            type: "text",
            text: `**File Deleted**\n\nFile '${validated.filename}' has been permanently deleted from folder '${validated.folder}' for connector '${validated.connectorId}'.`
          }]
        };
      }
    },

    {
      name: "get_files_by_connector",
      description: "Get all files processed by a specific connector",
      inputSchema: {
        type: "object",
        properties: {
          connectorId: {
            type: "string",
            description: "The connector ID to filter files by"
          },
          top: {
            type: "number",
            description: "Maximum number of results to return"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'TimeCreated DESC')"
          }
        },
        required: ["connectorId"]
      },
      handler: async (args: any) => {
        const connectorId = z.string().parse(args.connectorId);
        const top = z.number().positive().optional().parse(args.top);
        const orderby = z.string().optional().parse(args.orderby);
        
        const queryParams = {
          $filter: `ConnectorId eq '${connectorId}'`,
          $top: top,
          $orderby: orderby || 'TimeCreated DESC'
        };

        const files = await client.getFiles(queryParams);
        
        if (files.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No files found for connector '${connectorId}'.`
            }]
          };
        }

        const totalSize = files.reduce((sum, f) => sum + (f.FileSize || 0), 0);
        
        return {
          content: [{
            type: "text",
            text: `**Files for Connector '${connectorId}'**\n\n` +
              `**Total Files:** ${files.length}\n` +
              `**Total Size:** ${formatFileSize(totalSize)}\n\n` +
              `**Files:**\n` +
              files.map(f => 
                `• **${f.Filename}**\n` +
                `  Folder: ${f.Folder}\n` +
                `  Size: ${formatFileSize(f.FileSize)}\n` +
                `  Created: ${formatDate(f.TimeCreated)}`
              ).join('\n\n')
          }]
        };
      }
    },

    {
      name: "get_recent_files",
      description: "Get recently processed files across all connectors",
      inputSchema: {
        type: "object",
        properties: {
          hours: {
            type: "number",
            description: "Number of hours back to look for files (default: 24)"
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
          $filter: `TimeCreated ge '${isoDate}'`,
          $orderby: 'TimeCreated DESC',
          $top: top
        };

        const files = await client.getFiles(queryParams);
        
        if (files.length === 0) {
          return {
            content: [{
              type: "text", 
              text: `No files found in the last ${hours} hours.`
            }]
          };
        }

        const groupedByConnector = files.reduce((groups: any, file) => {
          const connector = file.ConnectorId;
          if (!groups[connector]) {
            groups[connector] = [];
          }
          groups[connector].push(file);
          return groups;
        }, {});

        let result = `**Recent Files (Last ${hours} hours)**\n\n`;
        result += `**Total Files:** ${files.length}\n\n`;
        
        Object.entries(groupedByConnector).forEach(([connectorId, connectorFiles]) => {
          const files = connectorFiles as any[];
          result += `**${connectorId}** (${files.length} files)\n`;
          files.slice(0, 5).forEach(f => {
            result += `  • ${f.Filename} - ${formatFileSize(f.FileSize)} - ${formatDate(f.TimeCreated)}\n`;
          });
          if (files.length > 5) {
            result += `  • ... and ${files.length - 5} more\n`;
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