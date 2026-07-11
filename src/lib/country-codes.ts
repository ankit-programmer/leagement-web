/**
 * Curated dial codes for the WhatsApp coach phone field — most users don't
 * know their country code. India leads (the audience today); the rest cover
 * the likely diaspora/friends spread. Stored phone stays digits-only with the
 * dial code prefixed (API contract unchanged).
 */
export interface CountryCode {
  name: string;
  flag: string;
  dial: string; // digits only, no +
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: "India", flag: "🇮🇳", dial: "91" },
  { name: "United States / Canada", flag: "🇺🇸", dial: "1" },
  { name: "United Kingdom", flag: "🇬🇧", dial: "44" },
  { name: "United Arab Emirates", flag: "🇦🇪", dial: "971" },
  { name: "Singapore", flag: "🇸🇬", dial: "65" },
  { name: "Australia", flag: "🇦🇺", dial: "61" },
  { name: "Nepal", flag: "🇳🇵", dial: "977" },
  { name: "Bangladesh", flag: "🇧🇩", dial: "880" },
  { name: "Sri Lanka", flag: "🇱🇰", dial: "94" },
  { name: "Pakistan", flag: "🇵🇰", dial: "92" },
  { name: "Saudi Arabia", flag: "🇸🇦", dial: "966" },
  { name: "Qatar", flag: "🇶🇦", dial: "974" },
  { name: "Kuwait", flag: "🇰🇼", dial: "965" },
  { name: "Oman", flag: "🇴🇲", dial: "968" },
  { name: "Bahrain", flag: "🇧🇭", dial: "973" },
  { name: "Malaysia", flag: "🇲🇾", dial: "60" },
  { name: "Indonesia", flag: "🇮🇩", dial: "62" },
  { name: "Philippines", flag: "🇵🇭", dial: "63" },
  { name: "Thailand", flag: "🇹🇭", dial: "66" },
  { name: "Vietnam", flag: "🇻🇳", dial: "84" },
  { name: "Japan", flag: "🇯🇵", dial: "81" },
  { name: "South Korea", flag: "🇰🇷", dial: "82" },
  { name: "China", flag: "🇨🇳", dial: "86" },
  { name: "Germany", flag: "🇩🇪", dial: "49" },
  { name: "France", flag: "🇫🇷", dial: "33" },
  { name: "Italy", flag: "🇮🇹", dial: "39" },
  { name: "Spain", flag: "🇪🇸", dial: "34" },
  { name: "Netherlands", flag: "🇳🇱", dial: "31" },
  { name: "Ireland", flag: "🇮🇪", dial: "353" },
  { name: "Brazil", flag: "🇧🇷", dial: "55" },
  { name: "Mexico", flag: "🇲🇽", dial: "52" },
  { name: "South Africa", flag: "🇿🇦", dial: "27" },
  { name: "Nigeria", flag: "🇳🇬", dial: "234" },
  { name: "Egypt", flag: "🇪🇬", dial: "20" },
  { name: "New Zealand", flag: "🇳🇿", dial: "64" },
];

/** Split a stored digits-only phone into dial code + national number by
 *  longest-prefix match; unknown prefixes fall back to India + raw digits. */
export function splitPhone(digits: string | null | undefined): { dial: string; national: string } {
  const cleaned = (digits ?? "").replace(/\D/g, "");
  if (!cleaned) return { dial: "91", national: "" };
  const match = [...COUNTRY_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((country) => cleaned.startsWith(country.dial) && cleaned.length > country.dial.length + 5);
  if (match) return { dial: match.dial, national: cleaned.slice(match.dial.length) };
  return { dial: "91", national: cleaned };
}
