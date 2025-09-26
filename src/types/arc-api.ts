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
  WorkspaceId?: string;
  Workspace?: string;
  MessageId?: string;
  Direction?: string;
  Status?: string;
  Filename?: string;
  FilePath?: string;
  FileSize?: number;
  Timestamp?: string;
  ETag?: string;
  InstanceId?: string;
  BatchGroupId?: string;
  IsBatchGroup?: boolean;
  ProcessingTime?: number;
  ConnectorType?: string;
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
  Type?: string;
  ShowType?: string;
  Tags?: string;
  Value?: string;
  // API also returns lowercase variants
  id?: string;
  name?: string;
  type?: string;
  showType?: string;
  tags?: string;
  value?: string;
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

export interface ArcReport {
  Name?: string;
  Type?: string;
  CreatedBy?: string;
  CreatedTime?: string;
  ModifiedTime?: string;
  TimePeriod?: string;
  Columns?: string;
  GroupRows?: string;
  Filters?: string;
  Summary?: string;
  Schedule?: string;
  StartDate?: string;
  EndDate?: string;
  Format?: string;
  EmailReport?: boolean;
  EmailSubject?: string;
  EmailRecipients?: string;
  TimePeriodStart?: string;
  TimePeriodEnd?: string;
}

export interface ArcRequest {
  Id: string;
  Timestamp?: string;
  URL?: string;
  Method?: string;
  User?: string;
  RemoteIP?: string;
  Script?: string;
  Bytes?: number;
  Time?: number;
  Error?: string;
  status?: string;
  InstanceId?: string;
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