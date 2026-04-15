const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { UPLOAD_DIR } = require("./config");
const LETTERHEAD_PDF = path.join(__dirname, "..", "assets", "letterhead-template.pdf");
const LETTERHEAD_IMAGE = path.join(__dirname, "..", "assets", "letterhead.png");

function buildSafePdfName(title) {
  const safeBaseName = String(title || "official-document")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${Date.now()}-${safeBaseName || "official-document"}.pdf`;
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [""];
  }

  const lines = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[index];
    }
  }

  lines.push(current);
  return lines;
}

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
    Қ: "K",
    Һ: "H",
    Ұ: "U",
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
    қ: "k",
    һ: "h",
    ұ: "u",
  };

  return String(text || "")
    .split("")
    .map((symbol) => map[symbol] ?? symbol)
    .join("");
}

function getFontCandidates() {
  const windowsDir = process.env.WINDIR || "C:\\Windows";
  return [
    path.join(windowsDir, "Fonts", "arial.ttf"),
    path.join(windowsDir, "Fonts", "segoeui.ttf"),
    path.join(windowsDir, "Fonts", "times.ttf"),
  ];
}

async function embedPdfFont(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const fontPath = getFontCandidates().find((candidate) => fs.existsSync(candidate));

  if (fontPath) {
    const fontBytes = fs.readFileSync(fontPath);
    const font = await pdfDoc.embedFont(fontBytes, { subset: true });
    return {
      font,
      toPdfText: (text) => String(text || ""),
    };
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return {
    font,
    toPdfText: (text) => transliterate(text),
  };
}

async function generateOfficialRequestPdf({ request, author, director, targetRoleTitle }) {
  let pdfDoc;
  let page;

  if (fs.existsSync(LETTERHEAD_PDF)) {
    const templatePdf = await PDFDocument.load(fs.readFileSync(LETTERHEAD_PDF));
    pdfDoc = await PDFDocument.create();
    const [templatePage] = await pdfDoc.copyPages(templatePdf, [0]);
    pdfDoc.addPage(templatePage);
    page = pdfDoc.getPage(0);
  } else {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([595.28, 841.89]);
  }

  const { font, toPdfText } = await embedPdfFont(pdfDoc);

  const margin = 52;
  const pageWidth = page.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let cursorY = fs.existsSync(LETTERHEAD_PDF) ? page.getHeight() - 170 : page.getHeight() - 70;

  if (!fs.existsSync(LETTERHEAD_PDF) && fs.existsSync(LETTERHEAD_IMAGE)) {
    const letterheadImage = await pdfDoc.embedPng(fs.readFileSync(LETTERHEAD_IMAGE));
    const bannerWidth = 170;
    const bannerHeight = (letterheadImage.height / letterheadImage.width) * bannerWidth;
    page.drawImage(letterheadImage, {
      x: pageWidth - margin - bannerWidth,
      y: page.getHeight() - margin - bannerHeight + 10,
      width: bannerWidth,
      height: bannerHeight,
    });
    page.drawLine({
      start: { x: margin, y: page.getHeight() - margin - bannerHeight - 12 },
      end: { x: pageWidth - margin, y: page.getHeight() - margin - bannerHeight - 12 },
      thickness: 1,
      color: rgb(0.78, 0.83, 0.9),
    });
    cursorY = page.getHeight() - margin - bannerHeight - 36;
  }

  function drawLines(lines, { fontSize = 12, color = rgb(0.08, 0.14, 0.24), gap = 6 } = {}) {
    lines.forEach((line) => {
      page.drawText(toPdfText(line), {
        x: margin,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= fontSize + gap;
    });
  }

  function drawParagraph(label, value) {
    drawLines([label], { fontSize: 12, color: rgb(0.2, 0.3, 0.45), gap: 4 });
    const wrapped = wrapText(toPdfText(value || "—"), font, 12, contentWidth);
    drawLines(wrapped, { fontSize: 12, gap: 4 });
    cursorY -= 8;
  }

  const signatureCode = crypto
    .createHash("sha256")
    .update(`${request.id}|${request.updatedAt || request.createdAt}|${director.fullName}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  if (!fs.existsSync(LETTERHEAD_PDF)) {
    page.drawRectangle({
      x: 36,
      y: 36,
      width: page.getWidth() - 72,
      height: page.getHeight() - 72,
      borderWidth: 1,
      borderColor: rgb(0.74, 0.8, 0.9),
    });
  }

  drawLines(["ТАШ-КУМЫРСКИЙ РЕГИОНАЛЬНЫЙ КОЛЛЕДЖ"], {
    fontSize: 17,
    color: rgb(0.05, 0.12, 0.23),
    gap: 10,
  });
  drawLines(["ОФИЦИАЛЬНЫЙ ЭЛЕКТРОННЫЙ ДОКУМЕНТ"], {
    fontSize: 15,
    color: rgb(0.07, 0.23, 0.54),
    gap: 16,
  });

  drawParagraph("Название документа", request.documentTitle);
  drawParagraph("Тип обращения", request.type);
  drawParagraph("Автор", `${author.fullName} (${author.position || author.roleCode})`);
  drawParagraph("Период", `${request.startDate || "—"} - ${request.endDate || "—"}`);
  drawParagraph("Время отсутствия", request.absenceTime || "—");
  drawParagraph("Суть обращения", request.reason || "—");
  drawParagraph("Комментарий автора", request.comment || "—");
  drawParagraph("Комментарий директора", request.directorComment || "—");
  drawParagraph("Маршрут после подписи", targetRoleTitle || "Остается у директора");
  drawParagraph("Подписал", director.fullName);
  drawParagraph(
    "Цифровая подпись (ЭЦП)",
    `ЭЦП ${signatureCode} от ${new Date(request.updatedAt || request.createdAt).toLocaleString("ru-RU")}`
  );

  drawLines(["Документ сформирован автоматически и имеет официальный статус."], {
    fontSize: 12,
    color: rgb(0.05, 0.42, 0.26),
    gap: 4,
  });

  const fileName = buildSafePdfName(request.documentTitle);
  const outputPath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(outputPath, await pdfDoc.save());

  return {
    signatureCode,
    document: {
      fileName,
      originalTitle: `${request.documentTitle}.pdf`,
      filePath: `/uploads/${fileName}`,
      mimeType: "application/pdf",
      generatedAt: new Date().toISOString(),
      isOfficial: true,
    },
  };
}

module.exports = {
  generateOfficialRequestPdf,
};
