const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { getTemplateContentBox } = require("../src/utils/letterhead");

test("text on the letterhead lines up with the ends of its separator line", async () => {
  const template = path.join(__dirname, "..", "assets", "letterhead-template.pdf");
  const page = (await PDFDocument.load(fs.readFileSync(template))).getPage(0);
  const box = getTemplateContentBox(page, 52);
  assert.equal(box.left, 86.1);
  assert.equal(box.right, 553.8);
  assert.ok(box.startY < 613.19, "text starts below the line");
});

test("a blank page keeps the default margins", async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const box = getTemplateContentBox(page, 52);
  assert.equal(box.left, 52);
  assert.equal(box.right, 595.28 - 52);
});
