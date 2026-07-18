import { redirect } from "next/navigation";

export default async function EmployerRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === "string") {
      query.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const extraQuery = query.toString();
  redirect(`/${locale}/auth?mode=signup&role=employer${extraQuery ? `&${extraQuery}` : ""}`);
}
