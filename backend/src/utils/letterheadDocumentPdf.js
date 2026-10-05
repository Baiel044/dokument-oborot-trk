const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { UPLOAD_DIR } = require("./config");

const LETTERHEAD_PDF = path.join(__dirname, "..", "..", "assets", "letterhead-template.pdf");
const LETTERHEAD_IMAGE = path.join(__dirname, "..", "..", "assets", "letterhead.png");
const TEMPLATE_CONTENT_START_Y = 420;
const FALLBACK_CONTENT_TOP_MARGIN = 70;
const PDF_BOTTOM_MARGIN = 50;

function buildSafePdfName(title, fallbackName = "letterhead-document") {
  const safeBaseName = String(title || "letterhead-document")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${Date.now()}-${safeBaseName || fallbackName}.pdf`;
}

function splitLongWord(word, font, fontSize, maxWidth) {
  const chunks = [];
  let current = "";

  for (const symbol of String(word || "")) {
    const candidate = `${current}${symbol}`;
    if (!current || font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    current = symbol;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [""];
}

function wrapText(text, font, fontSize, maxWidth) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }

    let current = "";

    words.forEach((word) => {
      const wordParts =
        font.widthOfTextAtSize(word, fontSize) > maxWidth ? splitLongWord(word, font, fontSize, maxWidth) : [word];

      wordParts.forEach((part) => {
        if (!current) {
          current = part;
          return;
        }

        const candidate = `${current} ${part}`;
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
          current = candidate;
          return;
        }

        lines.push(current);
        current = part;
      });
    });

    if (current) {
      lines.push(current);
    }
  });

  return lines.length ? lines : [""];
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

async function generateLetterheadDocumentPdf({ title, categoryTitle, description, author, documentNumber }) {
  let pdfDoc;
  let page;
  let templatePdf = null;
  const hasTemplate = fs.existsSync(LETTERHEAD_PDF);

  if (hasTemplate) {
    templatePdf = await PDFDocument.load(fs.readFileSync(LETTERHEAD_PDF));
    pdfDoc = await PDFDocument.create();
    page = await createOfficialPdfPage(pdfDoc, templatePdf);
  } else {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([595.28, 841.89]);
  }

  const { font, toPdfText } = await embedPdfFont(pdfDoc);

  const margin = 52;
  let pageWidth = page.getWidth();
  let contentWidth = pageWidth - margin * 2;
  let cursorY = hasTemplate ? TEMPLATE_CONTENT_START_Y : page.getHeight() - FALLBACK_CONTENT_TOP_MARGIN;

  if (!hasTemplate && fs.existsSync(LETTERHEAD_IMAGE)) {
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

  function drawFallbackFrame() {
    if (hasTemplate) {
      return;
    }

    page.drawRectangle({
      x: 36,
      y: 36,
      width: page.getWidth() - 72,
      height: page.getHeight() - 72,
      borderWidth: 1,
      borderColor: rgb(0.74, 0.8, 0.9),
    });
  }

  async function ensureSpace(height = 50) {
    if (cursorY - height > PDF_BOTTOM_MARGIN) {
      return;
    }

    page = hasTemplate ? await createOfficialPdfPage(pdfDoc, templatePdf) : pdfDoc.addPage([595.28, 841.89]);
    pageWidth = page.getWidth();
    contentWidth = pageWidth - margin * 2;
    cursorY = hasTemplate ? TEMPLATE_CONTENT_START_Y : page.getHeight() - FALLBACK_CONTENT_TOP_MARGIN;
    drawFallbackFrame();
  }

  async function drawLines(lines, { fontSize = 12, color = rgb(0.08, 0.14, 0.24), gap = 6 } = {}) {
    for (const line of lines) {
      await ensureSpace(fontSize + gap + 4);
      page.drawText(toPdfText(line), {
        x: margin,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= fontSize + gap;
    }
  }

  async function drawParagraph(label, value) {
    await drawLines([label], { fontSize: 10, color: rgb(0.31, 0.39, 0.54), gap: 4 });
    const wrapped = wrapText(toPdfText(value || "—"), font, 12, contentWidth);
    await drawLines(wrapped, { fontSize: 12, color: rgb(0.06, 0.1, 0.2), gap: 4 });
    cursorY -= 8;
  }

  drawFallbackFrame();

  if (!hasTemplate) {
    await drawLines(["ОФИЦИАЛЬНЫЙ ДОКУМЕНТ НА ФИРМЕННОМ БЛАНКЕ"], {
      fontSize: 16,
      color: rgb(0.07, 0.23, 0.54),
      gap: 16,
    });
  }
  await drawParagraph("Номер документа", documentNumber);
  await drawParagraph("Название документа", title);
  await drawParagraph("Категория", categoryTitle);
  await drawParagraph("Подготовил", `${author.fullName} (${author.position || author.roleCode})`);
  await drawParagraph("Дата создания", new Date().toLocaleString("ru-RU"));
  await drawParagraph("Содержание", description || "Без дополнительного описания");

  await drawLines(["Документ автоматически сформирован на фирменном бланке колледжа."], {
    fontSize: 12,
    color: rgb(0.05, 0.42, 0.26),
    gap: 4,
  });

  const fileName = buildSafePdfName(title);
  const outputPath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(outputPath, await pdfDoc.save());

  return {
    fileName,
    originalTitle: `${title}.pdf`,
    filePath: `/uploads/${fileName}`,
    mimeType: "application/pdf",
    generatedAt: new Date().toISOString(),
    isLetterhead: true,
    documentNumber,
  };
}

const OFFICIAL_COLLEGE_NAME = "Таш-Кумырский региональный колледж";

const DOCUMENT_TYPE_TITLES = {
  application: "Заявление",
  applications: "Заявление",
  statement: "Заявление",
  statements: "Заявление",
  order: "Приказ",
  orders: "Приказ",
  certificate: "Справка",
  certificates: "Справка",
  report: "Отчёт",
  reports: "Отчёт",
  incoming: "Входящий документ",
  outgoing: "Исходящий документ",
};

const DOCUMENT_STATUS_TITLES = {
  draft: "Черновик",
  submitted: "Отправлено",
  pending: "На рассмотрении",
  approved: "Одобрено",
  returned: "Возвращено",
  rejected: "Отклонено",
  completed: "Завершено",
};

function formatDocumentDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOfficialDocumentType(document) {
  const rawType = String(document.documentType || document.category || document.type || "").trim();
  return DOCUMENT_TYPE_TITLES[rawType] || rawType || "Документ";
}

function getOfficialDocumentStatus(document) {
  const rawStatus = String(document.status || "").trim();
  return DOCUMENT_STATUS_TITLES[rawStatus] || rawStatus || "Не указан";
}

function getOfficialDocumentBody(document) {
  return (
    document.description ||
    document.text ||
    document.reason ||
    document.comment ||
    document.summary ||
    "Без дополнительного текста."
  );
}

function getUserName(user) {
  return user?.fullName || user?.username || "Не указан";
}

function getUserRole(user) {
  return user?.position || user?.roleTitle || user?.roleCode || "Не указана";
}

function getRouteHistoryLines(routeHistory) {
  if (!Array.isArray(routeHistory) || routeHistory.length === 0) {
    return ["История маршрута отсутствует."];
  }

  return routeHistory.map((step, index) => {
    const createdAt = formatDocumentDate(step.createdAt);
    const action = step.action || step.status || "Действие";
    const status = step.status || "—";
    const userName = step.userName || step.actorName || step.actorUserName || step.userId || step.actorUserId || "—";
    const userRole = step.userRole || step.actorRoleCode || step.actorRoleTitle || "";
    const comment = step.comment ? `; комментарий: ${step.comment}` : "";

    return `${index + 1}. ${createdAt} — ${action}; статус: ${status}; пользователь: ${userName}${userRole ? ` (${userRole})` : ""}${comment}`;
  });
}

async function createOfficialPdfPage(pdfDoc, templatePdf) {
  if (templatePdf) {
    const [templatePage] = await pdfDoc.copyPages(templatePdf, [0]);
    pdfDoc.addPage(templatePage);
    return pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  }

  return pdfDoc.addPage([595.28, 841.89]);
}

function getOfficialPdfOriginalTitle(document) {
  const number = String(document.documentNumber || "without-number").replace(/[\\/:*?"<>|]+/g, "-");
  const title = String(document.title || document.fileName || "official-document").replace(/[\\/:*?"<>|]+/g, "-");
  return `${number} ${title}.pdf`;
}

async function generateOfficialDocumentPdf({ document, author, director }) {
  const templatePdf = fs.existsSync(LETTERHEAD_PDF)
    ? await PDFDocument.load(fs.readFileSync(LETTERHEAD_PDF))
    : null;
  const pdfDoc = await PDFDocument.create();
  let page = await createOfficialPdfPage(pdfDoc, templatePdf);
  const { font, toPdfText } = await embedPdfFont(pdfDoc);

  const margin = 52;
  const bottomMargin = 50;
  let pageWidth = page.getWidth();
  let contentWidth = pageWidth - margin * 2;
  let cursorY = templatePdf ? TEMPLATE_CONTENT_START_Y : page.getHeight() - FALLBACK_CONTENT_TOP_MARGIN;

  if (!templatePdf && fs.existsSync(LETTERHEAD_IMAGE)) {
    const letterheadImage = await pdfDoc.embedPng(fs.readFileSync(LETTERHEAD_IMAGE));
    const bannerWidth = 150;
    const bannerHeight = (letterheadImage.height / letterheadImage.width) * bannerWidth;
    page.drawImage(letterheadImage, {
      x: pageWidth - margin - bannerWidth,
      y: page.getHeight() - margin - bannerHeight + 10,
      width: bannerWidth,
      height: bannerHeight,
    });
    cursorY = page.getHeight() - margin - bannerHeight - 32;
  }

  function drawFallbackFrame() {
    if (templatePdf) {
      return;
    }

    page.drawRectangle({
      x: 36,
      y: 36,
      width: page.getWidth() - 72,
      height: page.getHeight() - 72,
      borderWidth: 1,
      borderColor: rgb(0.74, 0.8, 0.9),
    });
  }

  async function ensureSpace(height = 50) {
    if (cursorY - height > bottomMargin) {
      return;
    }

    page = await createOfficialPdfPage(pdfDoc, templatePdf);
    pageWidth = page.getWidth();
    contentWidth = pageWidth - margin * 2;
    cursorY = templatePdf ? TEMPLATE_CONTENT_START_Y : page.getHeight() - FALLBACK_CONTENT_TOP_MARGIN;
    drawFallbackFrame();
  }

  async function drawLines(lines, { fontSize = 12, color = rgb(0.08, 0.14, 0.24), gap = 6 } = {}) {
    for (const line of lines) {
      await ensureSpace(fontSize + gap + 4);
      page.drawText(toPdfText(line), {
        x: margin,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= fontSize + gap;
    }
  }

  async function drawCenteredLine(line, { fontSize = 15, color = rgb(0.07, 0.23, 0.54), gap = 16 } = {}) {
    await ensureSpace(fontSize + gap + 4);
    const text = toPdfText(line);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: margin + Math.max(0, (contentWidth - textWidth) / 2),
      y: cursorY,
      size: fontSize,
      font,
      color,
    });
    cursorY -= fontSize + gap;
  }

  async function drawParagraph(label, value, { valueFontSize = 12, gapAfter = 8 } = {}) {
    await ensureSpace(44);
    await drawLines([label], { fontSize: 10, color: rgb(0.31, 0.39, 0.54), gap: 4 });
    const wrapped = wrapText(toPdfText(value || "—"), font, valueFontSize, contentWidth);
    await drawLines(wrapped, { fontSize: valueFontSize, color: rgb(0.06, 0.1, 0.2), gap: 4 });
    cursorY -= gapAfter;
  }

  async function drawRouteHistory(routeHistory) {
    await drawLines(["История маршрута"], { fontSize: 13, color: rgb(0.07, 0.23, 0.54), gap: 8 });
    for (const line of getRouteHistoryLines(routeHistory)) {
      const wrapped = wrapText(toPdfText(line), font, 10, contentWidth);
      await drawLines(wrapped, { fontSize: 10, color: rgb(0.16, 0.23, 0.36), gap: 4 });
      cursorY -= 4;
    }
  }

  const generatedAt = new Date().toISOString();
  const approved = Boolean(
    document.approvedBy ||
      document.approvedAt ||
      ["approved", "completed"].includes(String(document.status || "").toLowerCase())
  );
  const directorName = approved ? getUserName(director) : "Не указан";
  const approvedAt = document.approvedAt || (approved ? document.updatedAt || generatedAt : "");
  const signatureText = approved
    ? `Цифровая подпись директора подтверждена. Подписал: ${directorName}. Дата: ${formatDocumentDate(approvedAt)}.`
    : "Цифровая подпись директора отсутствует.";

  drawFallbackFrame();
  if (!templatePdf) {
    await drawCenteredLine(OFFICIAL_COLLEGE_NAME.toUpperCase(), {
      fontSize: 16,
      color: rgb(0.05, 0.12, 0.23),
      gap: 12,
    });
  }
  if (!templatePdf) {
    await drawCenteredLine("ОФИЦИАЛЬНЫЙ ЭЛЕКТРОННЫЙ ДОКУМЕНТ", {
      fontSize: 15,
      color: rgb(0.05, 0.16, 0.36),
      gap: 18,
    });
  }

  await drawParagraph("Тип документа", getOfficialDocumentType(document));
  await drawParagraph("Регистрационный номер", document.documentNumber || "Без номера");
  await drawParagraph("Дата документа", formatDocumentDate(document.createdAt || document.updatedAt || generatedAt));
  await drawParagraph("Автор", getUserName(author));
  await drawParagraph("Роль автора", getUserRole(author));
  await drawParagraph("Тема документа", document.title || document.fileName || "Без названия");
  await drawParagraph("Основной текст", getOfficialDocumentBody(document), {
    valueFontSize: 11,
    gapAfter: 10,
  });
  await drawParagraph("Статус документа", getOfficialDocumentStatus(document));
  await drawParagraph("Директор", directorName);
  await drawParagraph("Дата утверждения", approved ? formatDocumentDate(approvedAt) : "Не утверждено");
  await drawParagraph("Отметка о цифровой подписи", signatureText, {
    valueFontSize: 11,
    gapAfter: 10,
  });
  await drawRouteHistory(document.routeHistory);

  await drawLines(["Документ сформирован автоматически в системе электронного документооборота."], {
    fontSize: 11,
    color: rgb(0.05, 0.42, 0.26),
    gap: 4,
  });

  const fileName = buildSafePdfName(document.title || document.fileName || document.documentNumber, "official-document");
  const outputPath = path.join(UPLOAD_DIR, fileName);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  const stats = fs.statSync(outputPath);

  return {
    fileName,
    originalTitle: getOfficialPdfOriginalTitle(document),
    filePath: `/uploads/${fileName}`,
    mimeType: "application/pdf",
    generatedAt,
    isOfficial: true,
    documentNumber: document.documentNumber || null,
    size: stats.size,
  };
}

module.exports = {
  generateLetterheadDocumentPdf,
  generateOfficialDocumentPdf,
};
