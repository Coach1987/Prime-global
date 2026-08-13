export type EmployerTourMode = "interactive" | "demo";

export type EmployerDemoAction = {
  id: string;
  target?: string;
  kind: "click" | "type" | "select" | "group" | "status" | "preview";
  value?: string;
  durationMs: number;
};

export type EmployerTourStep = {
  id: "account" | "company" | "verification" | "pending" | "ready";
  target: string;
  route: string;
  titleKey: string;
  instructionKey: string;
  narrationKey: string;
  timingMs: number;
  pointerAction: "point" | "click" | "type" | "wait";
  transition: "fade" | "focus" | "route";
  demoActions: EmployerDemoAction[];
};

export const employerTourSteps: EmployerTourStep[] = [
  {
    id: "account",
    target: '[data-tour="employer-create-account"]',
    route: "/employers",
    titleKey: "steps.account.title",
    instructionKey: "steps.account.instruction",
    narrationKey: "steps.account.narration",
    timingMs: 3200,
    pointerAction: "click",
    transition: "route",
    demoActions: [
      { id: "open-registration", target: '[data-tour="employer-create-account"]', kind: "click", durationMs: 4200 },
    ],
  },
  {
    id: "company",
    target: '[data-tour="company-name"]',
    route: "/auth?mode=signup&role=employer",
    titleKey: "steps.company.title",
    instructionKey: "steps.company.instruction",
    narrationKey: "steps.company.narration",
    timingMs: 25000,
    pointerAction: "type",
    transition: "focus",
    demoActions: [
      { id: "company-name", target: "#employer-register-companyName", kind: "type", value: "Prime Global Demo Company", durationMs: 5200 },
      { id: "registration-number", target: "#employer-register-commercialRegistrationNumber", kind: "type", value: "PG-DEMO-2026", durationMs: 4200 },
      { id: "country", target: "#employer-register-country", kind: "select", value: "United Arab Emirates", durationMs: 3900 },
      { id: "company-email", target: "#employer-register-companyEmail", kind: "type", value: "demo@primeglobal.example", durationMs: 4700 },
      { id: "industry", target: "#employer-register-industry", kind: "select", value: "Technology", durationMs: 3600 },
      { id: "remaining-details", target: '[data-tour="company-verification"]', kind: "group", durationMs: 3400 },
    ],
  },
  {
    id: "verification",
    target: '[data-tour="company-verification"]',
    route: "/auth?mode=signup&role=employer",
    titleKey: "steps.verification.title",
    instructionKey: "steps.verification.instruction",
    narrationKey: "steps.verification.narration",
    timingMs: 6500,
    pointerAction: "point",
    transition: "focus",
    demoActions: [
      { id: "legal-agreement", target: '[data-tour="company-verification"]', kind: "click", durationMs: 3200 },
      { id: "verification-stage", kind: "status", durationMs: 3300 },
    ],
  },
  {
    id: "pending",
    target: '[data-tour="pending-approval"]',
    route: "/employer/pending-approval",
    titleKey: "steps.pending.title",
    instructionKey: "steps.pending.instruction",
    narrationKey: "steps.pending.narration",
    timingMs: 7000,
    pointerAction: "wait",
    transition: "fade",
    demoActions: [
      { id: "account-submitted", kind: "status", value: "submitted", durationMs: 2200 },
      { id: "prime-global-verification", kind: "status", value: "verification", durationMs: 2400 },
      { id: "pending-approval", kind: "status", value: "pending", durationMs: 2400 },
    ],
  },
  {
    id: "ready",
    target: '[data-tour="ready-to-recruit"]',
    route: "/employers/dashboard",
    titleKey: "steps.ready.title",
    instructionKey: "steps.ready.instruction",
    narrationKey: "steps.ready.narration",
    timingMs: 7500,
    pointerAction: "click",
    transition: "fade",
    demoActions: [
      { id: "approved-workspace", kind: "preview", durationMs: 7500 },
    ],
  },
];
