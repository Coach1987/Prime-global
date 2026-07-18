# PGEMS Architecture (Phase 1 + Phase 1.5)

## Scope

Phase 1 introduces the organization core foundation for enterprise operations.

Phase 1.5 extends that foundation with authority and governance architecture only. It introduces data structures and evaluation helpers without enabling approval workflow execution.

The combined Phase 1 and Phase 1.5 scope intentionally excludes AI workflow automation, approval execution engines, finance transaction processing, dashboards, notifications, and any modifications to candidate/employer recruitment or jobs systems.

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

## Authority Level Model (Phase 1.5)

Authority level is a separate concept from role assignment.

- Roles represent capability bundles.
- Authority level represents organizational approval weight.

Design characteristics:

- organization-scoped authority definitions
- numeric authority values with support for custom overrides
- one authority assignment per employee
- no replacement of existing role-permission behavior

Example baseline values (configurable):

- Owner: 100
- Super Admin: 90
- Director: 70
- Manager: 40
- Supervisor: 20
- Employee: 10

## Approval Policy Foundation (Phase 1.5)

Approval policy entities define governance requirements per operation.

Each policy can define:

- minimum authority level
- optional required permission linkage
- optional scope requirement flag

This phase stores and evaluates policy metadata only. No approval execution pipeline is enabled.

## Monetary Authority Foundation (Phase 1.5)

Monetary authority is modeled as an employee-scoped approval limit:

- currency code
- maximum approval amount
- unlimited authority flag

Phase 1.5 provides limit evaluation helpers only. No finance processing behavior is introduced.

## Organizational Scope Foundation (Phase 1.5)

Scope is modeled as a dimension-node graph to support future expansion without schema redesign.

Examples of dimensions:

- country
- region
- branch
- business unit

Design characteristics:

- reusable scope dimensions
- organization-scoped hierarchical scope nodes
- employee-to-scope assignments
- future compatibility with additional dimensions and routing logic

## Delegation Foundation (Phase 1.5)

Delegation is modeled as time-bound authority transfer metadata.

Delegation structure includes:

- delegator
- delegate
- start timestamp
- end timestamp
- status
- allowed operations

Phase 1.5 provides infrastructure and advisory evaluation context. It does not activate delegation execution workflows.

## Governance Evaluation Extension (Phase 1.5)

Permission evaluation remains backward compatible.

Phase 1.5 adds advisory governance outputs that can be consumed by future workflow engines:

- existing permission decision (unchanged)
- authority threshold satisfaction
- scope requirement satisfaction
- delegation activity state
- monetary authority evaluation
- overall advisory readiness flag

This design preserves current access behavior while exposing structured governance context for later modules.

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
- /api/enterprise/organization-core/authority-levels
- /api/enterprise/organization-core/employees/[employeeId]/authority
- /api/enterprise/organization-core/approval-operations
- /api/enterprise/organization-core/approval-policies
- /api/enterprise/organization-core/employees/[employeeId]/monetary-authority
- /api/enterprise/organization-core/scopes/dimensions
- /api/enterprise/organization-core/scopes/nodes
- /api/enterprise/organization-core/employees/[employeeId]/scopes
- /api/enterprise/organization-core/delegations
- /api/enterprise/organization-core/employees/[employeeId]/permissions/governance

Access model:

- Uses existing authentication/session helpers.
- Uses internal role gate for enterprise/staff-capable roles.
- Does not modify authentication logic.

## Future Approval Engine Integration Points

Planned integration points (not implemented in Phase 1):

- role and permission checks can gate approval actions.
- authority thresholds can define operation eligibility.
- scope constraints can enforce organizational boundaries.
- delegation metadata can support temporary approval authority transfer.
- monetary limits can constrain financial approval ranges.
- organization hierarchy can define escalation chains (manager -> director -> executive).
- explicit deny rules can enforce separation-of-duties controls.

## Future Workflow Engine Boundary

Future workflow modules may consume Phase 1.5 governance foundations but must be implemented separately:

- approval request lifecycle orchestration
- multi-step approval routing and state transitions
- notification and reminder dispatch
- audit event streaming and operational dashboards
- integration with payroll, finance, and contract execution subsystems

None of the above workflow behaviors are enabled in Phase 1 or Phase 1.5.

## Workflow Engine Foundation (Phase 2)

Phase 2 introduces a generic approval workflow engine foundation. It is intentionally reusable and is not coupled to employees, finance, recruitment, contracts, companies, or AI execution.

The engine provides only metadata, state evaluation, rule evaluation, and immutable audit surfaces. It does not execute business workflows.

## Workflow Model

The workflow engine models the following reusable concepts:

- Workflow
- Workflow Type
- Workflow Instance
- Workflow Stage
- Workflow Action
- Workflow Participant
- Workflow Decision
- Workflow Rule
- Workflow Escalation
- Workflow Event
- Workflow History
- Workflow Attachment
- Workflow Comment
- Workflow Audit

## State Machine

Workflow state evaluation uses configurable transitions rather than hardcoded business logic.

Supported generic states:

- Draft
- Pending
- In Review
- Waiting Higher Approval
- Approved
- Rejected
- Returned
- Cancelled
- Expired
- Executed
- Archived

State transitions are stored as data and evaluated through pure helpers so future modules can define their own transition sets.

## Approval Steps

The engine supports reusable approval step modes as configuration metadata:

- single approval
- sequential approvals
- parallel approvals
- conditional approvals
- owner final approval
- authority level approval
- financial approval
- minimum authority policies
- future AI advisory approval

This phase stores and evaluates the step model only. It does not execute approvals.

## Workflow Rules

Rules are modeled as generic condition trees, not business-specific code.

Examples that the engine can represent:

- IF Amount > X
- IF Country = Saudi Arabia
- IF Employee Role = Manager
- IF Authority Level >= 80
- IF Workflow Type = Financial

Rules are evaluated from structured condition data so future modules can add new fields without schema redesign.

## Escalation

Escalation metadata supports reusable timers and reassignment concepts:

- automatic escalation
- timeout escalation
- manager escalation
- owner escalation
- delegation
- temporary reassignment
- reminder scheduling

The foundation records and evaluates escalation state only. It does not send reminders or trigger runtime job processing.

## Audit

Workflow events, history, and audit records are append-only foundations.

Requirements:

- every workflow action creates immutable event records
- workflow history is never deleted
- workflow audit entries preserve the before/after context needed by future engines

## API Surface

Internal workflow engine endpoints are available under:

- /api/enterprise/workflow-engine/workflow-types
- /api/enterprise/workflow-engine/workflow-types/[workflowTypeId]/states
- /api/enterprise/workflow-engine/workflow-types/[workflowTypeId]/transitions
- /api/enterprise/workflow-engine/workflow-types/[workflowTypeId]/workflows
- /api/enterprise/workflow-engine/workflows
- /api/enterprise/workflow-engine/workflows/[workflowId]/stages
- /api/enterprise/workflow-engine/workflows/[workflowId]/stages/[stageId]/actions
- /api/enterprise/workflow-engine/workflow-instances
- /api/enterprise/workflow-engine/workflow-instances/evaluate
- /api/enterprise/workflow-engine/workflow-instances/[workflowInstanceId]/participants
- /api/enterprise/workflow-engine/workflow-instances/[workflowInstanceId]/decisions
- /api/enterprise/workflow-engine/workflow-rules
- /api/enterprise/workflow-engine/workflow-escalations
- /api/enterprise/workflow-engine/workflow-events
- /api/enterprise/workflow-engine/workflow-history
- /api/enterprise/workflow-engine/workflow-attachments
- /api/enterprise/workflow-engine/workflow-comments
- /api/enterprise/workflow-engine/workflow-audit

Access model:

- Uses existing internal enterprise authentication gate.
- Does not change authentication behavior.
- Exposes internal metadata only.

## Phase 3 Boundary

Future modules may consume the engine foundation for business workflows, but Phase 2 itself must remain generic.

Not included in Phase 2:

- finance execution
- recruitment execution
- employee-specific workflow logic
- company-specific workflow logic
- AI execution
- notifications
- dashboarding

## Migration Strategy

Phase 2 uses additive migration only:

- 202607180003_pgems_workflow_engine_foundation.sql

## Future AI Governance Integration Points

Planned integration points (not implemented in Phase 1):

- permission engine can constrain model access to sensitive enterprise records.
- hierarchy graph can provide context windows for explainable org insights.
- role/permission snapshots can be attached to governance audit trails.

## Migration Strategy

Phase 1 and Phase 1.5 use additive migrations only:

- 202607180001_pgems_organization_core.sql
- 202607180002_phase15_pgems_authority_foundation.sql

No previous migration files are edited.
