const { COLLEGE_TIME_ZONE, formatSignerName } = require("./signatureStamp");

// Kyrgyz suffix vowel by the last vowel of the word: back а/о, front е/ө.
const SUFFIX_VOWEL = {
  а: "а", ы: "а", у: "а", я: "а", ю: "а",
  о: "о", ё: "о",
  е: "е", э: "е", и: "е",
  ө: "ө", ү: "ө",
};
const VOICELESS = new Set([..."кпстфхцчшщ"]);
// "уулу" / "кызы" already end in the possessive suffix, so the case ending takes "н".
const POSSESSIVE_ENDINGS = /(уулу|кызы)$/i;

const REQUEST_HEADINGS = {
  "Кызматтык кат": "КЫЗМАТТЫК КАТ",
};
const DEFAULT_HEADING = "АРЫЗ";

function splitLastWord(text) {
  const value = String(text || "").trim();
  const index = value.lastIndexOf(" ");
  return [value.slice(0, index + 1), value.slice(index + 1)];
}

function getSuffixVowel(word) {
  const letters = [...word.toLowerCase()].reverse();
  const vowel = letters.find((letter) => SUFFIX_VOWEL[letter]);
  return vowel ? SUFFIX_VOWEL[vowel] : "";
}

/** Adds a case ending to the last word, or leaves the text as it is when the word is not Kyrgyz Cyrillic. */
function addCaseEnding(text, buildEnding) {
  const [head, word] = splitLastWord(text);
  const vowel = getSuffixVowel(word);
  if (!word || !vowel) {
    return String(text || "").trim();
  }
  const lastLetter = word.slice(-1).toLowerCase();
  return `${head}${word}${buildEnding({ word, vowel, lastLetter })}`;
}

/** "К.Р. Дуйшенов" → "К.Р. Дуйшеновго" (кимге?). */
function toDative(text) {
  return addCaseEnding(text, ({ word, vowel, lastLetter }) => {
    if (POSSESSIVE_ENDINGS.test(word)) {
      return `н${vowel}`;
    }
    return `${VOICELESS.has(lastLetter) ? "к" : "г"}${vowel}`;
  });
}

/** "Б. Бактыбек уулу" → "Б. Бактыбек уулунан" (кимден?). */
function toAblative(text) {
  return addCaseEnding(text, ({ word, vowel, lastLetter }) => {
    if (POSSESSIVE_ENDINGS.test(word)) {
      return `н${vowel}н`;
    }
    return `${VOICELESS.has(lastLetter) ? "т" : "д"}${vowel}н`;
  });
}

/** Title in the middle of the letter: "АРЫЗ", or "КЫЗМАТТЫК КАТ" for a service letter. */
function getRequestHeading(type) {
  return REQUEST_HEADINGS[String(type || "").trim()] || DEFAULT_HEADING;
}

/** "№1/12" and the creation time → "№ 1/12 · 25.11.2026". */
function formatNumberAndDate(documentNumber, createdAt) {
  const date = createdAt
    ? new Date(createdAt).toLocaleDateString("ru-RU", { timeZone: COLLEGE_TIME_ZONE })
    : "";
  const number = String(documentNumber || "").trim().replace(/^№\s*/, "№ ");
  return [number, date].filter(Boolean).join(" · ");
}

/** "2026-11-25", "2026-11-27" → "25.11.2026 – 27.11.2026"; one day is shown once. */
function formatPeriod(startDate, endDate) {
  const toLocal = (value) => String(value || "").split("-").reverse().join(".");
  const start = toLocal(startDate);
  const end = toLocal(endDate);
  return !end || end === start ? start : `${start} – ${end}`;
}

/** Right-hand block under the letterhead: to the director, from the author. */
function buildAddressLines({ director, author }) {
  const directorName = formatSignerName(director?.fullName);
  const authorName = formatSignerName(author?.fullName);
  return [
    ...(directorName ? ["ТАКтын директору", toDative(directorName)] : ["ТАКтын директоруна"]),
    ...(author?.position ? [String(author.position).trim()] : []),
    ...(authorName ? [toAblative(authorName)] : []),
  ];
}

module.exports = {
  buildAddressLines,
  formatNumberAndDate,
  formatPeriod,
  getRequestHeading,
  toAblative,
  toDative,
};
