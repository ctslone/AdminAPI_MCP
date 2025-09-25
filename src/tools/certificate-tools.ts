import { z } from 'zod';
import type { ArcApiClient } from '../services/arc-client.js';

// Zod schemas for validation
const GetCertificatesSchema = z.object({
  select: z.string().optional(),
  filter: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().positive().optional(),
  skip: z.number().nonnegative().optional()
});

const GetCertificateSchema = z.object({
  name: z.string().min(1, "Certificate name is required")
});

const CreateCertificateSchema = z.object({
  name: z.string().min(1, "Certificate name is required"),
  data: z.string().optional(),
  storeType: z.string().optional(),
  subject: z.string().optional(),
  issuer: z.string().optional(),
  issuedTo: z.string().optional(),
  issuedBy: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  expirationDays: z.number().optional(),
  serialnumber: z.string().optional(),
  thumbprint: z.string().optional(),
  keysize: z.string().optional(),
  signatureAlgorithm: z.string().optional(),
  connectorIds: z.string().optional()
});

const DeleteCertificateSchema = z.object({
  name: z.string().min(1, "Certificate name is required")
});

export function createCertificateTools(client: ArcApiClient) {
  return [
    {
      name: "list_certificates",
      description: "List Arc certificates with optional filtering and pagination",
      inputSchema: {
        type: "object",
        properties: {
          select: {
            type: "string",
            description: "Comma-separated list of properties to include (e.g., 'Name,Subject,ExpirationDate')"
          },
          filter: {
            type: "string", 
            description: "OData filter expression (e.g., \"ExpirationDays lt 30\" or \"Subject contains 'MyCompany'\")"
          },
          orderby: {
            type: "string",
            description: "Order results by property (e.g., 'Name ASC' or 'ExpirationDate DESC')"
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
        const validated = GetCertificatesSchema.parse(args);
        
        const queryParams = {
          $select: validated.select,
          $filter: validated.filter,
          $orderby: validated.orderby,
          $top: validated.top,
          $skip: validated.skip
        };

        const certificates = await client.getCertificates(queryParams);
        
        return {
          content: [
            {
              type: "text",
              text: `🔐 **Found ${certificates.length} certificates:**\n\n` +
                certificates.map(cert => 
                  `• **${cert.Name}**\n` +
                  `  Subject: ${cert.Subject || 'N/A'}\n` +
                  `  Issuer: ${cert.IssuedBy || cert.Issuer || 'N/A'}\n` +
                  `  Expires: ${cert.ExpirationDate || 'N/A'}` +
                  (cert.ExpirationDays !== undefined ? ` (${cert.ExpirationDays} days)` : '') + '\n' +
                  `  Thumbprint: ${cert.Thumbprint || 'N/A'}\n` +
                  (cert.ConnectorIds ? `  Used by: ${cert.ConnectorIds}\n` : '')
                ).join('\n')
            }
          ]
        };
      }
    },

    {
      name: "get_certificate", 
      description: "Get detailed information about a specific Arc certificate",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the certificate file"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = GetCertificateSchema.parse(args);
        const certificate = await client.getCertificate(validated.name);
        
        if (!certificate) {
          return {
            content: [{
              type: "text", 
              text: `❌ Certificate '${validated.name}' not found.`
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `🔐 **Certificate Details**\n\n` +
              `**Name:** ${certificate.Name}\n` +
              `**Store Type:** ${certificate.StoreType || 'N/A'}\n` +
              `**Subject:** ${certificate.Subject || 'N/A'}\n` +
              `**Issued To:** ${certificate.IssuedTo || 'N/A'}\n` +
              `**Issuer:** ${certificate.Issuer || 'N/A'}\n` +
              `**Issued By:** ${certificate.IssuedBy || 'N/A'}\n` +
              `**Effective Date:** ${certificate.EffectiveDate || 'N/A'}\n` +
              `**Expiration Date:** ${certificate.ExpirationDate || 'N/A'}\n` +
              (certificate.ExpirationDays !== undefined ? `**Days Until Expiration:** ${certificate.ExpirationDays}\n` : '') +
              `**Serial Number:** ${certificate.Serialnumber || 'N/A'}\n` +
              `**Thumbprint:** ${certificate.Thumbprint || 'N/A'}\n` +
              `**Key Size:** ${certificate.Keysize || 'N/A'}\n` +
              `**Signature Algorithm:** ${certificate.SignatureAlgorithm || 'N/A'}\n` +
              (certificate.ConnectorIds ? `**Used by Connectors:** ${certificate.ConnectorIds}\n` : '') +
              (certificate.Data ? `**Has Certificate Data:** Yes\n` : `**Has Certificate Data:** No\n`)
          }]
        };
      }
    },

    {
      name: "create_certificate",
      description: "Create a new Arc certificate",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string", 
            description: "The name of the certificate file (required)"
          },
          data: {
            type: "string",
            description: "The base-64 encoded contents of the certificate file"
          },
          storeType: {
            type: "string",
            description: "The store type (e.g., 'PKCS12', 'PEM')"
          },
          subject: {
            type: "string",
            description: "The certificate subject (e.g., 'CN=My Company, O=My Org, C=US')"
          },
          issuer: {
            type: "string",
            description: "The issuer of the certificate"
          },
          issuedTo: {
            type: "string", 
            description: "The common name of certificate subject"
          },
          issuedBy: {
            type: "string",
            description: "The common name of certificate issuer"
          },
          effectiveDate: {
            type: "string",
            description: "The effective date of the certificate"
          },
          expirationDate: {
            type: "string",
            description: "The expiration date of the certificate"
          },
          expirationDays: {
            type: "number",
            description: "The days until the expiration date of the certificate"
          },
          serialnumber: {
            type: "string",
            description: "The serial number of the certificate"
          },
          thumbprint: {
            type: "string",
            description: "The SHA1 thumbprint of the certificate"
          },
          keysize: {
            type: "string",
            description: "The key size of the certificate"
          },
          signatureAlgorithm: {
            type: "string",
            description: "The algorithm used to sign the certificate"
          },
          connectorIds: {
            type: "string",
            description: "Comma-separated list of connector IDs that should use this certificate"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = CreateCertificateSchema.parse(args);
        
        const certificateData = {
          Name: validated.name,
          Data: validated.data,
          StoreType: validated.storeType,
          Subject: validated.subject,
          Issuer: validated.issuer,
          IssuedTo: validated.issuedTo,
          IssuedBy: validated.issuedBy,
          EffectiveDate: validated.effectiveDate,
          ExpirationDate: validated.expirationDate,
          ExpirationDays: validated.expirationDays,
          Serialnumber: validated.serialnumber,
          Thumbprint: validated.thumbprint,
          Keysize: validated.keysize,
          SignatureAlgorithm: validated.signatureAlgorithm,
          ConnectorIds: validated.connectorIds
        };

        const certificate = await client.createCertificate(certificateData);
        
        return {
          content: [{
            type: "text",
            text: `✅ **Certificate Created Successfully**\n\n` +
              `**Name:** ${certificate.Name}\n` +
              `**Subject:** ${certificate.Subject || 'N/A'}\n` +
              `**Store Type:** ${certificate.StoreType || 'N/A'}\n` +
              `**Expiration:** ${certificate.ExpirationDate || 'N/A'}` +
              (certificate.ExpirationDays !== undefined ? ` (${certificate.ExpirationDays} days)` : '')
          }]
        };
      }
    },

    {
      name: "delete_certificate",
      description: "Delete an Arc certificate permanently", 
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the certificate file to delete"
          }
        },
        required: ["name"]
      },
      handler: async (args: any) => {
        const validated = DeleteCertificateSchema.parse(args);
        
        await client.deleteCertificate(validated.name);
        
        return {
          content: [{
            type: "text",
            text: `🗑️ **Certificate Deleted**\n\nCertificate '${validated.name}' has been permanently deleted.`
          }]
        };
      }
    }
  ];
}