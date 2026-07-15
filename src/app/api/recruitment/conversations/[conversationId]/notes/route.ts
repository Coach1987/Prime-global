import { NextResponse } from "next/server";
import { recruitmentInternalNoteSchema } from "@/features/recruitment/schemas/supervised";
import { addInternalNote, listInternalNotes, toHttpError } from "@/lib/server/recruitment/service";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-notes-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  try {
    const { conversationId } = await params;
    const data = await listInternalNotes(auth, conversationId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load internal notes");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERNAL_NOTES_LOAD_FAILED", message: normalized.message } }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-notes-post", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentInternalNoteSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await addInternalNote(auth, conversationId, parsed.data.note);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to create internal note");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERNAL_NOTE_CREATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}