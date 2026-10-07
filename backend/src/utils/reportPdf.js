const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { getPdfFontCandidates } = require("./pdfFonts");

function transliterate(text) {
  const map = {
    А: "A",
    Б: "B",
    В: "V",
    Г: "G",
    Д: "D",
    Е: "E",
    Ё: "Yo",
    Ж: "Zh",
    З: "Z",
    И: "I",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "Kh",
    Ц: "Ts",
    Ч: "Ch",
    Ш: "Sh",
    Щ: "Sch",
    Ъ: "",
    Ы: "Y",
    Ь: "",
    Э: "E",
    Ю: "Yu",
    Я: "Ya",
    Ң: "N",
    Ү: "U",
    Ө: "O",
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    ң: "n",
    ү: "u",
    ө: "o",
  };

  return String(text || "")
    .split("")
    .map((symbol) => map[symbol] ?? symbol)
    .join("");
}


async function embedPdfFont(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const fontPath = getPdfFontCandidates().find((candidate) => fs.existsSync(candidate));

  if (fontPath) {
    return {
      font: await pdfDoc.embedFont(fs.readFileSync(fontPath), { subset: true }),
      toPdfText: (text) => String(text || ""),
    };
  }

  return {
    font: await pdfDoc.embedFont(StandardFonts.Helvetica),
    toPdfText: (text) => transliterate(text),
  };
}

function drawText(page, font, toPdfText, text, x, y, size, color = rgb(0.12, 0.16, 0.22)) {
  page.drawText(toPdfText(text), { x, y, size, font, color });
}

function ensureSpace(pdfDoc, currentPage, cursor, requiredHeight) {
  if (cursor.y - requiredHeight >= 54) {
    return { page: currentPage, y: cursor.y };
  }

  const page = pdfDoc.addPage([595.28, 841.89]);
  return { page, y: 780 };
}

function drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title, metrics }) {
  const sectionEntries = Object.entries(metrics || {});
  let state = ensureSpace(pdfDoc, page, cursor, 48 + sectionEntries.length * 22);
  page = state.page;
  cursor.y = state.y;

  drawText(page, font, toPdfText, title, 54, cursor.y, 13, rgb(0.02, 0.3, 0.55));
  cursor.y -= 20;

  if (!sectionEntries.length) {
    drawText(page, font, toPdfText, "Нет данных", 70, cursor.y, 10, rgb(0.45, 0.48, 0.52));
    cursor.y -= 22;
    return page;
  }

  sectionEntries.forEach(([name, value]) => {
    state = ensureSpace(pdfDoc, page, cursor, 24);
    page = state.page;
    cursor.y = state.y;
    drawText(page, font, toPdfText, String(name), 70, cursor.y, 10);
    drawText(page, font, toPdfText, String(value), 500, cursor.y, 10, rgb(0.02, 0.3, 0.55));
    cursor.y -= 22;
  });

  cursor.y -= 8;
  return page;
}

async function buildSummaryPdf({ summary, generatedBy }) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  const { font, toPdfText } = await embedPdfFont(pdfDoc);
  const cursor = { y: 780 };
  const generatedAt = new Date();

  drawText(page, font, toPdfText, "Система электронного документооборота учебного заведения", 54, cursor.y, 14, rgb(0.02, 0.3, 0.55));
  cursor.y -= 28;
  drawText(page, font, toPdfText, "Сводный отчёт", 54, cursor.y, 20);
  cursor.y -= 24;
  drawText(page, font, toPdfText, `Область данных: ${summary.scopeTitle || "Общий отчёт учреждения"}`, 54, cursor.y, 10);
  cursor.y -= 16;
  drawText(page, font, toPdfText, `Сформировал: ${generatedBy?.fullName || "Пользователь системы"}`, 54, cursor.y, 10);
  cursor.y -= 16;
  drawText(page, font, toPdfText, `Дата формирования: ${generatedAt.toLocaleString("ru-RU")}`, 54, cursor.y, 10);
  cursor.y -= 32;

  drawText(page, font, toPdfText, "Итоги", 54, cursor.y, 13, rgb(0.02, 0.3, 0.55));
  cursor.y -= 22;
  drawText(page, font, toPdfText, `Документы: ${summary.totalDocuments}`, 70, cursor.y, 11);
  cursor.y -= 18;
  drawText(page, font, toPdfText, `Записи журнала действий: ${summary.totalAuditLogs}`, 70, cursor.y, 11);
  cursor.y -= 30;

  page = drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title: "Статусы заявлений", metrics: summary.requestsByStatus });
  page = drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title: "Пользователи по ролям", metrics: summary.usersByRole });
  page = drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title: "Пользователи по подразделениям", metrics: summary.usersByDepartment });
  page = drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title: "Документы по категориям", metrics: summary.documentsByCategory });
  page = drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title: "Документы по источникам", metrics: summary.documentsBySource });
  drawMetricSection({ pdfDoc, page, cursor, font, toPdfText, title: "Поручения по статусам", metrics: summary.assignmentsByStatus });

  return Buffer.from(await pdfDoc.save());
}

module.exports = {
  buildSummaryPdf,
};
