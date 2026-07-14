# Careers Platform Foundation

## Scope Of Phase 2
- Added localized careers landing at `/[locale]/careers`.
- Added localized application page at `/[locale]/careers/apply`.
- Implemented reusable job browsing architecture with mock data.
- Connected secure CV upload and application persistence through server-side API.
- Added modular validation schema shared between client and server-side checks.

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
5. Candidate fills profile form and selects CV file.
6. Client validation runs before submission.
7. Server validates payload and file type/size, uploads CV to private storage, then inserts `job_applications` record.
8. If database insert fails after upload, the uploaded CV file is deleted to avoid orphaned files.

## Upload Flow
1. Candidate selects file in `UploadZone`.
2. `UploadValidation` checks file type and size.
3. `FilePreview` renders selected file metadata.
4. `ApplicationForm` submits multipart data to `src/app/api/careers/route.ts`.
5. Server stores the CV in Supabase bucket `candidate-cvs` and writes metadata to `public.job_applications`.

The public form does not use Supabase credentials in the browser.

## Future Integration Points
- Authentication: planned for role-aware application workflows and admin review.
- Admin dashboard: consumes secured server services in `src/lib/server/careers/repository.ts` for listing, filtering, status updates, and signed CV URLs.
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