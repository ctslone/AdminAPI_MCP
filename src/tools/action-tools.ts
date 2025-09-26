import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';
import type { CleanupInput } from '../types/arc-api.js';

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
    }
  ];
}