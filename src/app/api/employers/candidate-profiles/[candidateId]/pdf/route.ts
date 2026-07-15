import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";
import { EMPLOYER_CANDIDATE_PROFILE_SELECT } from "@/lib/server/candidates/employer-profile";
import { generateSanitizedCandidateProfilePdf } from "@/lib/server/candidates/profile-pdf";

export async function GET(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "employer-candidate-profile-pdf-get", 40);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  if (auth.role === "employer") {
    const employer = await getEmployerByAuthUserId(auth.userId);
    if (!employer) {
      return NextResponse.json(
        { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
        { status: 404 }
      );
    }
  }

  const { candidateId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_public_profiles_employer_view")
    .select(EMPLOYER_CANDIDATE_PROFILE_SELECT)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILE_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "PROFILE_NOT_FOUND", message: "Candidate profile not found" } },
      { status: 404 }
    );
  }

  const pdfBytes = await generateSanitizedCandidateProfilePdf({
    candidateReference: String(data.candidate_reference ?? "PG Candidate"),
    professionalTitle: (data.professional_title as string | null) ?? null,
    professionalSummary: (data.professional_summary as string | null) ?? null,
    yearsOfExperience: (data.years_of_experience as number | null) ?? null,
    skills: data.skills,
    employmentHistory: data.employment_history,
    education: data.education,
    certifications: data.certifications,
    languages: data.languages,
    generalLocation: (data.general_location as string | null) ?? null,
    availability: (data.availability as string | null) ?? null,
    desiredRole: (data.desired_role as string | null) ?? null,
    aiSummary: (data.ai_summary as string | null) ?? null,
    primeGlobalVerificationStatus: (data.prime_global_verification_status as string | null) ?? null,
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.candidate_profile_pdf.generated",
    targetType: "candidate_public_profile",
    targetId: candidateId,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=prime-global-candidate-profile-${String(data.candidate_reference ?? candidateId)}.pdf`,
      "Cache-Control": "no-store",
    },
  });
}
