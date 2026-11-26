const test = require("node:test");
const assert = require("node:assert/strict");
const { amountInWords, amountWithWords, formatMoney } = require("../src/utils/numberWords");
const { getRequestFields, parseRequestDetails } = require("../src/utils/requestDetails");

test("amounts are written in Kyrgyz words", () => {
  assert.equal(amountInWords(5000), "беш миң сом");
  assert.equal(amountInWords(1), "бир сом");
  assert.equal(amountInWords(100), "жүз сом");
  assert.equal(amountInWords(1000), "миң сом");
  assert.equal(amountInWords(12345), "он эки миң үч жүз кырк беш сом");
  assert.equal(amountInWords(250000), "эки жүз элүү миң сом");
  assert.equal(amountInWords(1600000), "бир миллион алты жүз миң сом");
  assert.equal(amountInWords(90.5), "токсон сом элүү тыйын");
  assert.equal(amountInWords(0), "нөл сом");
});

test("the amount is printed as figures, words in brackets, then the currency", () => {
  assert.equal(amountWithWords(8200), "8 200 (сегиз миң эки жүз) сом");
  assert.equal(amountWithWords(90.5), "90,50 (токсон сом элүү тыйын)");
});

test("money is shown with thousands separated by spaces", () => {
  assert.equal(formatMoney(5000), "5 000");
  assert.equal(formatMoney(1234567.5), "1 234 567,50");
});

test("each request type has its own fields", () => {
  assert.deepEqual(getRequestFields("Өргүүгө арыз"), ["period"]);
  assert.deepEqual(getRequestFields("Иш сапарга чыгуу жөнүндө арыз"), ["period", "trip"]);
  assert.deepEqual(getRequestFields("Керектүү буюмдарды сатып алууга арыз"), ["amount", "items"]);
  assert.deepEqual(getRequestFields("Күйүүчү май алууга арыз"), ["amount"]);
  assert.deepEqual(getRequestFields("Кызматтык кат"), []);
});

test("period is kept only for absence and trip requests", () => {
  const body = { startDate: "2026-11-25", endDate: "2026-11-27", absenceTime: "Толук күн" };
  assert.deepEqual(parseRequestDetails("Өргүүгө арыз", body).values, {
    startDate: "2026-11-25",
    endDate: "2026-11-27",
    absenceTime: "Толук күн",
    amount: null,
    items: [],
    destination: "",
    purpose: "",
  });
  const letter = parseRequestDetails("Кызматтык кат", body).values;
  assert.equal(letter.startDate, "");
  assert.equal(letter.absenceTime, "");
});

test("amount is required and must be a positive number", () => {
  const type = "Аванс же акча каражатын бөлүүгө арыз";
  assert.match(parseRequestDetails(type, {}).message, /сумма/i);
  assert.match(parseRequestDetails(type, { amount: "-5" }).message, /сумма/i);
  assert.match(parseRequestDetails(type, { amount: "abc" }).message, /сумма/i);
  assert.equal(parseRequestDetails(type, { amount: "5000" }).values.amount, 5000);
  assert.equal(parseRequestDetails(type, { amount: "12,5" }).values.amount, 12.5);
});

test("purchase amount is the total of the items table", () => {
  const type = "Керектүү буюмдарды сатып алууга арыз";
  const items = JSON.stringify([
    { name: "Кышкы дөңгөлөк", quantity: "4", price: "1250" },
    { name: "Кагаз", quantity: 2, price: 450.5 },
  ]);
  const { values, message } = parseRequestDetails(type, { items, amount: "1" });
  assert.equal(message, undefined);
  assert.equal(values.amount, 5901);
  assert.deepEqual(values.items[1], { name: "Кагаз", quantity: 2, price: 450.5 });

  assert.match(parseRequestDetails(type, { items: "[]" }).message, /буюм/i);
  assert.match(parseRequestDetails(type, { items: "not json" }).message, /буюм/i);
  assert.match(
    parseRequestDetails(type, { items: JSON.stringify([{ name: "", quantity: 1, price: 1 }]) }).message,
    /буюм/i
  );
  assert.match(
    parseRequestDetails(type, { items: JSON.stringify([{ name: "x", quantity: 0, price: 1 }]) }).message,
    /буюм/i
  );
});

test("business trip needs a destination and a purpose", () => {
  const type = "Иш сапарга чыгуу жөнүндө арыз";
  assert.match(parseRequestDetails(type, { purpose: "Семинар" }).message, /кайда/i);
  assert.match(parseRequestDetails(type, { destination: "Бишкек" }).message, /максат/i);
  const { values } = parseRequestDetails(type, { destination: " Бишкек ", purpose: "Семинар" });
  assert.equal(values.destination, "Бишкек");
  assert.equal(values.purpose, "Семинар");
});

test("fields of other types are dropped", () => {
  const { values } = parseRequestDetails("Кызматтык кат", { amount: "100", destination: "Ош" });
  assert.equal(values.amount, null);
  assert.equal(values.destination, "");
});
