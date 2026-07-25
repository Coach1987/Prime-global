# Prime Global Enterprise Communication Layer (Phase 3)

## Mission Scope

Phase 3 establishes the enterprise communication backbone for Prime Global and future products.

Included:
- Corporate email identity and mailbox foundation
- Notification orchestration extensions
- Internal messaging and announcements
- Multi-channel template governance with approvals and localization
- Provider abstraction registry and provider configs
- Event-driven communication subscriptions
- Immutable communication audit events and compliance logging
- Internal APIs only

Excluded:
- Frontend chat product UX
- Portal redesign
- Customer-facing UI changes

## Enterprise Communication Architecture

Communication is modeled as modular bounded domains:

1. Corporate Email Domain
- Corporate identities mapped to employee/system/shared context
- Mailboxes for shared, department, and role-driven operations
- Mailbox membership and role-based send/manage/view controls
- Retention-policy linkage for compliance lifecycle

2. Notification Domain (existing + integrated)
- In-app/email/sms/push/webhook/future channels
- Priority routing and delivery tracking
- Retry handling and audit entries
- Event consumption from enterprise event engine

3. Internal Messaging Domain
- Department messages
- Management messages
- Employee announcements
- System broadcasts
- Pinned messages and timed pin windows
- Read/acknowledgement receipts

4. Template Governance Domain
- Channel-specific communication templates (email/sms/whatsapp/notification/announcement)
- Versioned template artifacts
- Localized variants (Arabic/English + future locales)
- Approval requests and review status workflow

5. Provider Abstraction Domain
- Provider catalog + org-specific configuration
- Test/live mode separation
- Priority/fallback routing metadata
- Adapter contracts only; no provider business logic in core services

6. Communication Audit/Compliance Domain
- Immutable communication event stream
- Delivery attempt ledger and retry history
- Compliance action logs with actor/outcome metadata
- Event idempotency and traceability

## Database Model

New communication tables:
- pgems_corporate_mail_identities
- pgems_mailboxes
- pgems_mailbox_members
- pgems_communication_retention_policies
- pgems_communication_templates
- pgems_communication_template_versions
- pgems_communication_template_localizations
- pgems_template_approval_requests
- pgems_internal_messages
- pgems_internal_message_recipients
- pgems_internal_message_receipts
- pgems_communication_providers
- pgems_communication_provider_configs
- pgems_communication_event_subscriptions
- pgems_communication_deliveries
- pgems_communication_retry_history
- pgems_communication_compliance_logs
- pgems_communication_events

Functions and controls:
- pgems_record_communication_event(...)
- Immutable mutation guards for pgems_communication_events
- RLS enabled and internal enterprise role policies applied across communication tables

## Notification Architecture

The notification layer remains provider-agnostic and event-driven.

Capabilities:
- Notification channels and queues
- Channel templates and rules
- Recipient preference control
- Notification history, delivery, retries, and audit
- Event-triggered notification creation from enterprise event records

Phase 3 contribution:
- Adds communication-layer contracts and event subscription mapping that can route recruitment/payments/billing/interviews/documents/ai/security/system signals into communication workflows.

## Messaging Architecture

Internal messaging supports organizational communication at scale:
- Message categories for department, management, employee announcements, and system broadcast
- Recipient mapping table for direct and scoped delivery
- Read and acknowledgement receipts for accountability
- Sensitivity labels and pinning support

## Template Architecture

Template lifecycle is governed as enterprise content:
- Template entity for business ownership and category
- Version entity for immutable iterative revisions
- Localization table for locale-specific content and fallback strategy
- Approval request table for governance and separation-of-duty workflows

Template channels supported:
- Email
- SMS
- WhatsApp
- Notification
- Announcement

## Provider Abstraction

Provider model separates capabilities from runtime configs.

Seeded provider adapters:
- SMTP generic
- Microsoft 365
- Google Workspace
- Twilio SMS
- WhatsApp Business
- Firebase Push

Provider abstraction contract:
- CommunicationProviderAdapter with unified send interface
- Registry-based resolution
- No-op adapters as safe defaults until provider integration is configured

## Permission Matrix

Communication permission domains:
- communication.email.identities.manage
- communication.mailboxes.manage
- communication.notifications.manage
- communication.templates.manage
- communication.templates.approve
- communication.messaging.manage
- communication.messaging.broadcast
- communication.deliveries.manage
- communication.audit.read
- communication.providers.manage
- communication.compliance.manage

Role matrix foundation includes Owner, CEO, CMO, CLO, Super Admin, Department Manager, and Read Only Auditor profiles.

## Growth AI Compatibility

Phase 3 is Growth AI compatible by design:
- Immutable communication events support AI observability and anomaly detection.
- Event subscriptions allow AI modules to trigger notifications/templates without coupling.
- Provider abstraction enables AI-assisted routing, fallback, and prioritization strategies.
- Structured compliance logs can feed AI governance and policy explainability pipelines.

## Internal APIs

Communication internal APIs:
- /api/enterprise/communication-layer/mail-identities
- /api/enterprise/communication-layer/mailboxes
- /api/enterprise/communication-layer/mailboxes/members
- /api/enterprise/communication-layer/retention-policies
- /api/enterprise/communication-layer/templates
- /api/enterprise/communication-layer/templates/versions
- /api/enterprise/communication-layer/templates/localizations
- /api/enterprise/communication-layer/templates/approvals
- /api/enterprise/communication-layer/messaging
- /api/enterprise/communication-layer/messaging/acknowledge
- /api/enterprise/communication-layer/providers
- /api/enterprise/communication-layer/event-subscriptions
- /api/enterprise/communication-layer/deliveries
- /api/enterprise/communication-layer/compliance
- /api/enterprise/communication-layer/audit-events
