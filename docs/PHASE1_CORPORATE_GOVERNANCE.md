# Prime Global Corporate Governance Phase 1

## Mission Boundary

This phase establishes governance primitives only.

Included:
- Enterprise role hierarchy
- Permission matrix and inheritance
- Fine-grained permission resolution
- Department ownership model
- Employee identity and corporate email model
- Owner and CEO protections
- Immutable owner account controls
- Emergency recovery rules
- Governance audit logging

Explicitly excluded:
- UI redesign
- Marketing pages
- Business feature implementation
- Deployment workflows

## Enterprise Role Hierarchy

Canonical seeded roles:

1. Owner
2. Chief Executive Officer (CEO)
3. Chief Operating Officer (COO)
4. Chief Technology Officer (CTO)
5. Chief Financial Officer (CFO)
6. Chief Marketing Officer (CMO)
7. Chief Legal Officer (CLO)
8. Chief AI Officer (CAIO)
9. Chief Security Officer (CSO)
10. Super Admin
11. Department Manager
12. Team Leader
13. Senior Staff
14. Staff
15. Support
16. Read Only Auditor

Inheritance chain (base -> elevated):

- Read Only Auditor -> Support -> Staff -> Senior Staff -> Team Leader -> Department Manager -> Super Admin
- Super Admin -> COO/CTO/CFO/CMO/CLO/CAIO/CSO/CEO
- CEO -> Owner

Implementation detail:
- Elevated roles inherit permissions from base roles through role inheritance edges.

## Database Model

New governance tables:

- pgems_role_inheritance
- pgems_department_owners
- pgems_corporate_email_domains
- pgems_employee_identities
- pgems_governance_controls
- pgems_emergency_recovery_rules
- pgems_governance_audit_logs

New governance functions:

- pgems_resolve_employee_permission_codes(employee_id)
- pgems_seed_corporate_governance(organization_id)
- pgems_log_governance_event(...)

New protection/validation triggers:

- Role inheritance cross-organization guard
- Department ownership alignment guard
- Employee identity + corporate domain guard
- Governance controls organization alignment guard
- Owner/CEO protected-account enforcement on employee updates/deletes
- Immutable owner/CEO role assignment integrity guard
- Immutable identity mutation guard

## Permission Matrix

Core wildcard domains:

- governance.*
- organization.*
- employees.*
- departments.*
- identity.*
- audit.*
- recovery.*

Representative granular permissions:

- governance.roles.read
- governance.roles.create
- governance.roles.assign
- governance.permissions.read
- governance.permissions.assign
- governance.permissions.evaluate
- employees.read
- employees.create
- employees.update
- employees.deactivate
- departments.ownership.assign
- identity.read
- identity.write
- identity.verify
- recovery.rules.manage
- recovery.execute
- owner.protection.manage
- ceo.protection.manage

Decision order:

1. Explicit deny
2. Explicit allow
3. Role (direct or inherited) permission
4. Default deny

Fine-grained behavior:

- Permission matching supports wildcard segments such as governance.* and employees.*.
- Explicit deny remains highest priority, including wildcard overlap.

## Employee Model

Employee core remains in pgems_employees, with governance extensions:

- Department ownership through pgems_department_owners
- Protected executive account controls through pgems_governance_controls
- Immutable owner lifecycle constraints via database triggers

## Corporate Identity Model

Employee identity is normalized into pgems_employee_identities:

- employee_id (1:1 with pgems_employees)
- organization_id
- auth_user_id
- corporate_email
- status (provisioned, active, suspended, terminated)
- is_immutable
- email_verified_at
- recovery_contact_email
- metadata

Corporate email domains are managed per organization in pgems_corporate_email_domains:

- domain
- is_primary
- is_active

Constraint:
- Employee corporate email domains must belong to active organization-approved domains.

## Owner and CEO Protection

Governance controls are centralized in pgems_governance_controls:

- owner_employee_id
- ceo_employee_id
- owner_role_id
- ceo_role_id
- immutable_owner_account
- protect_ceo_account
- emergency_recovery_enabled

Protection rules:

- Immutable owner cannot be deleted or deactivated.
- Immutable owner email/position cannot be mutated while protection is enabled.
- Protected CEO cannot be deleted or deactivated.
- Protected owner/CEO canonical role assignments cannot be removed.

## Emergency Recovery Rules

Emergency recovery is modeled in pgems_emergency_recovery_rules:

- requires_owner_approval
- allows_ceo_override
- minimum_recovery_approvers
- is_active

Seeded baseline rules:

- owner_account_recovery
- ceo_account_recovery
- immutable_identity_break_glass

## Audit Logging

Governance events are stored in pgems_governance_audit_logs with:

- actor identity
- actor role
- event type
- target type/id
- severity
- metadata
- request context (IP, user-agent)
- UTC timestamp

Service layer operations write governance audit events and fall back to legacy audit_logs persistence if needed.

## Future-Ready Governance Structure

The phase is designed for future governance expansion without schema redesign:

- Hierarchical inheritance supports adding role layers with no evaluator rewrite.
- Wildcard + granular permissions support coarse and precise policy evolution.
- Recovery rules are data-driven and can be consumed by future workflow engines.
- Identity model supports SSO federation and additional verification attributes.
- Governance audit events are structured for downstream analytics and compliance exports.
