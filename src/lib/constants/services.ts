export type ServiceIcon = "briefcase" | "truck" | "users" | "gears";

export type ServiceKey = "businessAdmin" | "logistics" | "recruitment" | "operations";

export type LocalizedText = {
  en: string;
  ar: string;
};

export type ServiceDetailSection = {
  title: LocalizedText;
  body: LocalizedText;
  bullets: LocalizedText[];
};

export type ServiceDetail = {
  summary: LocalizedText;
  sections: ServiceDetailSection[];
  nextStep: LocalizedText;
};

export interface ServiceItem {
  slug: string;
  icon: ServiceIcon;
  key: ServiceKey;
}

export const SERVICES: ServiceItem[] = [
  {
    slug: "business-administration",
    icon: "briefcase",
    key: "businessAdmin",
  },
  {
    slug: "logistics-support",
    icon: "truck",
    key: "logistics",
  },
  {
    slug: "recruitment",
    icon: "users",
    key: "recruitment",
  },
  {
    slug: "operational-optimization",
    icon: "gears",
    key: "operations",
  },
];

export const SERVICE_DETAILS: Record<ServiceKey, ServiceDetail> = {
  businessAdmin: {
    summary: {
      en: "Structured administration support that keeps documents, reporting, and coordination under control.",
      ar: "دعم إداري منظم يحافظ على المستندات والتقارير والتنسيق تحت السيطرة.",
    },
    sections: [
      {
        title: {
          en: "What this service covers",
          ar: "ما تغطيه هذه الخدمة",
        },
        body: {
          en: "We organize the recurring administrative workload so your teams can stay focused on execution.",
          ar: "ننظم عبء العمل الإداري المتكرر حتى تظل فرقك مركزة على التنفيذ.",
        },
        bullets: [
          {
            en: "Document handling, reporting coordination, and business correspondence",
            ar: "إدارة المستندات، تنسيق التقارير، والمراسلات التجارية",
          },
          {
            en: "Process tracking for approvals, renewals, and internal follow-up",
            ar: "متابعة إجراءات الموافقات والتجديدات والمتابعة الداخلية",
          },
          {
            en: "Operational structure for repeatable back-office tasks",
            ar: "بنية تشغيلية للمهام المكتبية المتكررة",
          },
        ],
      },
      {
        title: {
          en: "Best fit for",
          ar: "الأنسب لـ",
        },
        body: {
          en: "Teams that need a dependable administrative layer without adding unnecessary overhead.",
          ar: "الفرق التي تحتاج طبقة إدارية موثوقة من دون أعباء إضافية غير ضرورية.",
        },
        bullets: [
          {
            en: "Growing businesses that need order and consistency",
            ar: "الشركات النامية التي تحتاج إلى التنظيم والاتساق",
          },
          {
            en: "Organizations managing multiple stakeholders and deadlines",
            ar: "المنظمات التي تدير عدة أطراف معنية ومواعيد نهائية",
          },
          {
            en: "Operations that need fewer manual gaps and clearer ownership",
            ar: "العمليات التي تحتاج إلى فجوات يدوية أقل ومسؤوليات أوضح",
          },
        ],
      },
    ],
    nextStep: {
      en: "If you want to scope an administration workflow, open a conversation through the portal or contact page.",
      ar: "إذا أردت تحديد نطاق سير عمل إداري، افتح محادثة عبر البوابة أو صفحة التواصل.",
    },
  },
  logistics: {
    summary: {
      en: "Reliable logistics coordination that keeps movement, delivery, and tracking predictable.",
      ar: "تنسيق لوجستي موثوق يجعل الحركة والتسليم والمتابعة أكثر قابلية للتوقع.",
    },
    sections: [
      {
        title: {
          en: "What this service covers",
          ar: "ما تغطيه هذه الخدمة",
        },
        body: {
          en: "We help coordinate the operational pieces around delivery so your supply chain stays clear and responsive.",
          ar: "نساعد على تنسيق الأجزاء التشغيلية المحيطة بالتسليم حتى تبقى سلسلة الإمداد واضحة وسريعة الاستجابة.",
        },
        bullets: [
          {
            en: "Shipment coordination, scheduling, and delivery follow-up",
            ar: "تنسيق الشحنات، الجدولة، والمتابعة بعد التسليم",
          },
          {
            en: "Vendor communication and operational status reporting",
            ar: "التواصل مع الموردين والتقارير التشغيلية عن الحالة",
          },
          {
            en: "Clear escalation paths when timing or routing changes",
            ar: "مسارات تصعيد واضحة عند تغيّر الوقت أو المسار",
          },
        ],
      },
      {
        title: {
          en: "Best fit for",
          ar: "الأنسب لـ",
        },
        body: {
          en: "Businesses that need practical coordination for transport, movement, and handoff processes.",
          ar: "الشركات التي تحتاج إلى تنسيق عملي لعمليات النقل والحركة والتسليم.",
        },
        bullets: [
          {
            en: "Distribution-focused businesses",
            ar: "الأعمال التي تركز على التوزيع",
          },
          {
            en: "Teams managing regional or cross-border movement",
            ar: "الفرق التي تدير الحركة الإقليمية أو عبر الحدود",
          },
          {
            en: "Operations where timing and accountability matter",
            ar: "العمليات التي يهم فيها التوقيت والمساءلة",
          },
        ],
      },
    ],
    nextStep: {
      en: "If you need a logistics workflow review, the portal can route your request to the right team.",
      ar: "إذا كنت تحتاج إلى مراجعة لسير العمل اللوجستي، يمكن للبوابة توجيه طلبك إلى الفريق المناسب.",
    },
  },
  recruitment: {
    summary: {
      en: "Recruitment support that pairs the right people with the right opportunities.",
      ar: "دعم توظيف يربط الأشخاص المناسبين بالفرص المناسبة.",
    },
    sections: [
      {
        title: {
          en: "What this service covers",
          ar: "ما تغطيه هذه الخدمة",
        },
        body: {
          en: "We help teams identify, screen, and progress candidates in a structured and reliable way.",
          ar: "نساعد الفرق على تحديد المرشحين وفرزهم وتحريكهم ضمن مسار منظم وموثوق.",
        },
        bullets: [
          {
            en: "Role scoping and candidate shortlisting",
            ar: "تحديد نطاق الدور واختيار المرشحين المختصرين",
          },
          {
            en: "Interview coordination and hiring workflow support",
            ar: "تنسيق المقابلات ودعم سير التوظيف",
          },
          {
            en: "Transparent handoff from sourcing to final decision",
            ar: "انتقال واضح من البحث عن المرشحين إلى القرار النهائي",
          },
        ],
      },
      {
        title: {
          en: "Best fit for",
          ar: "الأنسب لـ",
        },
        body: {
          en: "Organizations that need disciplined hiring support without losing speed or quality.",
          ar: "المنظمات التي تحتاج إلى دعم توظيف منضبط من دون خسارة السرعة أو الجودة.",
        },
        bullets: [
          {
            en: "Growing teams hiring for critical roles",
            ar: "الفرق النامية التي توظف لأدوار حاسمة",
          },
          {
            en: "Businesses that need a consistent screening process",
            ar: "الشركات التي تحتاج إلى عملية فرز متسقة",
          },
          {
            en: "Stakeholders who need clear communication during hiring",
            ar: "أصحاب المصلحة الذين يحتاجون إلى تواصل واضح أثناء التوظيف",
          },
        ],
      },
    ],
    nextStep: {
      en: "If you need hiring support, open the portal to route the request into the recruitment workflow.",
      ar: "إذا كنت تحتاج إلى دعم توظيف، افتح البوابة لتوجيه الطلب إلى سير التوظيف.",
    },
  },
  operations: {
    summary: {
      en: "Operational optimization that reduces friction, waste, and avoidable complexity.",
      ar: "تحسين تشغيلي يقلل الاحتكاك والهدر والتعقيد غير الضروري.",
    },
    sections: [
      {
        title: {
          en: "What this service covers",
          ar: "ما تغطيه هذه الخدمة",
        },
        body: {
          en: "We help identify where the workflow slows down and convert that into clearer, leaner operations.",
          ar: "نساعد على تحديد مواطن البطء في سير العمل وتحويلها إلى عمليات أوضح وأخف.",
        },
        bullets: [
          {
            en: "Workflow review and bottleneck mapping",
            ar: "مراجعة سير العمل ورصد نقاط الاختناق",
          },
          {
            en: "Process simplification and ownership clarity",
            ar: "تبسيط الإجراءات وتوضيح المسؤوليات",
          },
          {
            en: "Practical recommendations that can be executed quickly",
            ar: "توصيات عملية يمكن تنفيذها بسرعة",
          },
        ],
      },
      {
        title: {
          en: "Best fit for",
          ar: "الأنسب لـ",
        },
        body: {
          en: "Teams that want fewer manual steps, less duplication, and more consistent performance.",
          ar: "الفرق التي تريد خطوات يدوية أقل، وتكرارًا أقل، وأداءً أكثر اتساقًا.",
        },
        bullets: [
          {
            en: "Departments with repeated coordination overhead",
            ar: "الأقسام ذات العبء المتكرر في التنسيق",
          },
          {
            en: "Operations that need to scale without adding confusion",
            ar: "العمليات التي تحتاج إلى التوسع من دون زيادة الارتباك",
          },
          {
            en: "Organizations preparing for a process refresh",
            ar: "المنظمات التي تستعد لتحديث العمليات",
          },
        ],
      },
    ],
    nextStep: {
      en: "If you want an operations review, use the portal or contact page to start the discussion.",
      ar: "إذا أردت مراجعة تشغيلية، استخدم البوابة أو صفحة التواصل لبدء النقاش.",
    },
  },
};

export function getServiceBySlug(slug: string) {
  return SERVICES.find((service) => service.slug === slug) ?? null;
}

export function getServiceDetail(key: ServiceKey) {
  return SERVICE_DETAILS[key];
}
