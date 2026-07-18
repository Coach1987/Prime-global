import { z } from "zod";

const nameSchema = z.string().trim().min(2).max(180);
const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);

export const createAuthorityLevelSchema = z.object({
  organizationId: z.string().uuid(),
  name: nameSchema,
  code: codeSchema,
  levelValue: z.number().int().min(0).max(1000),
});

export const assignEmployeeAuthoritySchema = z.object({
  authorityLevelId: z.string().uuid(),
  customLevelValue: z.number().int().min(0).max(1000).optional(),
});

export const upsertEmployeeMonetaryAuthoritySchema = z.object({
  currencyCode: z.string().trim().min(3).max(10).transform((v) => v.toUpperCase()),
  maximumApprovalAmount: z.number().nonnegative().max(1_000_000_000).optional(),
  isUnlimited: z.boolean().default(false),
});

export const createApprovalOperationSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
});

export const createApprovalPolicySchema = z.object({
  organizationId: z.string().uuid(),
  operationId: z.string().uuid(),
  minAuthorityLevel: z.number().int().min(0).max(1000),
  requiredPermissionId: z.string().uuid().optional(),
  scopeRequired: z.boolean().default(false),
});

export const createScopeDimensionSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
});

export const createScopeNodeSchema = z.object({
  organizationId: z.string().uuid(),
  dimensionId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  parentScopeNodeId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const assignEmployeeScopeSchema = z.object({
  scopeNodeId: z.string().uuid(),
});

export const createDelegationSchema = z.object({
  organizationId: z.string().uuid(),
  delegatorEmployeeId: z.string().uuid(),
  delegateEmployeeId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["draft", "active", "expired", "revoked"]).default("draft"),
  notes: z.string().trim().max(2000).optional(),
  operationIds: z.array(z.string().uuid()).default([]),
});

export const evaluateGovernanceInputSchema = z.object({
  operationCode: z.string().trim().min(2).max(160),
  permissionCode: z.string().trim().min(2).max(160),
  scopeNodeId: z.string().uuid().optional(),
  amount: z.number().nonnegative().optional(),
  currencyCode: z.string().trim().min(3).max(10).optional(),
  at: z.string().datetime().optional(),
});
