# PGEMS Architecture (Phase 1)

## Scope

Phase 1 introduces only the organization core foundation for enterprise operations. This phase intentionally excludes AI, approvals, finance workflows, dashboards, notifications, and any modifications to candidate/employer recruitment or jobs systems.

## Organization Model

The organization foundation is normalized with the following hierarchy:

- Organization (company)
- Division
- Department
- Team
- Position
- Employee

Structural guarantees:

- Each division belongs to one organization.
- Each department belongs to one division and one organization.
- Each team belongs to one department and one organization.
- Each position belongs to one department (and optionally one team) and one organization.
- Each employee belongs to exactly one position and one organization.

## Employee Hierarchy

Employees support recursive reporting lines through a self-reference:

- manager_employee_id -> pgems_employees.id

Capabilities:

- direct manager lookup
- direct reports listing
- unlimited-depth report traversal via BFS/graph traversal helpers
- upward manager chain reconstruction

## Dynamic Role System

Roles are data-driven entities scoped to an organization:

- pgems_roles

Design intent:

- no hardcoded business role logic
- supports seeded roles (Owner, Super Admin, Recruitment Director, etc.)
- supports custom future roles per organization without code changes

## Permission Infrastructure

Permissions are independent entities:

- pgems_permissions

Relationships:

- role -> permissions: pgems_role_permissions
- employee -> roles: pgems_employee_roles
- employee -> extra allow: pgems_employee_extra_permissions
- employee -> explicit deny: pgems_employee_denied_permissions

Evaluation order:

1. Explicit Deny
2. Explicit Allow
3. Role Permission
4. Default Deny

This order is implemented in a pure evaluation helper so future policy layers can compose on top of deterministic access decisions.

## APIs (Internal)

Internal enterprise endpoints are available under:

- /api/enterprise/organization-core/organizations
- /api/enterprise/organization-core/divisions
- /api/enterprise/organization-core/departments
- /api/enterprise/organization-core/teams
- /api/enterprise/organization-core/positions
- /api/enterprise/organization-core/employees
- /api/enterprise/organization-core/roles
- /api/enterprise/organization-core/permissions
- /api/enterprise/organization-core/roles/[roleId]/permissions
- /api/enterprise/organization-core/employees/[employeeId]/roles
- /api/enterprise/organization-core/employees/[employeeId]/permissions
- /api/enterprise/organization-core/employees/[employeeId]/hierarchy

Access model:

- Uses existing authentication/session helpers.
- Uses internal role gate for enterprise/staff-capable roles.
- Does not modify authentication logic.

## Future Approval Engine Integration Points

Planned integration points (not implemented in Phase 1):

- role and permission checks can gate approval actions.
- organization hierarchy can define approval chains (manager -> director -> executive).
- explicit deny layer can enforce separation-of-duties controls.

## Future AI Governance Integration Points

Planned integration points (not implemented in Phase 1):

- permission engine can constrain model access to sensitive enterprise records.
- hierarchy graph can provide context windows for explainable org insights.
- role/permission snapshots can be attached to governance audit trails.

## Migration Strategy

Phase 1 uses additive migration only:

- 202607180001_pgems_organization_core.sql

No previous migration files are edited.
