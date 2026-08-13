"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useEffect, useRef, useState } from "react";
import { employerTourSteps, type EmployerDemoAction, type EmployerTourMode } from "./employer-tour-steps";
import { emitEmployerTourEvent } from "./tour-analytics";

const STORAGE_KEY = "prime-global:employer-guided-tour";
const VIRTUAL_STEP_IDS = new Set(["verification", "pending", "ready"]);

type TourSession = {
  active: boolean;
  mode: EmployerTourMode;
  stepIndex: number;
  completed: boolean;
  demoPlaybackRate?: number;
};

type TargetRect = { top: number; left: number; width: number; height: number };

const ACTION_TICK_MS = 50;

const emptySession: TourSession = { active: false, mode: "interactive", stepIndex: 0, completed: false };

function readSession(): TourSession {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value ? { ...emptySession, ...JSON.parse(value) } : emptySession;
  } catch {
    return emptySession;
  }
}

function saveSession(session: TourSession) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function TourSpotlight({ rect, reducedMotion, cinematic }: { rect: TargetRect | null; reducedMotion: boolean; cinematic: boolean }) {
  if (!rect) return <div className={`fixed inset-0 ${cinematic ? "bg-[#020711]/28" : "bg-[#020711]/60 backdrop-blur-[1px]"}`} />;

  const padding = 10;
  return (
    <motion.div
      className={`fixed z-[101] rounded-lg border-2 border-blue-200/90 ${cinematic ? "shadow-[0_0_0_9999px_rgba(2,7,17,0.32),0_0_38px_rgba(78,164,255,0.62)]" : "shadow-[0_0_0_9999px_rgba(2,7,17,0.60),0_0_30px_rgba(92,173,255,0.5)]"}`}
      initial={false}
      animate={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
      transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    />
  );
}

function TourPointer({ rect, action, isMobile, reducedMotion }: { rect: TargetRect | null; action?: EmployerDemoAction; isMobile: boolean; reducedMotion: boolean }) {
  if (!rect || reducedMotion || action?.kind === "status" || action?.kind === "preview") return null;
  const pointerX = rect.left + rect.width * (isMobile ? 0.5 : 0.72);
  const pointerY = rect.top + Math.min(rect.height * 0.64, 44);
  return (
    <motion.div
      data-testid={isMobile ? "demo-touch" : "demo-pointer"}
      className="pointer-events-none fixed left-0 top-0 z-[104] grid h-10 w-10 place-items-center"
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{
        opacity: 1,
        scale: action?.kind === "click" || action?.kind === "select" ? [1, 0.82, 1] : 1,
        x: pointerX,
        y: pointerY,
      }}
      transition={{ x: { duration: 0.85, ease: [0.22, 1, 0.36, 1] }, y: { duration: 0.85, ease: [0.22, 1, 0.36, 1] }, scale: { delay: 0.88, duration: 0.34 } }}
      aria-hidden="true"
    >
      {isMobile ? (
        <span className="relative block h-7 w-7 rounded-full border-2 border-white bg-blue-400/35 shadow-[0_0_0_7px_rgba(77,163,255,0.16),0_6px_22px_rgba(20,98,190,0.55)]" />
      ) : (
        <span className="block h-7 w-5 -rotate-12 bg-white shadow-[0_3px_7px_rgba(0,0,0,0.5)] [clip-path:polygon(0_0,0_100%,29%_72%,48%_100%,64%_91%,45%_63%,78%_60%)]" />
      )}
      {(action?.kind === "click" || action?.kind === "select") ? <motion.span className="absolute h-9 w-9 rounded-full border border-blue-200" initial={{ opacity: 0.7, scale: 0.3 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ delay: 0.9, duration: 0.55 }} /> : null}
    </motion.div>
  );
}

function DemoFieldValue({ action, rect, elapsedMs, isArabic }: { action?: EmployerDemoAction; rect: TargetRect | null; elapsedMs: number; isArabic: boolean }) {
  if (!rect || !action?.value || (action.kind !== "type" && action.kind !== "select")) return null;
  const typingWindow = Math.max(1, action.durationMs - 1900);
  const progress = action.kind === "select" ? (elapsedMs > 1150 ? 1 : 0) : Math.max(0, Math.min(1, (elapsedMs - 950) / typingWindow));
  const value = action.value.slice(0, Math.ceil(action.value.length * progress));
  return (
    <div
      data-testid="demo-field-value"
      className="pointer-events-none fixed z-[103] flex items-center overflow-hidden rounded-md border border-blue-200/70 bg-[#08172b] px-3 text-sm text-white shadow-[inset_0_0_18px_rgba(54,139,239,0.18),0_0_22px_rgba(65,151,247,0.28)]"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, direction: isArabic ? "rtl" : "ltr" }}
      aria-hidden="true"
    >
      <span className="truncate">{value}</span>
      {action.kind === "type" && progress > 0 && progress < 1 ? <span className="ms-0.5 h-4 w-px animate-pulse bg-blue-200" /> : null}
    </div>
  );
}

function DemoStatus({ actionId, isArabic }: { actionId?: string; isArabic: boolean }) {
  const stages = isArabic
    ? [{ id: "account-submitted", label: "تم إرسال الحساب" }, { id: "prime-global-verification", label: "تحقق برايم غلوبال" }, { id: "pending-approval", label: "بانتظار الاعتماد" }]
    : [{ id: "account-submitted", label: "Account submitted" }, { id: "prime-global-verification", label: "Prime Global verification" }, { id: "pending-approval", label: "Pending Approval" }];
  const activeIndex = Math.max(0, stages.findIndex((stage) => stage.id === actionId));
  return (
    <div data-testid="demo-status-transition" className="mt-4 grid gap-2" aria-live="polite">
      {stages.map((stage, index) => (
        <motion.div key={stage.id} className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs ${index <= activeIndex ? "border-blue-300/45 bg-blue-300/10 text-white" : "border-white/10 text-slate-500"}`} animate={{ opacity: index <= activeIndex ? 1 : 0.55 }}>
          <span className={`grid h-5 w-5 place-items-center rounded-full ${index < activeIndex ? "bg-emerald-400 text-[#03101f]" : index === activeIndex ? "bg-blue-400 text-[#03101f]" : "bg-white/10"}`}>{index < activeIndex ? "✓" : index + 1}</span>
          {stage.label}
        </motion.div>
      ))}
    </div>
  );
}

function ApprovedWorkspacePreview({ isArabic }: { isArabic: boolean }) {
  const items = isArabic ? ["تم اعتماد الشركة", "إنشاء الوظائف", "إدارة التوظيف", "مساحة عمل آمنة"] : ["Company approved", "Create jobs", "Manage recruitment", "Secure workspace"];
  return (
    <motion.div data-testid="approved-workspace-preview" className="mt-4 overflow-hidden rounded-md border border-blue-200/25 bg-[#04101f]" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-xs font-bold uppercase text-blue-200">Prime Global</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {items.map((item, index) => <motion.div key={item} className="min-h-14 rounded border border-white/10 bg-white/[0.04] p-2 text-xs text-slate-200" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.16 }}><span className="me-1 text-emerald-300">✓</span>{item}</motion.div>)}
      </div>
    </motion.div>
  );
}

function TourControls({
  isArabic,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSkip,
}: {
  isArabic: boolean;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations("employerGuidedTour.controls");
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onNext} className="min-h-11 rounded-md bg-blue-400 px-5 text-sm font-bold text-[#03101f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
        {isLast ? t("finish") : t("next")}
      </button>
      <button type="button" onClick={onBack} disabled={isFirst} className="min-h-11 rounded-md border border-white/25 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
        {t("back")}
      </button>
      <button type="button" onClick={onSkip} className="min-h-11 px-3 text-sm font-semibold text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
        {t("skip")}
      </button>
      <span className="sr-only">{isArabic ? "اتجاه من اليمين إلى اليسار" : "Left to right controls"}</span>
    </div>
  );
}

export function EmployerGuidedTour({
  locale,
  requestOpen,
  onRequestHandled,
}: {
  locale: "en" | "ar";
  requestOpen: boolean;
  onRequestHandled: () => void;
}) {
  const t = useTranslations("employerGuidedTour");
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);
  const isArabic = locale === "ar";
  const [chooserOpen, setChooserOpen] = useState(false);
  const [session, setSession] = useState<TourSession>(emptySession);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [actionIndex, setActionIndex] = useState(0);
  const [actionElapsedMs, setActionElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextStepRef = useRef(nextStep);
  nextStepRef.current = nextStep;

  const step = employerTourSteps[session.stepIndex] ?? employerTourSteps[0];
  const action = session.mode === "demo" ? step.demoActions[actionIndex] : undefined;
  const activeTarget = action?.target ?? step.target;

  useEffect(() => {
    const stored = readSession();
    setSession(stored);
    setIsMobile(window.matchMedia("(max-width: 767px), (pointer: coarse)").matches);
    const params = new URLSearchParams(window.location.search);
    const requestedRate = Number(params.get("demoSpeed"));
    const captureRate = Number.isFinite(requestedRate) && requestedRate > 0 ? Math.min(requestedRate, 8) : stored.demoPlaybackRate ?? 1;
    setPlaybackRate(captureRate);
    if (params.get("employerDemo") === "autoplay") {
      const next = { active: true, mode: "demo" as const, stepIndex: 0, completed: false, demoPlaybackRate: captureRate };
      setSession(next);
      saveSession(next);
      emitEmployerTourEvent("tour_started", { mode: "demo", locale, capture: true });
    }
  }, [locale]);

  useEffect(() => {
    if (!requestOpen) return;
    setChooserOpen(true);
    onRequestHandled();
  }, [onRequestHandled, requestOpen]);

  useEffect(() => {
    if (!session.active) return;
    saveSession(session);
    emitEmployerTourEvent("tour_step_viewed", { mode: session.mode, step: step.id, stepIndex: session.stepIndex });
  }, [session, step.id]);

  useEffect(() => {
    if (!session.active) return;

    let frame = 0;
    const updateTarget = () => {
      const element = document.querySelector<HTMLElement>(activeTarget);
      if (!element) {
        setTargetRect(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      const lenis = (window as typeof window & { __lenis?: { scrollTo: (target: HTMLElement, options: Record<string, unknown>) => void } }).__lenis;
      if (session.mode === "demo" && !reducedMotion && lenis) {
        lenis.scrollTo(element, { offset: -(window.innerHeight - rect.height) / 2, duration: 1.05 });
      } else {
        element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      }
    };
    frame = window.requestAnimationFrame(updateTarget);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget);
    };
  }, [activeTarget, pathname, reducedMotion, session.active, session.mode]);

  useEffect(() => {
    if (!session.active || session.mode !== "interactive" || step.id !== "company") return;
    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) return;

    const advanceAfterInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.value.trim()) nextStep();
    };
    target.addEventListener("input", advanceAfterInput, { once: true });
    return () => target.removeEventListener("input", advanceAfterInput);
  });

  useEffect(() => {
    if (!session.active) return;
    cardRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour("tour_skipped");
      if (event.key === "ArrowRight" && !isArabic) nextStep();
      if (event.key === "ArrowLeft" && isArabic) nextStep();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    setActionIndex(0);
    setActionElapsedMs(0);
  }, [session.stepIndex]);

  useEffect(() => {
    if (!session.active || session.mode !== "demo" || paused || !action) return;
    const timer = window.setInterval(() => setActionElapsedMs((elapsed) => elapsed + ACTION_TICK_MS * playbackRate), ACTION_TICK_MS);
    return () => window.clearInterval(timer);
  }, [action, paused, playbackRate, session.active, session.mode]);

  useEffect(() => {
    if (!action || actionElapsedMs < action.durationMs) return;
    if (actionIndex < step.demoActions.length - 1) {
      setActionIndex((index) => index + 1);
      setActionElapsedMs(0);
      return;
    }
    nextStepRef.current();
  }, [action, actionElapsedMs, actionIndex, step.demoActions.length]);

  function beginTour(mode: EmployerTourMode) {
    const pathStep = pathname.startsWith("/auth") ? 1 : pathname.includes("pending-approval") ? 3 : pathname.includes("dashboard") ? 4 : 0;
    const next = { active: true, mode, stepIndex: pathStep, completed: false };
    setChooserOpen(false);
    setSession(next);
    setPaused(false);
    setActionIndex(0);
    setActionElapsedMs(0);
    saveSession(next);
    emitEmployerTourEvent("tour_started", { mode, locale });
  }

  function closeTour(event: "tour_skipped" | "tour_completed") {
    const next = { ...session, active: false, completed: event === "tour_completed" };
    setSession(next);
    saveSession(next);
    emitEmployerTourEvent(event, { mode: session.mode, step: step.id });
  }

  function replayTour() {
    emitEmployerTourEvent("tour_replayed", { locale });
    const next = { active: true, mode: session.mode, stepIndex: 0, completed: false };
    setSession(next);
    setPaused(false);
    setActionIndex(0);
    setActionElapsedMs(0);
    saveSession(next);
    router.push("/employers" as never);
  }

  function moveTo(index: number) {
    const boundedIndex = Math.max(0, Math.min(index, employerTourSteps.length - 1));
    const nextStepDefinition = employerTourSteps[boundedIndex];
    setSession((current) => ({ ...current, stepIndex: boundedIndex }));
    setActionIndex(0);
    setActionElapsedMs(0);

    const shouldNavigate =
      boundedIndex < 2 &&
      !pathname.startsWith(nextStepDefinition.route.split("?")[0]);
    if (shouldNavigate) router.push(nextStepDefinition.route as never);
  }

  function nextStep() {
    if (session.stepIndex === employerTourSteps.length - 1) {
      closeTour("tour_completed");
      return;
    }
    moveTo(session.stepIndex + 1);
  }

  const targetIsLow = targetRect ? targetRect.top > 360 : false;
  const targetIsRight = targetRect ? targetRect.left > 560 : false;
  const cardPosition = `${targetIsLow ? "md:top-6 md:bottom-auto" : "md:bottom-6"} ${targetIsRight ? "md:start-6 md:end-auto" : "md:end-6"}`;

  return (
    <>
      <AnimatePresence>
        {chooserOpen ? (
          <motion.div className="fixed inset-0 z-[110] grid place-items-center bg-[#020711]/80 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section role="dialog" aria-modal="true" aria-labelledby="tour-chooser-title" className="w-full max-w-lg rounded-lg border border-blue-300/30 bg-[#071428] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]" initial={{ y: reducedMotion ? 0 : 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-300">Prime Global</p>
                  <h2 id="tour-chooser-title" className="mt-2 font-heading text-2xl">{t("chooser.title")}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{t("chooser.description")}</p>
                </div>
                <button type="button" onClick={() => setChooserOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center text-2xl text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" aria-label={t("controls.close")}>×</button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => beginTour("interactive")} className="min-h-14 rounded-md bg-blue-400 px-4 text-sm font-bold text-[#03101f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">{t("chooser.interactive")}</button>
                <button type="button" onClick={() => beginTour("demo")} className="min-h-14 rounded-md border border-gold/60 px-4 text-sm font-bold text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold">{t("chooser.demo")}</button>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">{t("chooser.safety")}</p>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {session.active ? (
          <motion.div data-tour-mode={session.mode} data-demo-step={step.id} data-demo-action={action?.id} data-demo-duration-ms={employerTourSteps.reduce((total, item) => total + item.timingMs, 0)} className="pointer-events-none fixed inset-0 z-[100]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TourSpotlight rect={targetRect} reducedMotion={reducedMotion} cinematic={session.mode === "demo"} />
            {session.mode === "demo" ? <DemoFieldValue action={action} rect={targetRect} elapsedMs={actionElapsedMs} isArabic={isArabic} /> : null}
            <TourPointer rect={targetRect} action={action} isMobile={isMobile} reducedMotion={reducedMotion} />
            <motion.div
              ref={cardRef}
              tabIndex={-1}
              role="dialog"
              aria-live="polite"
              aria-label={t(step.titleKey)}
              className={`pointer-events-auto fixed inset-x-3 bottom-3 z-[105] mx-auto max-h-[42vh] w-auto max-w-sm overflow-y-auto rounded-lg border border-blue-300/35 bg-[#071428]/95 p-4 text-white shadow-[0_18px_54px_rgba(0,0,0,0.48)] backdrop-blur-md md:inset-x-auto md:w-[340px] ${cardPosition}`}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-300">
                    {session.mode === "demo" ? <span className="rounded-sm border border-gold/60 px-2 py-1 text-gold">{t("demoBadge")}</span> : null}
                    <span>{t("progress", { current: session.stepIndex + 1, total: employerTourSteps.length })}</span>
                  </div>
                  <h2 className="mt-2 font-heading text-xl">{t(step.titleKey)}</h2>
                </div>
                <button type="button" onClick={() => closeTour("tour_skipped")} className="grid h-11 w-11 shrink-0 place-items-center text-2xl text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" aria-label={t("controls.close")}>×</button>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-200">{t(step.instructionKey)}</p>
              {session.mode === "demo" && step.id === "pending" ? <DemoStatus actionId={action?.id} isArabic={isArabic} /> : null}
              {session.mode === "demo" && step.id === "ready" ? <ApprovedWorkspacePreview isArabic={isArabic} /> : null}
              {session.mode === "demo" && VIRTUAL_STEP_IDS.has(step.id) && step.id !== "pending" && step.id !== "ready" ? (
                <div className="mt-4 border-s-2 border-gold/70 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                  {t(`demoStates.${step.id}`)}
                </div>
              ) : null}
              <div className="mt-5 grid grid-cols-5 gap-1" aria-hidden="true">
                {employerTourSteps.map((item, index) => <motion.span key={item.id} className={`h-1 rounded-full ${index <= session.stepIndex ? "bg-blue-400" : "bg-white/15"}`} animate={{ opacity: index === session.stepIndex ? [0.65, 1] : 1 }} />)}
              </div>
              {session.mode === "demo" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setPaused((value) => !value)} className="min-h-10 rounded-md bg-blue-400 px-4 text-xs font-bold text-[#03101f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">{paused ? t("controls.resume") : t("controls.pause")}</button>
                  <button type="button" onClick={() => moveTo(session.stepIndex - 1)} disabled={session.stepIndex === 0} className="min-h-10 px-2 text-xs font-semibold text-slate-200 disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{t("controls.previous")}</button>
                  <button type="button" onClick={nextStep} className="min-h-10 px-2 text-xs font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{t("controls.next")}</button>
                  <button type="button" onClick={() => closeTour("tour_skipped")} className="ms-auto min-h-10 px-2 text-xs font-semibold text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{t("controls.exit")}</button>
                </div>
              ) : <TourControls isArabic={isArabic} isFirst={session.stepIndex === 0} isLast={session.stepIndex === employerTourSteps.length - 1} onBack={() => moveTo(session.stepIndex - 1)} onNext={nextStep} onSkip={() => closeTour("tour_skipped")} />}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!session.active && session.completed ? (
        <button type="button" onClick={replayTour} className="fixed bottom-5 end-5 z-40 min-h-11 rounded-md border border-blue-300/40 bg-[#071428]/95 px-4 text-sm font-semibold text-blue-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          {t("controls.replay")}
        </button>
      ) : null}
    </>
  );
}