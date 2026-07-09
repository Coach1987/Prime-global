export const CONTACT_INFO = {
  whatsappNumber: "0021628634007",
  /** E.164-ish digits only, for the wa.me link (no leading +). */
  whatsappDigits: "21628634007",
  email: "info@primeglobal.tn",
  website: "www.primeglobal.tn",
  location: "Sousse, Tunisia",
  /**
   * Approximate coordinates for Sousse, Tunisia — the brochure gives no
   * exact address, only the city. Replace with the precise office
   * location (and a real Google Place ID / embed URL) once known.
   */
  mapCenter: { lat: 35.8256, lng: 10.6084 },
} as const;

export const WHATSAPP_LINK = `https://wa.me/${CONTACT_INFO.whatsappDigits}`;
export const EMAIL_LINK = `mailto:${CONTACT_INFO.email}`;
export const WEBSITE_LINK = `https://${CONTACT_INFO.website}`;
