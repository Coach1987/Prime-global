# Supabase Migration and Deployment

This project stores career applications in Supabase Postgres and CV files in Supabase Storage.

## Prerequisites

1. Supabase project created.
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

Set these values in `.env.local` and your hosting provider:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_CV_BUCKET` (set to `prime-global-cv` unless intentionally changed)

Do not commit secrets.

## Migration files

Migration SQL is in:

- `supabase/migrations/202607120001_create_applications_and_storage.sql`

It creates:

1. `public.applications` table.
2. Indexes.
3. RLS policies on `public.applications`.
4. `prime-global-cv` storage bucket.
5. Storage policies for applicant upload and admin-only file management.

## Deploy migrations

From the project root:

1. Check migration status:
   - `supabase migration list`
2. Apply all pending migrations:
   - `supabase db push`

If you prefer running SQL manually, paste the migration SQL into the Supabase SQL editor and execute it.

## Verify

Run these checks in Supabase SQL editor:

1. `public.applications` columns:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'applications'
order by ordinal_position;
```

2. `public.applications` indexes:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'applications'
order by indexname;
```

3. RLS enabled on `public.applications`:

```sql
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid = 'public.applications'::regclass;
```

4. Bucket exists:

```sql
select id, name, public, file_size_limit
from storage.buckets
where id = 'prime-global-cv';
```

5. Database and storage policies:

```sql
select policyname, schemaname, tablename
from pg_policies
where (schemaname = 'public' and tablename = 'applications')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

## Safe end-to-end test and cleanup

1. Create a tiny valid PDF file:

- `printf '%s\n' '%PDF-1.4' '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj' '2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj' 'trailer<</Root 1 0 R>>' '%%EOF' > /tmp/test-cv.pdf`

2. Submit a dummy application:

- `curl -i -X POST http://localhost:3000/api/careers -F "firstName=Test" -F "lastName=Candidate" -F "email=test.candidate@example.com" -F "phone=+10000000000" -F "country=Testland" -F "currentLocation=Test City" -F "desiredPosition=QA Engineer" -F "yearsOfExperience=3" -F "coverLetter=Automated integration test submission" -F "acceptedTerms=true" -F "cv=@/tmp/test-cv.pdf;type=application/pdf"`

3. Delete the dummy record:

```sql
delete from public.applications
where email = 'test.candidate@example.com';
```

4. Delete uploaded dummy file(s):

```sql
delete from storage.objects
where bucket_id = 'prime-global-cv'
  and name like 'applications/%';
```

5. Remove local test artifact:

- `rm -f /tmp/test-cv.pdf`

## Manual SQL fallback (if CLI auth is unavailable)

If CLI authentication is unavailable, execute this full migration in Supabase SQL editor:

- `supabase/migrations/202607120001_create_applications_and_storage.sql`

Then run all verification SQL above.
