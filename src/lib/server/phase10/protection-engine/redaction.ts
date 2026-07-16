import type { PGPEProtectionAction, PGPEProtectionSignalType } from "./types.ts";

export interface RedactionEngine {
  selectAction(signalType: PGPEProtectionSignalType): PGPEProtectionAction;
}

const REDACTION_ACTIONS: Record<PGPEProtectionSignalType, PGPEProtectionAction> = {
  email: "mask",
  phone: "mask",
  qr: "remove_from_employer_copy",
  url: "convert_to_protected_placeholder",
  hidden_metadata: "remove_from_employer_copy",
  ocr_text: "protected_copy",
  document_text: "protected_copy",
  private_attachment: "protected_copy",
};

export function createRedactionEngine(): RedactionEngine {
  return {
    selectAction(signalType) {
      return REDACTION_ACTIONS[signalType] ?? "none";
    },
  };
}

export { REDACTION_ACTIONS as PGPE_DEFAULT_REDACTION_ACTIONS };
