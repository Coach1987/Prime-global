export interface TestimonialItem {
  key: string;
  /** Initials shown in the avatar circle (no photo available). */
  initials: string;
  rating: number;
}

/**
 * PLACEHOLDER CONTENT — the source brochure contains no client testimonials,
 * names, or companies. These entries exist to demonstrate the section's
 * layout and Swiper behavior only. Replace with real client quotes (and
 * real names/roles/companies, with permission) before shipping.
 */
export const TESTIMONIALS: TestimonialItem[] = [
  { key: "client1", initials: "A.B.", rating: 5 },
  { key: "client2", initials: "M.K.", rating: 5 },
  { key: "client3", initials: "S.T.", rating: 5 },
  { key: "client4", initials: "R.H.", rating: 4 },
];
