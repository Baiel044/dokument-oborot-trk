const test = require("node:test");
const assert = require("node:assert/strict");
const {
  toDative,
  toAblative,
  getRequestHeading,
  formatNumberAndDate,
  formatPeriod,
  buildAddressLines,
} = require("../src/utils/requestLetter");

test("dative suffix follows Kyrgyz vowel harmony and the last sound", () => {
  assert.equal(toDative("К.Р. Дуйшенов"), "К.Р. Дуйшеновго");
  assert.equal(toDative("К.Б. Асанова"), "К.Б. Асановага");
  assert.equal(toDative("А. Мамыт"), "А. Мамытка");
  assert.equal(toDative("Б. Эшимкул"), "Б. Эшимкулга");
  assert.equal(toDative("А. Үсөнбек"), "А. Үсөнбекке");
  assert.equal(toDative("Б. Бактыбек уулу"), "Б. Бактыбек уулуна");
});

test("ablative suffix follows Kyrgyz vowel harmony and the last sound", () => {
  assert.equal(toAblative("Б. Бактыбек уулу"), "Б. Бактыбек уулунан");
  assert.equal(toAblative("А. Асан кызы"), "А. Асан кызынан");
  assert.equal(toAblative("К.Р. Дуйшенов"), "К.Р. Дуйшеновдон");
  assert.equal(toAblative("К.Б. Асанова"), "К.Б. Асановадан");
  assert.equal(toAblative("А. Мамыт"), "А. Мамыттан");
  assert.equal(toAblative("Н. Темирбекова"), "Н. Темирбековадан");
  assert.equal(toAblative("Т. Сыдыкбаев"), "Т. Сыдыкбаевден");
  assert.equal(toAblative("А. Төлөн"), "А. Төлөндөн");
  assert.equal(toAblative("А. Бөрүбаев"), "А. Бөрүбаевден");
});

test("names without Cyrillic letters are left without a suffix", () => {
  assert.equal(toAblative("Nuris Tilekbergiev"), "Nuris Tilekbergiev");
  assert.equal(toDative(""), "");
});

test("heading depends on the request type", () => {
  assert.equal(getRequestHeading("Кызматтык кат"), "КЫЗМАТТЫК КАТ");
  assert.equal(getRequestHeading("Өргүүгө арыз"), "АРЫЗ");
  assert.equal(getRequestHeading("Жумуштан суранып чыгуу"), "АРЫЗ");
  assert.equal(getRequestHeading(undefined), "АРЫЗ");
});

test("number and date share one line, the date in college time", () => {
  assert.equal(formatNumberAndDate("№1/12", "2026-11-25T20:30:00.000Z"), "№ 1/12 · 26.11.2026");
  assert.equal(formatNumberAndDate("", "2026-11-25T05:00:00.000Z"), "25.11.2026");
});

test("period uses day.month.year and shows one day once", () => {
  assert.equal(formatPeriod("2026-11-25", "2026-11-27"), "25.11.2026 – 27.11.2026");
  assert.equal(formatPeriod("2026-11-25", "2026-11-25"), "25.11.2026");
  assert.equal(formatPeriod("2026-11-25", ""), "25.11.2026");
});

test("address block names the director and the author", () => {
  assert.deepEqual(
    buildAddressLines({
      director: { fullName: "Дуйшенов Канат Райымбекович" },
      author: { fullName: "Бактыбек уулу Байэл", position: "Информатика мугалими" },
    }),
    ["ТАКтын директору", "К.Р. Дуйшеновго", "Информатика мугалими", "Б. Бактыбек уулунан"]
  );
  assert.deepEqual(
    buildAddressLines({
      director: { fullName: "Канат Райымбекович Дуйшенов" },
      author: { fullName: "Байэл Бактыбек уулу", position: "компьютердик технологиянын адиси" },
    }),
    ["ТАКтын директору", "К.Р. Дуйшеновго", "компьютердик технологиянын адиси", "Б. Бактыбек уулунан"]
  );
  assert.deepEqual(
    buildAddressLines({ director: null, author: { fullName: "Асанова Канышай Бабатаевна" } }),
    ["ТАКтын директоруна", "К.Б. Асановадан"]
  );
});
