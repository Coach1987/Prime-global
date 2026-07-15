export interface JobAlertTemplateInput {
  locale: "en" | "ar";
  candidateName?: string;
  jobTitle: string;
  companyDisplayName: string;
  generalLocation: string;
  shortSummary: string;
  matchReason: string;
  secureJobUrl: string;
  unsubscribeUrl: string;
}

export function buildJobAlertEmail(input: JobAlertTemplateInput) {
  if (input.locale === "ar") {
    const subject = "فرصة عمل جديدة كمدرب لياقة تتوافق مع ملفك";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10243f;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 12px">فرصة عمل جديدة تتوافق مع ملفك</h2>
        <p>الوظيفة: <strong>${input.jobTitle}</strong></p>
        <p>الشركة: <strong>${input.companyDisplayName}</strong></p>
        <p>الموقع: <strong>${input.generalLocation}</strong></p>
        <p>${input.shortSummary}</p>
        <p><strong>سبب التوافق:</strong> ${input.matchReason}</p>
        <p><a href="${input.secureJobUrl}" style="display:inline-block;background:#c8a24a;color:#081220;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:700">عرض الوظيفة</a></p>
        <p style="font-size:12px;color:#4b5e79">لحماية خصوصيتك، يجب تسجيل الدخول قبل متابعة التقديم.</p>
        <p style="font-size:12px"><a href="${input.unsubscribeUrl}">إلغاء الاشتراك من تنبيهات الوظائف</a></p>
      </div>
    `;

    return { subject, html };
  }

  const subject = "New Fitness Trainer Opportunity Matching Your Profile";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10243f;max-width:640px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 12px">New Job Opportunity Matching Your Profile</h2>
      <p>Role: <strong>${input.jobTitle}</strong></p>
      <p>Company: <strong>${input.companyDisplayName}</strong></p>
      <p>Location: <strong>${input.generalLocation}</strong></p>
      <p>${input.shortSummary}</p>
      <p><strong>Match reason:</strong> ${input.matchReason}</p>
      <p><a href="${input.secureJobUrl}" style="display:inline-block;background:#c8a24a;color:#081220;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:700">View job</a></p>
      <p style="font-size:12px;color:#4b5e79">For privacy and security, login is required before submitting an application.</p>
      <p style="font-size:12px"><a href="${input.unsubscribeUrl}">Unsubscribe from job alerts</a></p>
    </div>
  `;

  return { subject, html };
}
