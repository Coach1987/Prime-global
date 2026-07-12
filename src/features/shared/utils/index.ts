import type { ApiResponse } from "../types";

export function createApiPlaceholder<TData = unknown>(
  message: string,
  data?: TData
): ApiResponse<TData> {
  return {
    success: false,
    data,
    error: {
      code: "NOT_IMPLEMENTED",
      message,
    },
  };
}
