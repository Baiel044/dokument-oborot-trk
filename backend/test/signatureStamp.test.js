const test = require("node:test");
const assert = require("node:assert/strict");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const {
  STAMP_HEIGHT,
  drawSignatureStamp,
  formatFullName,
  formatSignerName,
  formatSignedAt,
} = require("../src/utils/signatureStamp");

test("signer name is shortened to initials and surname", () => {
  assert.equal(formatSignerName("Дуйшенов Канат Райымбекович"), "К.Р. Дуйшенов");
  assert.equal(formatSignerName("  Асранова   Канышай Бабатаевна "), "К.Б. Асранова");
});

test("уулу / кызы stays with the surname", () => {
  assert.equal(formatSignerName("Бактыбек уулу Байэл"), "Б. Бактыбек уулу");
  assert.equal(formatSignerName("Асан кызы Айжан"), "А. Асан кызы");
});

test("names typed given name first are put in the Kyrgyz order", () => {
  assert.equal(formatFullName("Байэл Бактыбек уулу"), "Бактыбек уулу Байэл");
  assert.equal(formatSignerName("Байэл Бактыбек уулу"), "Б. Бактыбек уулу");
  assert.equal(formatFullName("Айжан Асан кызы"), "Асан кызы Айжан");
  assert.equal(formatFullName("Канат Райымбекович Дуйшенов"), "Дуйшенов Канат Райымбекович");
  assert.equal(formatSignerName("Канышай Бабатаевна Асанова"), "К.Б. Асанова");
});

test("names already in the Kyrgyz order stay as they are", () => {
  assert.equal(formatFullName("Бактыбек уулу Байэл"), "Бактыбек уулу Байэл");
  assert.equal(formatFullName("Дуйшенов Канат Райымбекович"), "Дуйшенов Канат Райымбекович");
  assert.equal(formatFullName("Nuris Tilekbergiev"), "Nuris Tilekbergiev");
  assert.equal(formatFullName("  Бадолотова   Бермет "), "Бадолотова Бермет");
});

test("names that are not surname + name + patronymic are left as they are", () => {
  assert.equal(formatSignerName("Системный администратор"), "Системный администратор");
  assert.equal(formatSignerName("director"), "director");
  assert.equal(formatSignerName(""), "");
  assert.equal(formatSignerName(undefined), "");
});

test("signing time is shown in Kyrgyz time whatever the server time zone is", () => {
  assert.equal(formatSignedAt("2026-11-12T03:07:08.000Z"), "12.11.2026, 09:07");
});

test("stamp never gets wider than the space it is given", async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const draw = (signerName) =>
    drawSignatureStamp({
      pdfDoc,
      page,
      font,
      toPdfText: (text) => text.replace(/[^\x00-\x7F]/g, "x"),
      x: 52,
      topY: 400,
      maxWidth: 491,
      signerName,
    });

  const normal = await draw("Duishenov Kanat Raiymbekovich");
  assert.equal(normal.height, STAMP_HEIGHT);
  assert.ok(normal.width < 300, "a usual name gives a compact stamp");

  const long = await draw("Verylongsurname".repeat(12));
  assert.ok(long.width <= 491, `width ${long.width}`);
  assert.ok((await pdfDoc.save()).length > 0);
});
