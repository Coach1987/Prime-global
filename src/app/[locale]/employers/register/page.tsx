"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

type RegisterResult = {
  success: boolean;
  error?: { message: string };
};

export default function EmployerRegisterPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();

  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    commercialRegistrationNumber: "",
    taxNumber: "",
    country: "",
    city: "",
    address: "",
    website: "",
    companyEmail: "",
    hrContact: "",
    phoneNumber: "",
    industry: "",
    companySize: "11-50",
    companyDescription: "",
  });

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  const disabled = useMemo(() => loading || !csrfToken, [csrfToken, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/employers/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as RegisterResult;
      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "Unable to register company");
        return;
      }

      router.push(`/${params.locale}/employers/login?registered=1`);
    } catch {
      setError("Unexpected error while submitting registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-8 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Company Registration</h1>
        <p className="mt-3 text-sm text-text-secondary">Submit your company profile. Verification is required before publishing jobs.</p>

        <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          {[
            ["email", "Login Email", "email"],
            ["password", "Password", "password"],
            ["companyName", "Company Name", "text"],
            ["commercialRegistrationNumber", "Commercial Registration Number", "text"],
            ["taxNumber", "Tax Number", "text"],
            ["country", "Country", "text"],
            ["city", "City", "text"],
            ["address", "Address", "text"],
            ["website", "Website", "url"],
            ["companyEmail", "Company Email", "email"],
            ["hrContact", "HR Contact", "text"],
            ["phoneNumber", "Phone Number", "text"],
            ["industry", "Industry", "text"],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm text-text-secondary">
              <span className="mb-2 block">{label}</span>
              <input
                required={key !== "website"}
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [key]: event.target.value }))
                }
                className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
              />
            </label>
          ))}

          <label className="block text-sm text-text-secondary">
            <span className="mb-2 block">Company Size</span>
            <select
              value={form.companySize}
              onChange={(event) => setForm((prev) => ({ ...prev, companySize: event.target.value }))}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            >
              {companySizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-text-secondary md:col-span-2">
            <span className="mb-2 block">Company Description</span>
            <textarea
              required
              rows={5}
              value={form.companyDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, companyDescription: event.target.value }))
              }
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </label>

          {error ? <p className="text-sm text-red-300 md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={disabled}
              className="rounded-full bg-gold px-8 py-3 text-sm font-semibold text-bg-primary transition hover:bg-gold-bright disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Create Employer Account"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
