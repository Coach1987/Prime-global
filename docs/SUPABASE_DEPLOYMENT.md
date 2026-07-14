# Supabase Migration and Deployment

This project stores career applications in Supabase Postgres and CV files in Supabase Storage.

## Prerequisites

1. Use the existing Prime Global Supabase project.
2. Supabase CLI installed and authenticated.
3. Environment variables configured in local and deployment environments.

## Supabase CLI setup and linking

Use either global install or one-off execution:

1. Global install:
   - `npm install -g supabase`
2. One-off:
   - `npx supabase --version`

Authenticate:

- `supabase login`

Or in non-interactive environments:

- `export SUPABASE_ACCESS_TOKEN=<your-personal-access-token>`

Link this repository to the existing project:

- `supabase link --project-ref <your-project-ref>`

Find project ref from your Supabase URL:

- `https://<project-ref>.supabase.co`

## Environment variables

Set these values in `.env.local`, GitHub Codespaces, and Vercel:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` (project URL)
- `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never client)
- `SUPABASE_CV_BUCKET` (set to `candidate-cvs`)

Do not commit secrets.

## Migration files

Run all existing migrations, including:

- `supabase/migrations/202607120001_create_applications_and_storage.sql`
- `supabase/migrations/202607140001_create_job_applications_and_candidate_cvs.sql`

The latest migration creates and secures:

1. `public.job_applications` table.
2. Indexes and automatic `updated_at` trigger.
3. RLS on `public.job_applications` with admin-only direct access.
4. Private `candidate-cvs` storage bucket (5 MB limit, PDF/DOC/DOCX only).
5. Storage policies for admin-only read/write operations.

Public careers submissions are handled through `src/app/api/careers/route.ts` using service-role credentials on the server.

## Deploy migrations

From the project root:

1. Check migration status:
   - `supabase migration list`
2. Apply all pending migrations:
   - `supabase db push`

If CLI auth is unavailable, execute migration SQL in Supabase SQL Editor.

## Manual dashboard checks

In Supabase Dashboard:

1. Storage -> Buckets -> verify `candidate-cvs` exists and `Public bucket` is disabled.
2. Bucket settings -> verify allowed MIME types:
   - `application/pdf`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. Bucket settings -> verify file size limit is `5242880` bytes.
4. Policies -> verify no anonymous read/list policies for `job_applications` or `candidate-cvs` objects.

## Verify in SQL Editor

1. `public.job_applications` columns:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'job_applications'
order by ordinal_position;
```

2. `public.job_applications` indexes:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'job_applications'
order by indexname;
```

3. RLS enabled on `public.job_applications`:

```sql
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid = 'public.job_applications'::regclass;
```

4. Bucket exists and is private:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'candidate-cvs';
```

5. Policies:

```sql
select policyname, schemaname, tablename
from pg_policies
where (schemaname = 'public' and tablename = 'job_applications')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

## Safe end-to-end test and cleanup

1. Create tiny test files:

- PDF: `printf '%s\n' '%PDF-1.4' '%%EOF' > /tmp/test-cv.pdf`
- DOC: `printf 'test doc' > /tmp/test-cv.doc`
- DOCX (for API validation only): `cp /tmp/test-cv.doc /tmp/test-cv.docx`

2. Submit a dummy application:

```bash
curl -i -X POST http://localhost:3000/api/careers \
  -F "fullName=Test Candidate" \
  -F "email=test.candidate@example.com" \
  -F "phone=+10000000000" \
  -F "location=Testland, Test City" \
  -F "desiredPosition=QA Engineer" \
  -F "yearsOfExperience=3" \
  -F "coverLetter=Automated integration test submission." \
  -F "acceptedTerms=true" \
  -F "locale=en" \
  -F "cv=@/tmp/test-cv.pdf;type=application/pdf"
```

3. Remove dummy database rows:

```sql
delete from public.job_applications
where email = 'test.candidate@example.com';
```

4. Remove dummy uploaded files:

```sql
delete from storage.objects
where bucket_id = 'candidate-cvs'
  and name like 'job-applications/%';
```

5. Remove local test artifacts:

- `rm -f /tmp/test-cv.pdf /tmp/test-cv.doc /tmp/test-cv.docx`
