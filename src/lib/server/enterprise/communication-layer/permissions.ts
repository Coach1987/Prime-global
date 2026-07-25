import type { CommunicationPermissionCode } from "./types.ts";

export const communicationPermissionMatrix: Record<string, CommunicationPermissionCode[]> = {
  owner: [
    "communication.email.identities.manage",
    "communication.mailboxes.manage",
    "communication.notifications.manage",
    "communication.templates.manage",
    "communication.templates.approve",
    "communication.messaging.manage",
    "communication.messaging.broadcast",
    "communication.deliveries.manage",
    "communication.audit.read",
    "communication.providers.manage",
    "communication.compliance.manage",
  ],
  ceo: [
    "communication.mailboxes.manage",
    "communication.notifications.manage",
    "communication.templates.manage",
    "communication.templates.approve",
    "communication.messaging.manage",
    "communication.messaging.broadcast",
    "communication.deliveries.manage",
    "communication.audit.read",
    "communication.providers.manage",
    "communication.compliance.manage",
  ],
  cmo: [
    "communication.notifications.manage",
    "communication.templates.manage",
    "communication.messaging.broadcast",
    "communication.deliveries.manage",
    "communication.audit.read",
  ],
  clo: ["communication.audit.read", "communication.compliance.manage"],
  super_admin: [
    "communication.email.identities.manage",
    "communication.mailboxes.manage",
    "communication.notifications.manage",
    "communication.templates.manage",
    "communication.messaging.manage",
    "communication.deliveries.manage",
    "communication.audit.read",
    "communication.providers.manage",
  ],
  department_manager: [
    "communication.mailboxes.manage",
    "communication.notifications.manage",
    "communication.templates.manage",
    "communication.messaging.manage",
  ],
  read_only_auditor: ["communication.audit.read"],
};

export function listCommunicationPermissionsForRole(roleCode: string) {
  return communicationPermissionMatrix[roleCode] ?? [];
}
