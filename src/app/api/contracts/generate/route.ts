import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateContractSchema } from "@/features/employers/schemas/contracts";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const CONTRACT_BUCKET = "signed-contracts";

async function createContractPdf(input: {
  employerName: string;
  candidateName: string;
  title: string;
  compensation?: number | null;
  currency?: string | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Prime Global Employment Contract", {
    x: 50,
    y: 780,
    size: 22,
    font: boldFont,
    color: rgb(0.79, 0.64, 0.29),
  });

  const lines = [
    `Employer: ${input.employerName}`,
    `Candidate: ${input.candidateName}`,
    `Role: ${input.title}`,
    `Compensation: ${input.compensation ?? "N/A"} ${input.currency ?? "USD"}`,
    "",
    "This contract is generated electronically by Prime Global.",
    "Both parties confirm agreement through digital signature.",
  ];

  let y = 735;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0.1, 0.12, 0.16),
    });
    y -= 24;
  }

  return Buffer.from(await pdf.save());
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "contracts-generate", 50);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, generateContractSchema);
  if (parsed.error) return parsed.error;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: offer, error: offerError } = await supabase
    .from("job_offers")
    .select("id, title, compensation, currency, candidate_id, employers!inner(company_name), candidate_public_profiles!inner(candidate_reference)")
    .eq("id", parsed.data.offerId)
    .eq("employer_id", employer.id)
    .single();

  if (offerError || !offer) {
    return NextResponse.json(
      { success: false, error: { code: "OFFER_NOT_FOUND", message: offerError?.message ?? "Offer not found" } },
      { status: 404 }
    );
  }

  const employerDetails = Array.isArray(offer.employers) ? offer.employers[0] : offer.employers;
  const candidateDetails = Array.isArray(offer.candidate_public_profiles)
    ? offer.candidate_public_profiles[0]
    : offer.candidate_public_profiles;

  const contractBuffer = await createContractPdf({
    employerName: String(employerDetails?.company_name ?? "Prime Global Employer"),
    candidateName: String(candidateDetails?.candidate_reference ?? "PG Candidate"),
    title: offer.title,
    compensation: offer.compensation,
    currency: offer.currency,
  });

  const storagePath = `${auth.userId}/${offer.id}/contract-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_BUCKET)
    .upload(storagePath, contractBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { success: false, error: { code: "CONTRACT_UPLOAD_FAILED", message: uploadError.message } },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("employment_contracts")
    .insert({
      offer_id: offer.id,
      employer_id: employer.id,
      candidate_id: offer.candidate_id,
      contract_storage_path: storagePath,
      status: "sent",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CONTRACT_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
