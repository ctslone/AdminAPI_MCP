// Types for CData Arc Admin API entities
export interface ArcConnector {
  ConnectorId: string;
  WorkspaceId?: string;
  ConnectorType?: string;
  AutomationSend?: boolean;
  AutomationRetryInterval?: number;
  AutomationMaxAttempts?: number;
  AutomationReceive?: boolean;
  ReceiveInterval?: string;
  MaxWorkers?: number;
  MaxFiles?: number;
  SendFolder?: string;
  ReceiveFolder?: string;
  SentFolder?: string;
  SaveToSentFolder?: boolean;
  SentFolderScheme?: string;
  LogLevel?: string;
  LogSubFolderScheme?: string;
  LogMessages?: boolean;
}

export interface ArcFile {
  ConnectorId: string;
  Folder: string;
  Filename: string;
  MessageId: string;
  Subfolder?: string;
  TimeCreated?: string;
  FilePath?: string;
  FileSize?: number;
  Content?: string;
  BatchGroupId?: string;
  IsBatchGroup?: boolean;
}

export interface ArcTransaction {
  Id: string;
  ConnectorId?: string;
  Status?: string;
  StartTime?: string;
  EndTime?: string;
  MessageCount?: number;
  ErrorMessage?: string;
}

export interface ArcLog {
  Id: string;
  Timestamp?: string;
  Level?: string;
  Message?: string;
  ConnectorId?: string;
  Category?: string;
}

export interface ArcProfile {
  LogLevel?: string;
  MaxLogSize?: number;
  LogRetentionDays?: number;
  NotifyStopStart?: boolean;
  SSOEnabled?: boolean;
  [key: string]: any;
}

export interface ArcWorkspace {
  Workspaceid: string;
  Name?: string;
  Description?: string;
  CreatedDate?: string;
}

export interface ArcVault {
  Id: string;
  Name?: string;
  Value?: string;
  Description?: string;
}

export interface ArcCertificate {
  Name: string;
  Data?: string;
  StoreType?: string;
  Subject?: string;
  Issuer?: string;
  IssuedTo?: string;
  IssuedBy?: string;
  EffectiveDate?: string;
  ExpirationDate?: string;
  ExpirationDays?: number;
  Serialnumber?: string;
  Thumbprint?: string;
  Keysize?: string;
  SignatureAlgorithm?: string;
  ConnectorIds?: string;
}

// API response types
export interface ApiResponse<T> {
  value?: T[];
  '@odata.count'?: number;
}

// Query parameters for OData-style API
export interface QueryParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
}