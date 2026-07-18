export function resolveAuthorityLevelValue({
  baseLevelValue,
  customLevelValue,
}: {
  baseLevelValue: number | null;
  customLevelValue: number | null;
}) {
  if (typeof customLevelValue === "number") return customLevelValue;
  if (typeof baseLevelValue === "number") return baseLevelValue;
  return 0;
}

export function hasRequiredAuthority({
  actorLevel,
  minimumLevel,
}: {
  actorLevel: number;
  minimumLevel: number;
}) {
  return actorLevel >= minimumLevel;
}

export function withinMonetaryAuthority({
  amount,
  currencyCode,
  actorCurrency,
  maximumApprovalAmount,
  isUnlimited,
}: {
  amount: number | null;
  currencyCode: string | null;
  actorCurrency: string | null;
  maximumApprovalAmount: number | null;
  isUnlimited: boolean;
}) {
  if (amount === null || amount === undefined) {
    return { allowed: true, reason: "no_amount" as const };
  }

  if (isUnlimited) {
    return { allowed: true, reason: "unlimited" as const };
  }

  if (!actorCurrency || !currencyCode || actorCurrency.toUpperCase() !== currencyCode.toUpperCase()) {
    return { allowed: false, reason: "currency_mismatch" as const };
  }

  if (maximumApprovalAmount === null || maximumApprovalAmount === undefined) {
    return { allowed: false, reason: "no_limit_configured" as const };
  }

  return {
    allowed: amount <= maximumApprovalAmount,
    reason: amount <= maximumApprovalAmount ? ("within_limit" as const) : ("exceeds_limit" as const),
  };
}
