import test from "node:test";
import assert from "node:assert/strict";

import { z } from "zod";

import {
  buildCompanyVerificationRequestRow,
  buildEmployerProfileCreateRow,
  mapZodFieldErrors,
} from "./employer-portal.ts";

test("buildEmployerProfileCreateRow creates a pending employer row bound to auth user", () => {
  const row = buildEmployerProfileCreateRow("auth-1", {
    companyName: "Prime Global",
    commercialRegistrationNumber: "CR-1",
    taxNumber: "TX-1",
    country: "Tunisia",
    city: "Tunis",
    address: "123 Avenue",
    website: "https://primeglobal.pro",
    companyEmail: "company@primeglobal.pro",
    hrContact: "HR Lead",
    phoneNumber: "+21612345678",
    industry: "Technology",
    companySize: "11-50",
    companyDescription: "A sufficiently long company description for validation.",
  });

  assert.equal(row.auth_user_id, "auth-1");
  assert.equal(row.company_name, "Prime Global");
  assert.equal(row.commercial_registration_number, "CR-1");
  assert.equal(row.verification_status, "pending");
});

test("buildCompanyVerificationRequestRow maps camelCase payload to snake_case columns", () => {
  const row = buildCompanyVerificationRequestRow("employer-1", {
    companyName: "Prime Global",
    commercialRegistrationNumber: "CR-1",
    taxNumber: "TX-1",
    country: "Tunisia",
    address: "123 Avenue",
    officialEmail: "company@primeglobal.pro",
    website: "https://primeglobal.pro",
    phoneNumber: "+21612345678",
    responsiblePerson: "HR Lead",
  });

  assert.equal(row.employer_id, "employer-1");
  assert.equal(row.company_name, "Prime Global");
  assert.equal(row.official_email, "company@primeglobal.pro");
  assert.equal(row.responsible_person, "HR Lead");
  assert.equal(row.status, "pending");
  assert.equal("companyName" in row, false);
});

test("mapZodFieldErrors keeps the first message per field", () => {
  const schema = z.object({
    companyName: z.string().min(2),
    officialEmail: z.string().email(),
  });
  const result = schema.safeParse({ companyName: "", officialEmail: "bad" });

  assert.equal(result.success, false);
  const fieldErrors = mapZodFieldErrors(result.error);

  assert.match(String(fieldErrors.companyName), /at least 2/i);
  assert.match(String(fieldErrors.officialEmail), /email/i);
});