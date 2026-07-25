# PRIME GLOBAL Enterprise Identity & Security Layer (Phase 4)

## Scope

Phase 4 introduces the enterprise identity and security backbone for Prime Global platform products, Growth AI modules, and future SaaS products.

This phase is backend-only and internal API-only:
- No authentication UI
- No login page work
- No frontend flows

The architecture is designed for multi-country, zero trust, and future product expansion.

## Enterprise Identity Architecture

Identity model supports:
- Employee identities
- Employer identities
- Candidate identities
- Partner identities
- Service accounts
- Machine identities

Core entities:
- pgems_enterprise_identities
- pgems_identity_providers
- pgems_identity_provider_configs

Design principles:
- Identity is organization-scoped
- Subject references are decoupled from auth provider internals
- Provider abstraction supports internal IdP and external OIDC/OAuth providers

## Security Architecture

Security foundations delivered:
- Authentication method registry and status lifecycle
- MFA factor management and recovery code infrastructure
- Passkey credential lifecycle (WebAuthn-ready)
- Session lifecycle with rotation counters, risk labels, and revocation support
- Trusted device registration and risk-aware trust scores
- Security monitoring signals for suspicious login, impossible travel, brute-force, and policy violations
- Immutable identity security event stream

Event immutability:
- pgems_identity_security_events is append-only
- Update/delete mutations are blocked by trigger guards

## Authentication Architecture

Authentication capabilities are model-first and provider-agnostic:
- OAuth 2.1 ready provider configuration
- OIDC-ready claims/issuer modeling
- JWT/refresh-token session metadata support
- Session rotation counters
- Passwordless-ready auth method flags
- Magic link readiness via auth method type and policy hooks

Security characteristics:
- Internal APIs enforce enterprise guard, CSRF on write operations, and rate limiting
- Auth method status model supports active/disabled/compromised lifecycle

## MFA Architecture

MFA foundation includes:
- Authenticator app (TOTP) factors
- SMS OTP factors via adapter abstraction
- Email OTP factors via adapter abstraction
- Backup/recovery code persistence
- Factor lifecycle states (pending/active/disabled/revoked)
- Step-up-ready integration through policy rule actions

## Passkey Architecture

Passkey module supports:
- Credential ID and public key storage
- Attestation format and AAGUID metadata
- Sign counter tracking
- Device-bound flags
- Status model (active/revoked/compromised)

This enables WebAuthn flows without coupling to any specific frontend implementation.

## Session Architecture

Session management includes:
- Active session inventory
- Session revocation with reason tracking
- Session version and rotation counters
- Idle timeout and absolute timeout fields
- Risk scoring labels (low/medium/high/critical)
- Risk-based expiration orchestration hooks

The repository also includes deterministic session risk scoring helper logic for impossible travel/device/brute-force signal inputs.

## Trusted Devices Architecture

Trusted device module includes:
- Device fingerprint registration
- Verification method tracking (email/sms/passkey/admin override)
- Trust score model
- Risk level model
- Pending/trusted/blocked/revoked status lifecycle
- New-device and suspicious-device detection support through monitoring + policy hooks

## Authorization Architecture

Enterprise authorization is hybrid and future-proof:
- RBAC-compatible policy type
- ABAC-compatible condition model
- Policy-based authorization expression support
- Zero-trust policy type support
- Department/resource scope constraints via JSON conditions/scope
- Delegated permissions with start/end boundaries and audit metadata
- Temporary permissions via delegated permission status + validity windows

Core entities:
- pgems_enterprise_authorization_policies
- pgems_identity_delegated_permissions

## Secrets Architecture

Secrets management foundations:
- Secret catalog with API key/internal token/encryption key/signing key kinds
- Versioned secret records
- Key reference indirection (no raw key material persistence)
- Rotation period metadata
- Rotation event persistence
- Secret status lifecycle (active/rotating/retired/compromised)

Core entities:
- pgems_security_secrets
- pgems_security_secret_versions

## Policy Engine

Policy engine data backbone:
- Rule domain partitioning: authentication, authorization, session, device, secret, zero trust
- Rule expressions stored as policy language payloads
- Action model: allow, deny, step_up_auth, manual_review, revoke_session
- Risk weight scoring hooks for composite trust evaluation

Zero trust support:
- pgems_zero_trust_trust_evaluations stores risk/trust decisions and outcomes per policy execution context

## Security Permission Matrix

Identity/security permission domains:
- identity.identities.manage
- identity.auth.manage
- identity.mfa.manage
- identity.passkeys.manage
- identity.sessions.manage
- identity.devices.manage
- identity.authorization.manage
- identity.permissions.delegate
- identity.secrets.manage
- identity.policies.manage
- identity.monitoring.read
- identity.audit.read

Role matrix foundation includes Owner, CEO, CISO, Security Admin, Super Admin, Department Manager, and Read Only Auditor.

## Security Monitoring Architecture

Security monitoring entities and signals:
- Authentication audit events
- Authorization/policy evaluation events
- Suspicious login detection signals
- Impossible travel signals
- Brute-force signals
- Policy violation and anomalous access signals

Core entities:
- pgems_security_monitoring_signals
- pgems_identity_security_events

## Zero Trust Model

Zero trust controls are embedded in data model and policy engine:
- Continuous verification hooks via trust evaluations
- Least privilege via policy effect and delegated permission windows
- Trust evaluation via risk + trust score composition
- Step-up authentication and revoke session action models
- Risk scoring hooks for future adaptive engines

## Internal APIs

Identity and security internal APIs:
- /api/enterprise/identity-security-layer/identities
- /api/enterprise/identity-security-layer/auth-methods
- /api/enterprise/identity-security-layer/mfa
- /api/enterprise/identity-security-layer/passkeys
- /api/enterprise/identity-security-layer/sessions
- /api/enterprise/identity-security-layer/sessions/revoke
- /api/enterprise/identity-security-layer/devices
- /api/enterprise/identity-security-layer/authorization
- /api/enterprise/identity-security-layer/authorization/delegations
- /api/enterprise/identity-security-layer/secrets
- /api/enterprise/identity-security-layer/secrets/rotate
- /api/enterprise/identity-security-layer/policies
- /api/enterprise/identity-security-layer/monitoring
- /api/enterprise/identity-security-layer/audit-events

## Growth AI Compatibility

Phase 4 is Growth AI compatible by design:
- Security events and monitoring signals are structured for anomaly models.
- Risk and trust score fields are first-class, enabling adaptive policy decisions.
- Policy rules are expression-driven and can be tuned by AI governance modules.
- Zero trust evaluations provide explainable artifacts for AI-assisted security orchestration.
- Secrets and key-rotation metadata can support AI-guided operational hardening recommendations.

## Compliance and Operations

Compliance and hardening controls include:
- RLS enabled on all Phase 4 tables
- Internal role policy guardrails for enterprise access
- Immutable security event stream
- Security change auditability across identity, policy, session, and secret operations
