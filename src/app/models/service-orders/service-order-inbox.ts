import {
  ServiceOrderCommercialStatus,
  ServiceOrderEconomicStatus,
  ServiceOrderOperativeStatus,
  ServiceOrderTechnicalStatus,
} from './service-order';

export type ServiceOrderInboxDirection = 'INBOUND' | 'OUTBOUND';
export type ServiceOrderInboxAuthorRole =
  | 'CLIENT'
  | 'TECHNICIAN'
  | 'RECEPTION'
  | 'SUPERVISOR'
  | 'SYSTEM';
export type ServiceOrderInboxDeliveryStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'RECEIVED'
  | 'FAILED'
  | 'SKIPPED';
export type ServiceOrderInboxAttachmentType = 'image' | 'pdf' | 'audio' | 'document';

export interface ServiceOrderInboxAttachment {
  id: number;
  attachmentType: ServiceOrderInboxAttachmentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  previewable: boolean;
  downloadPath: string;
}

export interface ServiceOrderInboxMessage {
  id: number;
  threadId: number;
  direction: ServiceOrderInboxDirection;
  authorRole: ServiceOrderInboxAuthorRole;
  authorDisplayName: string | null;
  text: string | null;
  deliveryStatus: ServiceOrderInboxDeliveryStatus;
  externalMessageId: string | null;
  createdAt: string;
  attachments: ServiceOrderInboxAttachment[];
  partialFailures?: Array<{
    stage: 'text' | 'attachment';
    messageId: number;
    attachmentId?: number;
    fileName?: string;
    error: string;
  }>;
}

export interface ServiceOrderInboxThreadSummary {
  id: number;
  serviceOrderId: number;
  serviceOrderCode: string;
  equipmentLabel: string;
  clientAlias: string;
  assignedTechnicianAlias: string;
  operativeStatus: ServiceOrderOperativeStatus | null;
  technicalStatus: ServiceOrderTechnicalStatus | null;
  commercialStatus: ServiceOrderCommercialStatus | null;
  economicStatus: ServiceOrderEconomicStatus | null;
  clientPhone: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageDirection: ServiceOrderInboxDirection | null;
  lastMessageAuthorRole: ServiceOrderInboxAuthorRole | null;
  unreadCount: number;
  contextToken: string;
}

export interface ServiceOrderInboxThreadMessagesResponse {
  thread: ServiceOrderInboxThreadSummary;
  messages: ServiceOrderInboxMessage[];
}
