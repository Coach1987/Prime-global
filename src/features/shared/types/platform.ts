export type ApplicantStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interview"
  | "rejected"
  | "hired";

export type UserRole =
  | "guest"
  | "applicant"
  | "staff"
  | "manager"
  | "admin"
  | "super_admin";

export interface UploadedDocumentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedAtIso: string;
}

export interface CareerApplication {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  position: string;
  status: ApplicantStatus;
  documents: UploadedDocumentMetadata[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  createdAtIso: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
  };
}

export interface DashboardStatistics {
  totalApplicants: number;
  newApplicantsToday: number;
  openRoles: number;
  contactRequests: number;
}
