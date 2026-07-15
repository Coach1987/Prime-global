"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type PreferencesPayload = Record<string, unknown>;

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CandidateJobAlertSettingsPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const [token, setToken] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [desiredJobTitles, setDesiredJobTitles] = useState("");
  const [relatedJobTitles, setRelatedJobTitles] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [availability, setAvailability] = useState("");
  const [workModePreference, setWorkModePreference] = useState("any");
  const [frequency, setFrequency] = useState("instant");
  const [threshold, setThreshold] = useState(70);

  const copy = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "إعدادات تنبيهات الوظائف",
            subtitle: "اختر تفضيلاتك لإرسال تنبيهات مطابقة عبر الإشعارات والبريد الإلكتروني.",
            save: "حفظ الإعدادات",
            saved: "تم حفظ الإعدادات بنجاح.",
            failed: "تعذر حفظ الإعدادات.",
          }
        : {
            title: "Job Alert Settings",
            subtitle: "Choose your preferences to receive matching job alerts in-app and by email.",
            save: "Save Settings",
            saved: "Settings saved successfully.",
            failed: "Unable to save settings.",
          },
    [locale]
  );

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    setToken(accessToken);

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    if (!accessToken) return;

    fetch("/api/candidates/job-alert-preferences", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => response.json())
      .then((payload: { data?: PreferencesPayload | null }) => {
        const data = payload?.data;
        if (!data) return;

        setDesiredJobTitles(Array.isArray(data.desired_job_titles) ? data.desired_job_titles.join(", ") : "");
        setRelatedJobTitles(Array.isArray(data.related_job_titles) ? data.related_job_titles.join(", ") : "");
        setSkills(Array.isArray(data.skills) ? data.skills.join(", ") : "");
        setLanguages(Array.isArray(data.languages) ? data.languages.join(", ") : "");
        setCountry(String(data.country ?? ""));
        setCity(String(data.city ?? ""));
        setAvailability(String(data.availability ?? ""));
        setWorkModePreference(String(data.work_mode_preference ?? "any"));
        setFrequency(String(data.email_notification_frequency ?? "instant"));
        setThreshold(Number(data.notification_threshold ?? 70));
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    if (!token) return;

    const response = await fetch("/api/candidates/job-alert-preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        desiredJobTitles: parseCsv(desiredJobTitles),
        relatedJobTitles: parseCsv(relatedJobTitles),
        skills: parseCsv(skills),
        languages: parseCsv(languages),
        country: country || null,
        city: city || null,
        availability: availability || null,
        workModePreference,
        emailNotificationFrequency: frequency,
        notificationThreshold: threshold,
        unsubscribed: frequency === "disabled",
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setStatus(copy.failed);
      return;
    }

    setStatus(copy.saved);
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <input value={desiredJobTitles} onChange={(event) => setDesiredJobTitles(event.target.value)} placeholder="Desired job titles" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={relatedJobTitles} onChange={(event) => setRelatedJobTitles(event.target.value)} placeholder="Related titles" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Skills" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={languages} onChange={(event) => setLanguages(event.target.value)} placeholder="Languages" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Availability" className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary" />

          <select value={workModePreference} onChange={(event) => setWorkModePreference(event.target.value)} className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary">
            <option value="any">Any work mode</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>

          <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary">
            <option value="instant">Instant alerts</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
            <option value="disabled">Disabled</option>
          </select>

          <input
            type="number"
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            min={0}
            max={100}
            className="rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary"
            placeholder="Notification threshold"
          />
        </div>

        {status ? <p className="mt-4 text-sm text-text-secondary">{status}</p> : null}

        <button onClick={save} className="mt-6 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
          {copy.save}
        </button>
      </section>
    </main>
  );
}
