# Careers Platform Foundation

## Scope Of Phase 2
- Added localized careers landing at `/[locale]/careers`.
- Added localized application page at `/[locale]/careers/apply`.
- Implemented reusable job browsing architecture with mock data.
- Implemented frontend-only CV upload placeholders.
- Added modular validation schema for future backend integration.

## Feature Structure
- `src/features/careers/components`
- `src/features/careers/services`
- `src/features/careers/types`
- `src/features/careers/schemas`

## Application Flow
1. Candidate opens careers landing and explores categories.
2. Candidate searches and filters listings.
3. Candidate reviews job details.
4. Candidate navigates to apply page.
5. Candidate fills profile form and selects CV file (UI placeholder only).
6. Form currently logs placeholder payload for integration testing.

## Upload Placeholder Flow
1. Candidate selects file in `UploadZone`.
2. `UploadValidation` checks file type and size.
3. `FilePreview` renders selected file metadata.
4. `UploadProgress` shows placeholder progress state.

No file storage or external API is connected in this phase.

## Future Integration Points
- Database and storage: planned for Supabase integration in careers services and API routes.
- Authentication: planned for role-aware application workflows and admin review.
- Admin dashboard: consumes careers APIs and shared typed contracts.
- Prime AI: planned for CV pre-screening and candidate-assistant flows.

## Validation Strategy
- `careerApplicationSchema` in `src/features/careers/schemas/application.ts`.
- Designed for future server reuse (route handlers and server actions).

## Accessibility Notes
- Semantic headings and sections.
- Labeled form controls.
- Keyboard-operable search/filter/form controls.
- ARIA labels for pagination and content grouping.

## Performance Notes
- Careers and apply pages use dynamic imports for large feature modules.
- Mock data and filtering run on lightweight in-memory structures.
- No heavy dependency additions.