import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Profile schema accepts any property since Arc supports hundreds of profile settings
// including protocol-specific ones like "as2:as2identifier", "as4:partyid", etc.
const UpdateProfileSchema = z.record(z.any()).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one profile property must be provided" }
);

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return 'Unknown';
  if (bytes === 0) return '0 bytes';

  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function createProfileTools(client: ArcApiClient) {
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
      description: "Update Arc application profile configuration settings. Accepts any profile property including protocol-specific settings. IMPORTANT: Only use property names that exist in the actual profile response.\n\n" +
        "Common examples:\n" +
        "- Global settings: loglevel, ssoenabled, notifyemailfrom, smtpserver, etc.\n\n" +
        "- AS2 CERTIFICATE/KEY settings (note: AS2 uses 'keypath', NOT 'signingcertificate'):\n" +
        "  • as2:signingkeypath, as2:signingkeypassword, as2:signingkeysubject\n" +
        "  • as2:privatekeypath, as2:privatekeypassword, as2:privatekeysubject\n" +
        "  • as2:publickeypath\n" +
        "  • as2:rolloversigningkeypath, as2:rolloversigningkeypassword, as2:rolloversigningkeysubject\n" +
        "  • as2:rolloverprivatekeypath, as2:rolloverprivatekeypassword, as2:rolloverprivatekeysubject\n" +
        "  • as2:rolloverpublickeypath\n\n" +
        "- AS2 other settings: as2:as2identifier, as2:receivingurl, as2:publicurl, as2:baseurl, etc.\n\n" +
        "- AS3/AS4 CERTIFICATE settings (these use 'signingcertificate', different from AS2):\n" +
        "  • as4:signingcertificate, as4:signingcertificatepassword, as4:signingcertificatesubject\n" +
        "  • as4:rolloversigningcertificate, as4:rolloversigningcertificatepassword, as4:rolloversigningcertificatesubject\n\n" +
        "- AS4 other settings: as4:partyid, as4:partyidtype, etc.\n\n" +
        "- Other protocols: sftp:*, ftp:*, http:*, etc.\n\n" +
        "Property names must be lowercase and use colons for protocol-specific settings. Always verify property names exist in the profile before using them.",
      inputSchema: {
        type: "object",
        description: "Profile properties to update. Accepts any valid Arc profile property name. Must use lowercase property names that exist in the actual profile response.",
        additionalProperties: true
      },
      handler: async (args: any) => {
        const validated = UpdateProfileSchema.parse(args);

        if (Object.keys(validated).length === 0) {
          return {
            content: [{
              type: "text",
              text: "No valid configuration updates provided."
            }]
          };
        }

        // Validate property names - warn about potentially incorrect properties
        const warnings: string[] = [];

        // Common mistakes to detect
        for (const key of Object.keys(validated)) {
          // Check for AS2-specific mistakes
          if (key.startsWith('as2:') && key.includes('cert') && !key.includes('key')) {
            if (key === 'as2:signingcert' || key === 'as2:encryptioncert' ||
                key === 'as2:signingcertificate' || key === 'as2:encryptioncertificate') {
              warnings.push(`Property "${key}" may be incorrect for AS2. AS2 uses 'keypath' properties instead (e.g., as2:signingkeypath). Did you mean that?`);
            }
          }
          // Check for AS4 properties being used with AS2 naming
          else if (key.startsWith('as2:') && (key === 'as2:signingcertificate' || key === 'as2:rolloversigningcertificate')) {
            warnings.push(`Property "${key}" appears to be for AS4/AS3, not AS2. Use "as2:signingkeypath" instead.`);
          }
        }

        const updatedProfile = await client.updateProfile(validated);

        let resultText = `**Profile Updated Successfully**\n\n`;
        if (warnings.length > 0) {
          resultText += `**Warnings:**\n${warnings.join('\n')}\n\n`;
        }
        resultText += `Updated settings:\n` +
          Object.entries(validated).map(([key, value]) => `  • ${key}: ${value}`).join('\n');

        return {
          content: [{
            type: "text",
            text: resultText
          }]
        };
      }
    }
  ];
}
