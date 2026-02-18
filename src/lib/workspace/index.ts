// Export all workspace services
export { workspaceService, WorkspaceService } from './workspaceService';
export type { CreateWorkspaceDTO, UpdateWorkspaceDTO } from './workspaceService';

export { conversationService, ConversationService } from './conversationService';
export type {
  CreateConversationDTO,
  AddMessageDTO,
  PinMessageDTO,
} from './conversationService';

export { documentService, DocumentService } from './documentService';
export type {
  UploadDocumentDTO,
  SearchResult as DocumentSearchResult,
} from './documentService';

export { dataSourceService, DataSourceService } from './dataSourceService';
export type {
  CreateConnectionDTO,
  TestConnectionResult,
  DatabaseSchema,
  QueryResult,
} from './dataSourceService';

export { WorkspaceManager } from './workspaceManager';
