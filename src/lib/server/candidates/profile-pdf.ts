import { PDFDocument, StandardFonts } from "pdf-lib";

const URL_PATTERN = /https?:\/\/\S+/gi;
const CONTACT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\d\s().-]{6,}\d)|(?:wa\.me\/[\w/-]+|whatsapp\S+)|(?:t\.me\/[\w/-]+|telegram\S+)|(?:@\w{3,}|linkedin\.com\/[\w./-]+|facebook\.com\/[\w./-]+|instagram\.com\/[\w./-]+))/gi;

function sanitizeLine(value: string) {
  return value.replace(URL_PATTERN, "[redacted-link]").replace(CONTACT_PATTERN, "[redacted-contact]").trim();
}

function flattenList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return sanitizeLine(entry);
      if (entry && typeof entry === "object") {
        return sanitizeLine(
          Object.values(entry as Record<string, unknown>)
            .map((item) => String(item ?? ""))
            .join(" | ")
        );
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 12);
}

export async function generateSanitizedCandidateProfilePdf(input: {
  candidateReference: string;
  professionalTitle: string | null;
  professionalSummary: string | null;
  yearsOfExperience: number | null;
  skills: unknown;
  employmentHistory: unknown;
  education: unknown;
  certifications: unknown;
  languages: unknown;
  generalLocation: string | null;
  availability: string | null;
  desiredRole: string | null;
  aiSummary: string | null;
  primeGlobalVerificationStatus: string | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.setFont(font);

  let y = 800;
  const left = 40;

  const writeHeading = (text: string) => {
    page.drawText(text, { x: left, y, size: 14, font: bold });
    y -= 22;
  };

  const writeLine = (text: string) => {
    const line = sanitizeLine(text);
    if (!line) return;
    page.drawText(line.slice(0, 110), { x: left, y, size: 10, font });
    y -= 16;
  };

  const writeList = (title: string, values: string[]) => {
    writeHeading(title);
    if (values.length === 0) {
      writeLine("-");
      return;
    }
    for (const value of values) {
      writeLine(`- ${value}`);
      if (y < 60) break;
    }
  };

  writeHeading("Prime Global Candidate Profile");
  writeLine(`Reference: ${input.candidateReference}`);
  writeLine(`Verification: ${input.primeGlobalVerificationStatus ?? "verified"}`);
  writeLine(`Professional title: ${input.professionalTitle ?? "-"}`);
  writeLine(`General location: ${input.generalLocation ?? "-"}`);
  writeLine(`Availability: ${input.availability ?? "-"}`);
  writeLine(`Desired role: ${input.desiredRole ?? "-"}`);
  writeLine(`Years of experience: ${input.yearsOfExperience ?? "-"}`);

  y -= 8;
  writeHeading("Professional Summary");
  writeLine(input.professionalSummary ?? "-");

  y -= 8;
  writeList("Skills", flattenList(input.skills));
  y -= 4;
  writeList("Experience", flattenList(input.employmentHistory));
  y -= 4;
  writeList("Education", flattenList(input.education));
  y -= 4;
  writeList("Certifications", flattenList(input.certifications));
  y -= 4;
  writeList("Languages", flattenList(input.languages));

  y -= 8;
  writeHeading("AI Job-Fit Summary");
  writeLine(input.aiSummary ?? "-");

  return pdf.save();
}
