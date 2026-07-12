# Prime Global Platform Architecture

## Current Structure
- App routing: Next.js App Router under src/app with locale-prefixed routes.
- Localization: next-intl with centralized locale constants in src/lib/constants/locales.ts.
- Shared constants: site, contact, navigation, services in src/lib/constants.
- UI composition: section and layout components in src/components.

## Feature-Based Foundation
Future work is organized under src/features:
- careers
- dashboard
- client-portal
- ai
- blog
- admin
- shared

Each feature follows:
- components: feature UI
- hooks: feature-specific React hooks
- types: contracts local to the feature
- services: data-access and integration logic

Additional schema and utility namespaces exist for cross-feature use:
- src/features/shared/schemas
- src/features/shared/types
- src/features/shared/utils

## Future Module Placement
- Careers portal: src/features/careers
- CV uploads and document metadata: src/features/careers/services plus src/app/api/uploads
- Supabase integrations: src/lib/server/services (future) and feature services
- Authentication: src/app/api/auth with feature-specific guards in server layer
- Prime AI: src/features/ai and src/app/api/ai
- Admin dashboard: src/features/admin and src/features/dashboard

## API Scaffolding
Scaffold route handlers (not implemented yet):
- src/app/api/careers/route.ts
- src/app/api/contact/route.ts
- src/app/api/ai/route.ts
- src/app/api/auth/route.ts
- src/app/api/admin/route.ts
- src/app/api/uploads/route.ts

## Environment Strategy
- Public variables: src/lib/config/env.ts
- Server variables: src/lib/server/config/env.ts
- Template file: .env.example

No production secrets are committed. All integrations are placeholders until
explicit implementation phases.

## Server/Client Separation
- Never import src/lib/server modules into Client Components.
- Keep feature services server-first when they involve secrets or private APIs.
- Use API route handlers for externally callable operations.

## Naming Conventions
- kebab-case directories
- PascalCase React components
- camelCase functions and variables
- Suffix contracts clearly: *Schema, *Service, *Request, *Response
