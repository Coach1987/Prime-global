export const PLATFORM_MODULES = [
  "careers",
  "dashboard",
  "client-portal",
  "ai",
  "blog",
  "admin",
] as const;

export type PlatformModule = (typeof PLATFORM_MODULES)[number];
