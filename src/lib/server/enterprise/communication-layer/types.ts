export type CommunicationChannelType = "email" | "in_app" | "sms" | "whatsapp" | "push";

export type CommunicationPriority = "low" | "normal" | "high" | "critical" | "emergency";

export type MessageType = "department" | "management" | "employee_announcement" | "system_broadcast";

export type ProviderCode = "smtp_generic" | "microsoft_365" | "google_workspace" | "twilio_sms" | "whatsapp_business" | "firebase_push";

export interface CommunicationProviderAdapter {
  providerCode: ProviderCode;
  channelType: CommunicationChannelType;
  send(input: {
    recipient: string;
    subject?: string;
    body: string;
    priority: CommunicationPriority;
    metadata?: Record<string, unknown>;
  }): Promise<{ providerMessageId: string; status: string; metadata?: Record<string, unknown> }>;
}

export interface CommunicationEventInput {
  organizationId?: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  sourceDomain: "recruitment" | "payments" | "billing" | "interviews" | "documents" | "ai" | "security" | "system";
  sourceReference?: string;
  actorAuthUserId?: string;
  actorRole?: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export type CommunicationPermissionCode =
  | "communication.email.identities.manage"
  | "communication.mailboxes.manage"
  | "communication.notifications.manage"
  | "communication.templates.manage"
  | "communication.templates.approve"
  | "communication.messaging.manage"
  | "communication.messaging.broadcast"
  | "communication.deliveries.manage"
  | "communication.audit.read"
  | "communication.providers.manage"
  | "communication.compliance.manage";
