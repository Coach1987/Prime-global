export type ServiceIcon = "briefcase" | "truck" | "users" | "gears";

export interface ServiceItem {
  slug: string;
  icon: ServiceIcon;
  key: string;
}

export const SERVICES: ServiceItem[] = [
  {
    slug: "business-administration",
    icon: "briefcase",
    key: "businessAdmin",
  },
  {
    slug: "logistics-support",
    icon: "truck",
    key: "logistics",
  },
  {
    slug: "recruitment",
    icon: "users",
    key: "recruitment",
  },
  {
    slug: "operational-optimization",
    icon: "gears",
    key: "operations",
  },
];
