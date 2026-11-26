const ONES = ["", "бир", "эки", "үч", "төрт", "беш", "алты", "жети", "сегиз", "тогуз"];
const TENS = ["", "он", "жыйырма", "отуз", "кырк", "элүү", "алтымыш", "жетимиш", "сексен", "токсон"];
const SCALES = [
  { value: 1e9, word: "миллиард" },
  { value: 1e6, word: "миллион" },
  { value: 1e3, word: "миң" },
];

/** 1–999 in words; a lone hundred is "жүз", not "бир жүз". */
function belowThousand(number) {
  const hundreds = Math.floor(number / 100);
  const rest = number % 100;
  return [
    hundreds ? (hundreds === 1 ? "жүз" : `${ONES[hundreds]} жүз`) : "",
    TENS[Math.floor(rest / 10)],
    ONES[rest % 10],
  ]
    .filter(Boolean)
    .join(" ");
}

function integerInWords(number) {
  if (number === 0) {
    return "нөл";
  }

  const words = [];
  let rest = number;
  for (const { value, word } of SCALES) {
    const count = Math.floor(rest / value);
    if (count) {
      // "миң сом", but "бир миллион сом".
      words.push(count === 1 && value === 1e3 ? word : `${belowThousand(count)} ${word}`);
      rest %= value;
    }
  }
  if (rest) {
    words.push(belowThousand(rest));
  }
  return words.join(" ");
}

/** 5000 → "беш миң сом", 90.5 → "токсон сом элүү тыйын". */
function amountInWords(amount) {
  const cents = Math.round(Number(amount) * 100);
  const som = Math.floor(cents / 100);
  const tyiyn = cents % 100;
  const words = `${integerInWords(som)} сом`;
  return tyiyn ? `${words} ${integerInWords(tyiyn)} тыйын` : words;
}

/** 8200 → "8 200 (сегиз миң эки жүз) сом"; with tyiyn the words name both units. */
function amountWithWords(amount) {
  const cents = Math.round(Number(amount) * 100);
  if (cents % 100 === 0) {
    return `${formatMoney(amount)} (${integerInWords(cents / 100)}) сом`;
  }
  return `${formatMoney(amount)} (${amountInWords(amount)})`;
}

/** 1234567.5 → "1 234 567,50"; whole sums have no decimals. */
function formatMoney(amount) {
  const value = Number(amount) || 0;
  const [whole, fraction] = value.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fraction === "00" ? grouped : `${grouped},${fraction}`;
}

module.exports = { amountInWords, amountWithWords, formatMoney };
