"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PrimeCheckbox, PrimeInput, PrimeLabel, PrimeSelect, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { primeButtonClasses, PrimeButton } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { InternationalPhoneInput } from "@/components/ui/InternationalPhoneInput";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getPostLoginHref, normalizeAuthRole } from "@/lib/auth/routing";
import { resolveCandidatePostAuthHref, sanitizeLocalizedJobReturnTo } from "@/lib/auth/return-to";

type AuthMode = "signin" | "register";
type AuthAudience = "candidate" | "employer";

type CandidateRegisterState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  phoneNumberRaw: string;
  phoneNumber: string;
  acceptTerms: boolean;
};

type EmployerRegisterState = {
  email: string;
  password: string;
  companyName: string;
  commercialRegistrationNumber: string;
  taxNumber: string;
  country: string;
  city: string;
  address: string;
  website: string;
  companyEmail: string;
  hrContact: string;
  phoneNumber: string;
  industry: string;
  companySize: string;
  companyDescription: string;
};

const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function parseMode(value: string | null): AuthMode {
  return value === "register" || value === "signup" ? "register" : "signin";
}

function parseAudience(audienceValue: string | null, roleValue: string | null): AuthAudience {
  if (audienceValue === "employer") return "employer";
  if (roleValue === "employer") return "employer";
  return "candidate";
}

function buildAuthHref(mode: AuthMode, audience: AuthAudience, returnTo: string | null) {
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("audience", audience);
  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  return `/auth?${params.toString()}`;
}

export function UnifiedAuthExperience() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseMode(searchParams.get("mode"));
  const audience = parseAudience(searchParams.get("audience"), searchParams.get("role"));
  const safeReturnTo = sanitizeLocalizedJobReturnTo(
    searchParams.get("returnTo") ?? searchParams.get("redirectTo"),
    locale
  );

  const [csrfToken, setCsrfToken] = useState("");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [csrfResponse, authResponse] = await Promise.all([
          fetch("/api/security/csrf", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);

        const [csrfPayload, authPayload] = await Promise.all([csrfResponse.json(), authResponse.json()]);

        if (!cancelled) {
          setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
        }

        const role = normalizeAuthRole(String(authPayload?.data?.role ?? ""));
        if (authPayload?.success && role) {
          if (role === "candidate" && safeReturnTo) {
            router.push(safeReturnTo as never);
            return;
          }

          const destination = getPostLoginHref(role, {
            profileCompletion: authPayload?.data?.profileCompletion,
            verificationStatus: authPayload?.data?.verificationStatus,
          });
          router.push(destination);
          return;
        }
      } catch {
        if (!cancelled) {
          setCsrfToken("");
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router, safeReturnTo]);

  const modeItems = useMemo(
    () => [
      { label: isArabic ? "تسجيل الدخول" : "Sign In", value: "signin" },
      { label: isArabic ? "إنشاء حساب" : "Create Account", value: "register" },
    ],
    [isArabic]
  );

  const audienceItems = useMemo(
    () => [
      { label: isArabic ? "مرشح" : "Candidate", value: "candidate" },
      { label: isArabic ? "صاحب عمل" : "Employer", value: "employer" },
    ],
    [isArabic]
  );

  function updateAuthState(nextMode: AuthMode, nextAudience: AuthAudience) {
    router.push(buildAuthHref(nextMode, nextAudience, safeReturnTo));
  }

  const headline =
    mode === "signin"
      ? audience === "candidate"
        ? isArabic
          ? "تسجيل دخول المرشح"
          : "Candidate Sign In"
        : isArabic
          ? "تسجيل دخول صاحب العمل"
          : "Employer Sign In"
      : audience === "candidate"
        ? isArabic
          ? "إنشاء حساب مرشح"
          : "Candidate Create Account"
        : isArabic
          ? "إنشاء حساب صاحب العمل"
          : "Employer Create Account";

  const description =
    mode === "signin"
      ? audience === "candidate"
        ? isArabic
          ? "سجّل الدخول للوصول إلى مقابلاتك وسير العمل المحمي داخل المنصة."
          : "Sign in to access your interviews and protected workflow inside the platform."
        : isArabic
          ? "ادخل إلى مركز المقابلات ولوحة التوظيف الخاصة بشركتك."
          : "Access your company dashboard and manage your hiring pipeline."
      : audience === "candidate"
        ? isArabic
          ? "أنشئ حسابك أولاً، ثم أكمل إعداد ملفك المهني بشكل خاص داخل برايم جلوبال."
          : "Create your account first, then complete your professional profile privately inside Prime Global."
        : isArabic
          ? "أنشئ حساب شركتك. تبقى الشركة في حالة pending_review حتى يعتمدها فريق برايم جلوبال قبل نشر الوظائف أو الوصول إلى بيانات المرشحين."
          : "Create your company account. The company stays in pending_review until Prime Global approves it before publishing jobs or accessing candidate data.";

  if (!authReady) {
    return (
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
          <PrimePageTitle>{isArabic ? "بوابة المصادقة" : "Authentication Gateway"}</PrimePageTitle>
          <p className="mt-3 text-sm text-text-secondary">
            {isArabic
              ? "جارٍ تجهيز صفحة الدخول الموحدة..."
              : "Preparing the unified authentication page..."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
        <PrimePageTitle>{isArabic ? "بوابة المصادقة" : "Authentication Gateway"}</PrimePageTitle>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          {isArabic
            ? "استخدم صفحة واحدة لتسجيل الدخول أو إنشاء الحساب. يمكنك التبديل بين تسجيل الدخول وإنشاء الحساب وبين المرشح وصاحب العمل من دون مغادرة الصفحة."
            : "Use one page for sign in or account creation. You can switch between sign in and create account, and between candidate and employer, without leaving the page."}
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <SegmentedTabs
            label={isArabic ? "تبديل وضع المصادقة" : "Switch authentication mode"}
            items={modeItems}
            activeIndex={mode === "signin" ? 0 : 1}
            onChange={(index) => updateAuthState(index === 0 ? "signin" : "register", audience)}
            className="w-full"
            isRtl={isArabic}
          />

          <SegmentedTabs
            label={isArabic ? "تبديل نوع الحساب" : "Switch account type"}
            items={audienceItems}
            activeIndex={audience === "candidate" ? 0 : 1}
            onChange={(index) => updateAuthState(mode, index === 0 ? "candidate" : "employer")}
            className="w-full"
            isRtl={isArabic}
          />
        </div>

        <div className="mt-8 rounded-[28px] border border-blue-200/20 bg-[#071428]/72 p-6 md:p-8">
          <div className="max-w-3xl">
            <h1 className="font-heading text-3xl text-text-primary md:text-[34px]">{headline}</h1>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{description}</p>
          </div>

          <div className="mt-8">
            {mode === "signin" && audience === "candidate" ? (
              <CandidateSignInForm
                csrfToken={csrfToken}
                isArabic={isArabic}
                locale={locale}
                safeReturnTo={safeReturnTo}
                onSwitchMode={() => updateAuthState("register", "candidate")}
                onSwitchAudience={() => updateAuthState(mode, "employer")}
              />
            ) : null}

            {mode === "signin" && audience === "employer" ? (
              <EmployerSignInForm
                csrfToken={csrfToken}
                isArabic={isArabic}
                onSwitchMode={() => updateAuthState("register", "employer")}
                onSwitchAudience={() => updateAuthState(mode, "candidate")}
              />
            ) : null}

            {mode === "register" && audience === "candidate" ? (
              <CandidateRegisterForm
                csrfToken={csrfToken}
                isArabic={isArabic}
                locale={locale}
                safeReturnTo={safeReturnTo}
                onSwitchMode={() => updateAuthState("signin", "candidate")}
                onSwitchAudience={() => updateAuthState(mode, "employer")}
              />
            ) : null}

            {mode === "register" && audience === "employer" ? (
              <EmployerRegisterForm
                csrfToken={csrfToken}
                isArabic={isArabic}
                onSwitchMode={() => updateAuthState("signin", "employer")}
                onSwitchAudience={() => updateAuthState(mode, "candidate")}
              />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function CandidateSignInForm({
  csrfToken,
  isArabic,
  locale,
  safeReturnTo,
  onSwitchMode,
  onSwitchAudience,
}: {
  csrfToken: string;
  isArabic: boolean;
  locale: string;
  safeReturnTo: string | null;
  onSwitchMode: () => void;
  onSwitchAudience: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email, password, role: "candidate" }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر تسجيل الدخول." : "Unable to sign in"));
        return;
      }

      const redirectTarget = resolveCandidatePostAuthHref({
        locale,
        returnTo: safeReturnTo,
        fallback: getPostLoginHref("candidate", {
          profileCompletion: payload?.data?.profileCompletion,
        }),
      });

      if (redirectTarget) {
        router.push(redirectTarget as never);
        return;
      }
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء تسجيل الدخول." : "Unexpected error while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "البريد الإلكتروني" : "Email"}</label>
        <PrimeInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div>
        <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "كلمة المرور" : "Password"}</label>
        <PrimeInput type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={loading} className={primeButtonClasses("primary")}>
        {loading ? (isArabic ? "جارٍ تسجيل الدخول..." : "Signing In...") : isArabic ? "تسجيل الدخول" : "Sign In"}
      </button>

      <p className="text-sm text-text-secondary">
        {isArabic ? "ليس لديك حساب مرشح؟" : "Need a candidate account?"}{" "}
        <button type="button" onClick={onSwitchMode} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "إنشاء حساب" : "Create Account"}
        </button>
        {" · "}
        <button type="button" onClick={onSwitchAudience} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "تبديل إلى صاحب عمل" : "Switch to employer"}
        </button>
      </p>
    </form>
  );
}

function EmployerSignInForm({
  csrfToken,
  isArabic,
  onSwitchMode,
  onSwitchAudience,
}: {
  csrfToken: string;
  isArabic: boolean;
  onSwitchMode: () => void;
  onSwitchAudience: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email, password, role: "employer" }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر تسجيل الدخول." : "Unable to login"));
        return;
      }

      router.push(
        getPostLoginHref("employer", {
          verificationStatus: payload?.data?.user?.verificationStatus,
        })
      );
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء تسجيل الدخول." : "Unexpected error while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "البريد الإلكتروني للشركة" : "Work Email"}</label>
        <PrimeInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div>
        <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "كلمة المرور" : "Password"}</label>
        <PrimeInput type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={loading} className={primeButtonClasses("primary")}>
        {loading ? (isArabic ? "جارٍ تسجيل الدخول..." : "Signing In...") : isArabic ? "تسجيل الدخول" : "Sign In"}
      </button>

      <p className="text-sm text-text-secondary">
        {isArabic ? "تحتاج إلى حساب صاحب عمل؟" : "Need an employer account?"}{" "}
        <button type="button" onClick={onSwitchMode} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "إنشاء حساب" : "Create Account"}
        </button>
        {" · "}
        <button type="button" onClick={onSwitchAudience} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "تبديل إلى مرشح" : "Switch to candidate"}
        </button>
      </p>
    </form>
  );
}

function CandidateRegisterForm({
  csrfToken,
  isArabic,
  locale,
  safeReturnTo,
  onSwitchMode,
  onSwitchAudience,
}: {
  csrfToken: string;
  isArabic: boolean;
  locale: string;
  safeReturnTo: string | null;
  onSwitchMode: () => void;
  onSwitchAudience: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CandidateRegisterState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    countryCode: "",
    phoneNumberRaw: "",
    phoneNumber: "",
    acceptTerms: false,
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError(isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    if (!form.acceptTerms) {
      setError(isArabic ? "يجب الموافقة على الشروط وسياسة الخصوصية." : "You must accept the Terms and Privacy Policy.");
      return;
    }

    if (!form.countryCode) {
      setError(isArabic ? "يرجى اختيار الدولة." : "Please select a country.");
      return;
    }

    if (!form.phoneNumber) {
      setError(isArabic ? "يرجى إدخال رقم هاتف دولي صحيح." : "Please enter a valid international phone number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          country: form.countryCode,
          phoneNumber: form.phoneNumber,
          acceptTerms: form.acceptTerms,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر إنشاء الحساب." : "Unable to create account."));
        return;
      }

      const destination = resolveCandidatePostAuthHref({
        locale,
        returnTo: safeReturnTo,
        fallback: "/candidate/onboarding",
      });

      router.push(destination as never);
      router.refresh();
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء إنشاء الحساب." : "Unexpected error while creating the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <PrimeLabel>
        <span className="mb-2 block">{isArabic ? "الاسم الكامل" : "Full name"}</span>
        <PrimeInput required value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} />
      </PrimeLabel>

      <PrimeLabel>
        <span className="mb-2 block">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
        <PrimeInput type="email" required value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
      </PrimeLabel>

      <div className="grid gap-5 sm:grid-cols-2">
        <PrimeLabel>
          <span className="mb-2 block">{isArabic ? "كلمة المرور" : "Password"}</span>
          <PrimeInput type="password" required value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
        </PrimeLabel>

        <PrimeLabel>
          <span className="mb-2 block">{isArabic ? "تأكيد كلمة المرور" : "Confirm password"}</span>
          <PrimeInput type="password" required value={form.confirmPassword} onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} />
        </PrimeLabel>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <PrimeLabel>
          <span className="mb-2 block">{isArabic ? "الدولة" : "Country"}</span>
          <CountrySelector
            locale={isArabic ? "ar" : "en"}
            value={form.countryCode}
            onChange={(countryCode) => setForm((prev) => ({ ...prev, countryCode, phoneNumber: prev.phoneNumber }))}
            placeholder={isArabic ? "ابحث عن الدولة" : "Search country"}
          />
        </PrimeLabel>

        <PrimeLabel>
          <span className="mb-2 block">{isArabic ? "رقم الهاتف" : "Phone number"}</span>
          <InternationalPhoneInput
            locale={isArabic ? "ar" : "en"}
            countryCode={form.countryCode || "SA"}
            value={form.phoneNumberRaw}
            onCountryCodeChange={(nextCode) => setForm((prev) => ({ ...prev, countryCode: nextCode }))}
            onChange={(phoneNumberRaw, phoneNumber) =>
              setForm((prev) => ({
                ...prev,
                phoneNumberRaw,
                phoneNumber,
              }))
            }
            placeholder={isArabic ? "مثال: +216 12 345 678" : "Example: +216 12 345 678"}
          />
        </PrimeLabel>
      </div>

      <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#071428]/75 px-4 py-3 text-sm text-text-secondary">
        <PrimeCheckbox
          type="checkbox"
          checked={form.acceptTerms}
          onChange={(event) => setForm((prev) => ({ ...prev, acceptTerms: event.target.checked }))}
        />
        <span>{isArabic ? "أوافق على الشروط وسياسة الخصوصية وإجراءات التنسيق الخاصة بالتوظيف." : "I accept the Terms, Privacy Policy, and recruitment coordination process."}</span>
      </label>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={loading || !csrfToken} className={primeButtonClasses("primary")}>
        {loading ? (isArabic ? "جارٍ إنشاء الحساب..." : "Creating account...") : isArabic ? "إنشاء الحساب" : "Create Account"}
      </button>

      <p className="text-sm text-text-secondary">
        {isArabic ? "لديك حساب مرشح بالفعل؟" : "Already have a candidate account?"}{" "}
        <button type="button" onClick={onSwitchMode} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "تسجيل الدخول" : "Sign In"}
        </button>
        {" · "}
        <button type="button" onClick={onSwitchAudience} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "تبديل إلى صاحب عمل" : "Switch to employer"}
        </button>
      </p>
    </form>
  );
}

function EmployerRegisterForm({
  csrfToken,
  isArabic,
  onSwitchMode,
  onSwitchAudience,
}: {
  csrfToken: string;
  isArabic: boolean;
  onSwitchMode: () => void;
  onSwitchAudience: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [form, setForm] = useState<EmployerRegisterState>({
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password !== confirmPassword) {
      setError(isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    if (!acceptTerms) {
      setError(isArabic ? "يجب الموافقة على الشروط وسياسة الخصوصية." : "You must accept the Terms and Privacy Policy.");
      return;
    }

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

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر تسجيل الشركة." : "Unable to register company"));
        return;
      }

      router.push("/employer/pending-approval");
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء إرسال التسجيل." : "Unexpected error while submitting registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
      {[
        ["email", isArabic ? "بريد الدخول" : "Login Email", "email"],
        ["password", isArabic ? "كلمة المرور" : "Password", "password"],
        ["companyName", isArabic ? "اسم الشركة" : "Company Name", "text"],
        ["commercialRegistrationNumber", isArabic ? "رقم السجل التجاري" : "Company Registration Number", "text"],
        ["taxNumber", isArabic ? "الرقم الجبائي" : "Tax Number", "text"],
        ["country", isArabic ? "الدولة" : "Country", "text"],
        ["city", isArabic ? "المدينة" : "City", "text"],
        ["address", isArabic ? "العنوان" : "Address", "text"],
        ["website", isArabic ? "الموقع الإلكتروني" : "Website", "url"],
        ["companyEmail", isArabic ? "بريد الشركة" : "Company Email", "email"],
        ["hrContact", isArabic ? "الشخص المسؤول" : "Contact Person", "text"],
        ["phoneNumber", isArabic ? "رقم الهاتف" : "Phone Number", "text"],
        ["industry", isArabic ? "القطاع" : "Industry", "text"],
      ].map(([key, label, type]) => (
        <PrimeLabel key={key}>
          <span className="mb-2 block">{label}</span>
          <PrimeInput
            required={key !== "website"}
            type={type}
            value={form[key as keyof EmployerRegisterState]}
            onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
          />
        </PrimeLabel>
      ))}

      <PrimeLabel>
        <span className="mb-2 block">{isArabic ? "تأكيد كلمة المرور" : "Confirm Password"}</span>
        <PrimeInput type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </PrimeLabel>

      <PrimeLabel>
        <span className="mb-2 block">{isArabic ? "حجم الشركة" : "Company Size"}</span>
        <PrimeSelect value={form.companySize} onChange={(event) => setForm((prev) => ({ ...prev, companySize: event.target.value }))}>
          {companySizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </PrimeSelect>
      </PrimeLabel>

      <PrimeLabel className="md:col-span-2">
        <span className="mb-2 block">{isArabic ? "وصف الشركة" : "Company Description"}</span>
        <PrimeTextarea
          required
          rows={5}
          value={form.companyDescription}
          onChange={(event) => setForm((prev) => ({ ...prev, companyDescription: event.target.value }))}
        />
      </PrimeLabel>

      <label className="md:col-span-2 flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#071428]/75 px-4 py-3 text-sm text-text-secondary">
        <PrimeCheckbox type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} />
        <span>{isArabic ? "أوافق على الشروط وسياسة الخصوصية ومتطلبات التحقق من الشركة." : "I accept the Terms, Privacy Policy, and company verification requirements."}</span>
      </label>

      {error ? <p className="text-sm text-red-300 md:col-span-2">{error}</p> : null}

      <div className="md:col-span-2">
        <PrimeButton type="submit" disabled={loading || !csrfToken}>
          {loading ? (isArabic ? "جارٍ الإرسال..." : "Submitting...") : isArabic ? "إنشاء الحساب" : "Create Employer Account"}
        </PrimeButton>
      </div>

      <p className="md:col-span-2 text-sm text-text-secondary">
        {isArabic ? "لديك حساب صاحب عمل بالفعل؟" : "Already have an employer account?"}{" "}
        <button type="button" onClick={onSwitchMode} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "تسجيل الدخول" : "Sign In"}
        </button>
        {" · "}
        <button type="button" onClick={onSwitchAudience} className="font-semibold text-blue-200 hover:text-blue-100">
          {isArabic ? "تبديل إلى مرشح" : "Switch to candidate"}
        </button>
      </p>
    </form>
  );
}