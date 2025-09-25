import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetReportsSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetReportSchema = z.object({
  name: z.string().min(1, "Report name is required")
});

const CreateReportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  type: z.string().optional(),
  timePeriod: z.string().optional(),
  columns: z.string().optional(),
  groupRows: z.string().optional(),
  filters: z.string().optional(),
  summary: z.string().optional(),
  schedule: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.string().optional(),
  emailReport: z.boolean().optional(),
  emailSubject: z.string().optional(),
  emailRecipients: z.string().optional(),
  timePeriodStart: z.string().optional(),
  timePeriodEnd: z.string().optional()
});

const UpdateReportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  type: z.string().optional(),
  timePeriod: z.string().optional(),
  columns: z.string().optional(),
  groupRows: z.string().optional(),
  filters: z.string().optional(),
  summary: z.string().optional(),
  schedule: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.string().optional(),
  emailReport: z.boolean().optional(),
  emailSubject: z.string().optional(),
  emailRecipients: z.string().optional(),
  timePeriodStart: z.string().optional(),
  timePeriodEnd: z.string().optional()
});

const DeleteReportSchema = z.object({
  name: z.string().min(1, "Report name is required")
});

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not set';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function formatReportType(type?: string): string {
  if (!type) return 'Not specified';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export function createReportTools(client: ArcApiClient) {
  return [
    {
      name: "list_reports",
      description: "List Arc reports with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Name,Type,CreatedTime')"
          },
          filter: {
            type: "string",
            description: "OData filter expression (e.g., \"Type eq 'Summary'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'CreatedTime DESC' or 'Name ASC')"
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
        const validated = GetReportsSchema.parse(args);

        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby,
          $top: validated.top,
          $skip: validated.skip
        };

        const reports = await client.getReports(queryParams);

        if (reports.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No reports found matching the criteria."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Found ${reports.length} reports:\n\n` +
              reports.map(r =>
                `**${r.Name || 'Unnamed Report'}**\n` +
                `  Type: ${formatReportType(r.Type)}\n` +
                `  Created: ${formatDate(r.CreatedTime)} by ${r.CreatedBy || 'Unknown'}\n` +
                `  Modified: ${formatDate(r.ModifiedTime)}\n` +
                `  Format: ${r.Format || 'Not specified'}\n` +
                `  Email Reports: ${r.EmailReport ? 'Yes' : 'No'}\n` +
                (r.Schedule ? `  Schedule: ${r.Schedule}\n` : '') +
                (r.TimePeriod ? `  Time Period: ${r.TimePeriod} days\n` : '') +
                '\n'
              ).join('')
          }]
        };
      }
    },

    {
      name: "get_report",
      description: "Get detailed information about a specific Arc report",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the report to retrieve"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = GetReportSchema.parse(args);
        const report = await client.getReport(validated.name);

        if (!report) {
          return {
            content: [{
              type: "text",
              text: `Report '${validated.name}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `**Report Details: ${report.Name}**\n\n` +
              `**Basic Information:**\n` +
              `  • Type: ${formatReportType(report.Type)}\n` +
              `  • Created: ${formatDate(report.CreatedTime)} by ${report.CreatedBy || 'Unknown'}\n` +
              `  • Last Modified: ${formatDate(report.ModifiedTime)}\n` +
              `  • Format: ${report.Format || 'Not specified'}\n\n` +

              `**Data Configuration:**\n` +
              `  • Time Period: ${report.TimePeriod ? `${report.TimePeriod} days` : 'Not set'}\n` +
              `  • Columns: ${report.Columns || 'Default columns'}\n` +
              `  • Group By: ${report.GroupRows || 'No grouping'}\n` +
              `  • Filters: ${report.Filters || 'No filters'}\n` +
              `  • Summary: ${report.Summary || 'No summary'}\n\n` +

              `**Scheduling:**\n` +
              `  • Schedule: ${report.Schedule || 'Not scheduled'}\n` +
              `  • Start Date: ${formatDate(report.StartDate)}\n` +
              `  • End Date: ${formatDate(report.EndDate)}\n` +
              `  • Custom Period Start: ${formatDate(report.TimePeriodStart)}\n` +
              `  • Custom Period End: ${formatDate(report.TimePeriodEnd)}\n\n` +

              `**Email Configuration:**\n` +
              `  • Email Reports: ${report.EmailReport ? 'Enabled' : 'Disabled'}\n` +
              (report.EmailReport ? (
                `  • Subject: ${report.EmailSubject || 'Default subject'}\n` +
                `  • Recipients: ${report.EmailRecipients || 'Not set'}\n`
              ) : '')
          }]
        };
      }
    },

    {
      name: "create_report",
      description: "Create a new Arc report with specified configuration",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Unique name for the new report"
          },
          type: {
            type: "string",
            description: "Type of report (e.g., 'Summary', 'Detailed', 'Transaction')"
          },
          timePeriod: {
            type: "string",
            description: "Time period in days (e.g., '7', '30', '90')"
          },
          columns: {
            type: "string",
            description: "Comma-separated list of columns to include"
          },
          groupRows: {
            type: "string",
            description: "Columns to group by in the report"
          },
          filters: {
            type: "string",
            description: "Filter criteria (e.g., 'ConnectorType=SFTP,FTP;ConnectorId=SFTP1')"
          },
          summary: {
            type: "string",
            description: "Summary information to include in the report"
          },
          schedule: {
            type: "string",
            description: "Cron schedule expression for automated reports"
          },
          startDate: {
            type: "string",
            description: "Schedule start date (ISO format)"
          },
          endDate: {
            type: "string",
            description: "Schedule end date (ISO format)"
          },
          format: {
            type: "string",
            description: "Report format (e.g., 'PDF', 'CSV', 'Excel')"
          },
          emailReport: {
            type: "boolean",
            description: "Whether to send report via email"
          },
          emailSubject: {
            type: "string",
            description: "Email subject line"
          },
          emailRecipients: {
            type: "string",
            description: "Comma-separated list of email recipients"
          },
          timePeriodStart: {
            type: "string",
            description: "Custom time period start (ISO format)"
          },
          timePeriodEnd: {
            type: "string",
            description: "Custom time period end (ISO format)"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = CreateReportSchema.parse(args);

        const reportData = {
          Name: validated.name,
          Type: validated.type,
          TimePeriod: validated.timePeriod,
          Columns: validated.columns,
          GroupRows: validated.groupRows,
          Filters: validated.filters,
          Summary: validated.summary,
          Schedule: validated.schedule,
          StartDate: validated.startDate,
          EndDate: validated.endDate,
          Format: validated.format,
          EmailReport: validated.emailReport,
          EmailSubject: validated.emailSubject,
          EmailRecipients: validated.emailRecipients,
          TimePeriodStart: validated.timePeriodStart,
          TimePeriodEnd: validated.timePeriodEnd
        };

        const report = await client.createReport(reportData);

        return {
          content: [{
            type: "text",
            text: `**Report Created Successfully**\n\n` +
              `**Name:** ${report.Name}\n` +
              `**Type:** ${formatReportType(report.Type)}\n` +
              `**Format:** ${report.Format || 'Default'}\n` +
              `**Created:** ${formatDate(report.CreatedTime)}\n` +
              `**Email Reports:** ${report.EmailReport ? 'Enabled' : 'Disabled'}\n` +
              (report.Schedule ? `**Schedule:** ${report.Schedule}\n` : '') +
              (report.TimePeriod ? `**Time Period:** ${report.TimePeriod} days\n` : '')
          }]
        };
      }
    },

    {
      name: "update_report",
      description: "Update an existing Arc report configuration",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the report to update"
          },
          type: {
            type: "string",
            description: "Type of report (e.g., 'Summary', 'Detailed', 'Transaction')"
          },
          timePeriod: {
            type: "string",
            description: "Time period in days (e.g., '7', '30', '90')"
          },
          columns: {
            type: "string",
            description: "Comma-separated list of columns to include"
          },
          groupRows: {
            type: "string",
            description: "Columns to group by in the report"
          },
          filters: {
            type: "string",
            description: "Filter criteria (e.g., 'ConnectorType=SFTP,FTP;ConnectorId=SFTP1')"
          },
          summary: {
            type: "string",
            description: "Summary information to include in the report"
          },
          schedule: {
            type: "string",
            description: "Cron schedule expression for automated reports"
          },
          startDate: {
            type: "string",
            description: "Schedule start date (ISO format)"
          },
          endDate: {
            type: "string",
            description: "Schedule end date (ISO format)"
          },
          format: {
            type: "string",
            description: "Report format (e.g., 'PDF', 'CSV', 'Excel')"
          },
          emailReport: {
            type: "boolean",
            description: "Whether to send report via email"
          },
          emailSubject: {
            type: "string",
            description: "Email subject line"
          },
          emailRecipients: {
            type: "string",
            description: "Comma-separated list of email recipients"
          },
          timePeriodStart: {
            type: "string",
            description: "Custom time period start (ISO format)"
          },
          timePeriodEnd: {
            type: "string",
            description: "Custom time period end (ISO format)"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = UpdateReportSchema.parse(args);

        const updates = {
          ...(validated.type !== undefined && { Type: validated.type }),
          ...(validated.timePeriod !== undefined && { TimePeriod: validated.timePeriod }),
          ...(validated.columns !== undefined && { Columns: validated.columns }),
          ...(validated.groupRows !== undefined && { GroupRows: validated.groupRows }),
          ...(validated.filters !== undefined && { Filters: validated.filters }),
          ...(validated.summary !== undefined && { Summary: validated.summary }),
          ...(validated.schedule !== undefined && { Schedule: validated.schedule }),
          ...(validated.startDate !== undefined && { StartDate: validated.startDate }),
          ...(validated.endDate !== undefined && { EndDate: validated.endDate }),
          ...(validated.format !== undefined && { Format: validated.format }),
          ...(validated.emailReport !== undefined && { EmailReport: validated.emailReport }),
          ...(validated.emailSubject !== undefined && { EmailSubject: validated.emailSubject }),
          ...(validated.emailRecipients !== undefined && { EmailRecipients: validated.emailRecipients }),
          ...(validated.timePeriodStart !== undefined && { TimePeriodStart: validated.timePeriodStart }),
          ...(validated.timePeriodEnd !== undefined && { TimePeriodEnd: validated.timePeriodEnd })
        };

        const report = await client.updateReport(validated.name, updates);

        return {
          content: [{
            type: "text",
            text: `**Report Updated Successfully**\n\n` +
              `**Name:** ${report.Name}\n` +
              `**Type:** ${formatReportType(report.Type)}\n` +
              `**Last Modified:** ${formatDate(report.ModifiedTime)}\n\n` +
              `Updated settings:\n` +
              Object.entries(updates).map(([key, value]) =>
                `  • ${key}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}`
              ).join('\n')
          }]
        };
      }
    },

    {
      name: "delete_report",
      description: "Delete an Arc report permanently",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the report to delete"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = DeleteReportSchema.parse(args);

        await client.deleteReport(validated.name);

        return {
          content: [{
            type: "text",
            text: `**Report Deleted**\n\nReport '${validated.name}' has been permanently deleted.`
          }]
        };
      }
    }
  ];
}