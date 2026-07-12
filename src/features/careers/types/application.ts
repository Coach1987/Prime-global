export interface CareerApplicationDraft {
  firstName: string;
  lastName: string;
  nationality: string;
  country: string;
  currentLocation: string;
  phone: string;
  whatsapp: string;
  email: string;
  desiredPosition: string;
  yearsOfExperience: string;
  education: string;
  languages: string;
  currentEmployer?: string;
  expectedSalary?: string;
  availableFrom: string;
  coverLetter?: string;
  acceptedTerms: boolean;
}

export type UploadType = "pdf" | "doc" | "docx";

export interface UploadValidationRule {
  maxFileSizeMb: number;
  acceptedMimeTypes: string[];
}

export interface UploadPreview {
  name: string;
  sizeLabel: string;
  typeLabel: UploadType | "other";
}