export interface FAQItem {
  key: string;
}

/**
 * Question/answer text lives in messages/en.json and messages/ar.json
 * under faq.items.<key>. Content here is grounded in what the brochure
 * actually states (services offered, location, contact channels) —
 * no invented pricing, SLAs, or policy specifics.
 */
export const FAQ_ITEMS: FAQItem[] = [
  { key: "whoWeAre" },
  { key: "servicesOffered" },
  { key: "location" },
  { key: "getStarted" },
  { key: "industriesServed" },
  { key: "contactMethods" },
];
