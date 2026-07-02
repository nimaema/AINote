// Maps AssemblyAI language codes to friendly display names. Falls back to a
// title-cased version of whatever code we were given.
const NAMES: Record<string, string> = {
  en: "English",
  en_us: "English (US)",
  en_uk: "English (UK)",
  en_au: "English (AU)",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  fi: "Finnish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  pl: "Polish",
  ru: "Russian",
  uk: "Ukrainian",
  tr: "Turkish",
  ar: "Arabic",
  fa: "Persian",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  vi: "Vietnamese",
  id: "Indonesian",
  th: "Thai",
  he: "Hebrew",
  el: "Greek",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
};

export function languageName(code?: string | null): string | null {
  if (!code) return null;
  const key = code.toLowerCase().replace(/-/g, "_");
  if (NAMES[key]) return NAMES[key];
  const base = key.split("_")[0];
  if (NAMES[base]) return NAMES[base];
  return base.length <= 3
    ? base.toUpperCase()
    : base.charAt(0).toUpperCase() + base.slice(1);
}
