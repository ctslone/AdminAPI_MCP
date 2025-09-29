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

const CreateCertSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  commonName: z.string().min(1, "Common name is required"),
  serialnumber: z.string().min(1, "Serial number is required"),
  password: z.string().min(1, "Password is required"),
  country: z.string().optional(),
  email: z.string().optional(),
  expiration: z.string().optional(),
  keySize: z.string().optional(),
  publicKeyType: z.string().optional(),
  signatureAlgorithm: z.string().optional(),
  locality: z.string().optional(),
  organization: z.string().optional(),
  organizationalUnit: z.string().optional(),
  state: z.string().optional()
});

const ExchangeCertSchema = z.object({
  workspaceId: z.string().optional(),
  connectorId: z.string().optional(),
  portId: z.string().optional(),
  certificate: z.string().min(1, "Certificate is required"),
  exchangeType: z.string().min(1, "Exchange type is required"),
  certificatePassword: z.string().optional(),
  certificateUsage: z.string().optional(),
  responseURL: z.string().optional(),
  requestId: z.string().optional()
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
    },

    {
      name: "create_cert",
      description: "Create a public/private certificate key pair with specified parameters",
      inputSchema: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "The certificate filename"
          },
          commonName: {
            type: "string",
            description: "The common name for the certificate"
          },
          serialnumber: {
            type: "string",
            description: "The serial number for the certificate"
          },
          password: {
            type: "string",
            description: "The password to protect the private key"
          },
          country: {
            type: "string",
            description: "The country"
          },
          email: {
            type: "string",
            description: "Email address"
          },
          expiration: {
            type: "string",
            description: "Expiration in years (default: 1)"
          },
          keySize: {
            type: "string",
            description: "The key size (default: 2048)"
          },
          publicKeyType: {
            type: "string",
            description: "The public key type (default: X.509)"
          },
          signatureAlgorithm: {
            type: "string",
            description: "The signature algorithm (default: SHA256)"
          },
          locality: {
            type: "string",
            description: "The locality/city"
          },
          organization: {
            type: "string",
            description: "The organization name"
          },
          organizationalUnit: {
            type: "string",
            description: "The organizational unit"
          },
          state: {
            type: "string",
            description: "The state/province"
          }
        },
        required: ["filename", "commonName", "serialnumber", "password"]
      },
      handler: async (args: any) => {
        const validated = CreateCertSchema.parse(args);

        const certInput = {
          Filename: validated.filename,
          CommonName: validated.commonName,
          Serialnumber: validated.serialnumber,
          Password: validated.password,
          Country: validated.country,
          Email: validated.email,
          Expiration: validated.expiration,
          KeySize: validated.keySize,
          PublicKeyType: validated.publicKeyType,
          SignatureAlgorithm: validated.signatureAlgorithm,
          Locality: validated.locality,
          Organization: validated.organization,
          OrganizationalUnit: validated.organizationalUnit,
          State: validated.state
        };

        const result = await client.createCert(certInput);

        let responseText = `**Certificate Created Successfully**\n\n` +
          `**Filename:** ${validated.filename}\n` +
          `**Common Name:** ${validated.commonName}\n` +
          `**Serial Number:** ${validated.serialnumber}`;

        if (result && result.length > 0) {
          if (result[0].Name) {
            responseText += `\n**Created File:** ${result[0].Name}`;
          }
          if (result[0].Password) {
            responseText += `\n**Password:** ${result[0].Password}`;
          }
        }

        // Add configuration details
        if (validated.expiration) responseText += `\n**Expiration:** ${validated.expiration} years`;
        if (validated.keySize) responseText += `\n**Key Size:** ${validated.keySize}`;
        if (validated.signatureAlgorithm) responseText += `\n**Signature Algorithm:** ${validated.signatureAlgorithm}`;

        return {
          content: [{
            type: "text",
            text: responseText
          }]
        };
      }
    },

    {
      name: "exchange_cert",
      description: "Exchange the specified certificate for AS2 or OFTP protocols",
      inputSchema: {
        type: "object",
        properties: {
          workspaceId: {
            type: "string",
            description: "The workspace ID"
          },
          connectorId: {
            type: "string",
            description: "The connector ID"
          },
          portId: {
            type: "string",
            description: "The port ID"
          },
          certificate: {
            type: "string",
            description: "The certificate to exchange"
          },
          exchangeType: {
            type: "string",
            description: "The exchange type. Valid values: AS2(Request, Response), OFTP(Deliver, Request, Replace)"
          },
          certificatePassword: {
            type: "string",
            description: "The password of certificate (for AS2)"
          },
          certificateUsage: {
            type: "string",
            description: "The cryptographic function(s) for the certificate. Valid values: 'Encryption,Verification,ServerTLS,ClientTLS' (for AS2)"
          },
          responseURL: {
            type: "string",
            description: "The URL which the response should be sent (for AS2)"
          },
          requestId: {
            type: "string",
            description: "The Request ID (for AS2)"
          }
        },
        required: ["certificate", "exchangeType"]
      },
      handler: async (args: any) => {
        const validated = ExchangeCertSchema.parse(args);

        const exchangeInput = {
          WorkspaceId: validated.workspaceId,
          ConnectorId: validated.connectorId,
          PortId: validated.portId,
          Certificate: validated.certificate,
          ExchangeType: validated.exchangeType,
          CertificatePassword: validated.certificatePassword,
          CertificateUsage: validated.certificateUsage,
          ResponseURL: validated.responseURL,
          RequestId: validated.requestId
        };

        const result = await client.exchangeCert(exchangeInput);

        let responseText = `**Certificate Exchange Initiated**\n\n` +
          `**Exchange Type:** ${validated.exchangeType}`;

        if (validated.workspaceId) responseText += `\n**Workspace:** ${validated.workspaceId}`;
        if (validated.connectorId) responseText += `\n**Connector:** ${validated.connectorId}`;
        if (validated.portId) responseText += `\n**Port:** ${validated.portId}`;
        if (validated.certificateUsage) responseText += `\n**Usage:** ${validated.certificateUsage}`;
        if (validated.responseURL) responseText += `\n**Response URL:** ${validated.responseURL}`;
        if (validated.requestId) responseText += `\n**Request ID:** ${validated.requestId}`;

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
      }
    }
  ];
}