import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  ArcConnector,
  ArcFile,
  ArcTransaction,
  ArcLog,
  ArcProfile,
  ArcWorkspace,
  ArcVault,
  ArcCertificate,
  ApiResponse,
  QueryParams
} from '../types/arc-api.js';

export class ArcApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    
    // Setup authentication - CData Arc supports either basic auth or x-cdata-authtoken header
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (authToken) {
      // If token contains a colon, treat as username:password for basic auth
      if (authToken.includes(':')) {
        const basicAuth = Buffer.from(authToken).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
      } else {
        // Otherwise use x-cdata-authtoken header
        headers['x-cdata-authtoken'] = authToken;
      }
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers,
      timeout: 30000
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        console.error(`[Arc API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`[Arc API Error] ${error.response?.status} ${error.response?.statusText}`);
        return Promise.reject(error);
      }
    );
  }

  // Helper method to build query string from params
  private buildQueryString(params?: QueryParams): string {
    if (!params) return '';
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    
    return queryParams.toString() ? `?${queryParams.toString()}` : '';
  }

  // Connector operations
  async getConnectors(params?: QueryParams): Promise<ArcConnector[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcConnector>>(`/connectors${queryString}`);
    return response.data.value || [];
  }

  async getConnector(connectorId: string): Promise<ArcConnector | null> {
    try {
      const response = await this.client.get<ArcConnector>(`/connectors('${connectorId}')`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createConnector(connector: Partial<ArcConnector>): Promise<ArcConnector> {
    const response = await this.client.post<ArcConnector>('/connectors', connector);
    return response.data;
  }

  async updateConnector(connectorId: string, connector: Partial<ArcConnector>): Promise<ArcConnector> {
    const response = await this.client.put<ArcConnector>(`/connectors('${connectorId}')`, connector);
    return response.data;
  }

  async deleteConnector(connectorId: string): Promise<void> {
    await this.client.delete(`/connectors('${connectorId}')`);
  }

  // File operations
  async getFiles(params?: QueryParams): Promise<ArcFile[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcFile>>(`/files${queryString}`);
    return response.data.value || [];
  }

  async getFile(connectorId: string, folder: string, filename: string, messageId: string): Promise<ArcFile | null> {
    try {
      const response = await this.client.get<ArcFile>(
        `/files(ConnectorId='${connectorId}',Folder='${folder}',Filename='${filename}',MessageId='${messageId}')`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createFile(file: Partial<ArcFile>): Promise<ArcFile> {
    const response = await this.client.post<ArcFile>('/files', file);
    return response.data;
  }

  async updateFile(connectorId: string, folder: string, filename: string, messageId: string, file: Partial<ArcFile>): Promise<ArcFile> {
    const response = await this.client.put<ArcFile>(
      `/files(ConnectorId='${connectorId}',Folder='${folder}',Filename='${filename}',MessageId='${messageId}')`,
      file
    );
    return response.data;
  }

  async deleteFile(connectorId: string, folder: string, filename: string, messageId: string): Promise<void> {
    await this.client.delete(
      `/files(ConnectorId='${connectorId}',Folder='${folder}',Filename='${filename}',MessageId='${messageId}')`
    );
  }

  // Transaction operations
  async getTransactions(params?: QueryParams): Promise<ArcTransaction[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcTransaction>>(`/transactions${queryString}`);
    return response.data.value || [];
  }

  async getTransaction(id: string): Promise<ArcTransaction | null> {
    try {
      const response = await this.client.get<ArcTransaction>(`/transactions('${id}')`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  // Log operations
  async getLogs(params?: QueryParams): Promise<ArcLog[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcLog>>(`/logs${queryString}`);
    return response.data.value || [];
  }

  async getLog(id: string): Promise<ArcLog | null> {
    try {
      const response = await this.client.get<ArcLog>(`/logs('${id}')`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async deleteLog(id: string): Promise<void> {
    await this.client.delete(`/logs('${id}')`);
  }

  // Profile operations
  async getProfile(): Promise<ArcProfile[]> {
    const response = await this.client.get<ApiResponse<ArcProfile>>('/profile');
    return response.data.value || [];
  }

  async updateProfile(profile: Partial<ArcProfile>): Promise<ArcProfile> {
    const response = await this.client.put<ArcProfile>('/profile', profile);
    return response.data;
  }

  // Workspace operations
  async getWorkspaces(params?: QueryParams): Promise<ArcWorkspace[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcWorkspace>>(`/workspaces${queryString}`);
    return response.data.value || [];
  }

  async getWorkspace(workspaceId: string): Promise<ArcWorkspace | null> {
    try {
      const response = await this.client.get<ArcWorkspace>(`/workspaces('${workspaceId}')`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createWorkspace(workspace: Partial<ArcWorkspace>): Promise<ArcWorkspace> {
    const response = await this.client.post<ArcWorkspace>('/workspaces', workspace);
    return response.data;
  }

  async updateWorkspace(workspaceId: string, workspace: Partial<ArcWorkspace>): Promise<ArcWorkspace> {
    const response = await this.client.put<ArcWorkspace>(`/workspaces('${workspaceId}')`, workspace);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.client.delete(`/workspaces('${workspaceId}')`);
  }

  // Vault operations
  async getVaultEntries(params?: QueryParams): Promise<ArcVault[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcVault>>(`/vault${queryString}`);
    return response.data.value || [];
  }

  async getVaultEntry(id: string): Promise<ArcVault | null> {
    try {
      const response = await this.client.get<ArcVault>(`/vault('${id}')`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createVaultEntry(entry: Partial<ArcVault>): Promise<ArcVault> {
    const response = await this.client.post<ArcVault>('/vault', entry);
    return response.data;
  }

  async updateVaultEntry(id: string, entry: Partial<ArcVault>): Promise<ArcVault> {
    const response = await this.client.put<ArcVault>(`/vault('${id}')`, entry);
    return response.data;
  }

  async deleteVaultEntry(id: string): Promise<void> {
    await this.client.delete(`/vault('${id}')`);
  }

  // Certificate operations
  async getCertificates(params?: QueryParams): Promise<ArcCertificate[]> {
    const queryString = this.buildQueryString(params);
    const response = await this.client.get<ApiResponse<ArcCertificate>>(`/certificates${queryString}`);
    return response.data.value || [];
  }

  async getCertificate(name: string): Promise<ArcCertificate | null> {
    try {
      const response = await this.client.get<ArcCertificate>(`/certificates('${name}')`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createCertificate(certificate: Partial<ArcCertificate>): Promise<ArcCertificate> {
    const response = await this.client.post<ArcCertificate>('/certificates', certificate);
    return response.data;
  }

  async deleteCertificate(name: string): Promise<void> {
    await this.client.delete(`/certificates('${name}')`);
  }
}