import { z } from "zod";

const nameSchema = z.string().trim().min(2).max(180);
const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);

export const listByOrganizationQuerySchema = z.object({
  organizationId: z.string().uuid(),
});

export const createOrganizationSchema = z.object({
  legalName: nameSchema,
  displayName: nameSchema,
  code: codeSchema,
  employerId: z.string().uuid().optional(),
});

export const createDivisionSchema = z.object({
  organizationId: z.string().uuid(),
  name: nameSchema,
  code: codeSchema,
});

export const createDepartmentSchema = z.object({
  organizationId: z.string().uuid(),
  divisionId: z.string().uuid(),
  name: nameSchema,
  code: codeSchema,
});

export const createTeamSchema = z.object({
  organizationId: z.string().uuid(),
  departmentId: z.string().uuid(),
  name: nameSchema,
  code: codeSchema,
});

export const createPositionSchema = z.object({
  organizationId: z.string().uuid(),
  departmentId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  title: nameSchema,
  code: codeSchema,
});

export const createEmployeeSchema = z.object({
  organizationId: z.string().uuid(),
  employeeNumber: z.string().trim().min(2).max(80),
  fullName: nameSchema,
  email: z.string().trim().email().max(320),
  positionId: z.string().uuid(),
  managerEmployeeId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const createRoleSchema = z.object({
  organizationId: z.string().uuid(),
  name: nameSchema,
  code: codeSchema,
  description: z.string().trim().max(1000).optional(),
  isSystem: z.boolean().default(false),
});

export const createPermissionSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export const assignPermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

export const evaluatePermissionSchema = z.object({
  permissionCode: z.string().trim().min(2).max(160),
});

export const bootstrapCorporateGovernanceSchema = z.object({
  organizationId: z.string().uuid(),
});

export const upsertGovernanceControlsSchema = z.object({
  organizationId: z.string().uuid(),
  ownerEmployeeId: z.string().uuid(),
  ceoEmployeeId: z.string().uuid().optional(),
  ownerRoleId: z.string().uuid().optional(),
  ceoRoleId: z.string().uuid().optional(),
  immutableOwnerAccount: z.boolean().default(true),
  protectCeoAccount: z.boolean().default(true),
  emergencyRecoveryEnabled: z.boolean().default(true),
});
