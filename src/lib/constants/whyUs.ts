export type WhyUsIcon = "target" | "bolt" | "handshake";

export interface WhyUsItem {
  key: string;
  icon: WhyUsIcon;
  /** Numeric value the counter animates up to. */
  statValue: number;
  /** Prefix/suffix rendered around the animated number, e.g. "+", "%", "x". */
  statSuffix?: string;
  statPrefix?: string;
}

export const WHY_US_ITEMS: WhyUsItem[] = [
  {
    key: "expertise",
    icon: "target",
    statValue: 10,
    statSuffix: "+",
  },
  {
    key: "execution",
    icon: "bolt",
    statValue: 48,
    statSuffix: "h",
  },
  {
    key: "tailored",
    icon: "handshake",
    statValue: 100,
    statSuffix: "%",
  },
];
