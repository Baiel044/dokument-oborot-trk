const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const QRCode = require("qrcode");
const { SERIF_FONT_PATHS, getPdfFontCandidates } = require("./pdfFonts");
const { UPLOAD_DIR } = require("./config");
const {
  LETTERHEAD_IMAGE_PATH: LETTERHEAD_IMAGE,
  getLetterheadTemplatePath,
  getTemplateContentBox,
} = require("./letterhead");
const { STAMP_HEIGHT, drawSignatureStamp, formatFullName, formatSignedAt } = require("./signatureStamp");
const { buildAddressLines, formatNumberAndDate, formatPeriod, getRequestHeading } = require("./requestLetter");
const { getRequestFields } = require("./requestDetails");
const { amountWithWords, formatMoney } = require("./numberWords");
const { buildVerificationUrl } = require("./verification");

const PDF_BOTTOM_MARGIN = 50;

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


async function embedPdfFont(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const fontPath = getPdfFontCandidates().find((candidate) => fs.existsSync(candidate));

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

// Every letter text is 14 pt, as the college prints its paper documents.
const TEXT_SIZE = 14;
const LINE_HEIGHT = 17;
const QR_GAP = 16;
const TEXT_COLOR = rgb(0.06, 0.1, 0.2);
const LABEL_COLOR = rgb(0.2, 0.3, 0.45);
const MUTED_COLOR = rgb(0.31, 0.39, 0.54);
const APPROVED_COLOR = rgb(0.05, 0.42, 0.26);

// Spacing of the usual layout and of the tighter one used when the stamp would end up alone on a page.
const REGULAR_LAYOUT = { labelGap: 2, paragraphGap: 8, addressGap: 14, headingGap: 22, cellPadding: 5 };
const COMPACT_LAYOUT = { labelGap: 0, paragraphGap: 3, addressGap: 8, headingGap: 14, cellPadding: 3 };

/** Liberation Serif has the same letter widths as Times New Roman and is free to ship with the code. */
async function embedLetterFonts(pdfDoc) {
  if (fs.existsSync(SERIF_FONT_PATHS.regular) && fs.existsSync(SERIF_FONT_PATHS.bold)) {
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fs.readFileSync(SERIF_FONT_PATHS.regular), { subset: true });
    const bold = await pdfDoc.embedFont(fs.readFileSync(SERIF_FONT_PATHS.bold), { subset: true });
    return { font, bold, toPdfText: (text) => String(text || "") };
  }
  const fallback = await embedPdfFont(pdfDoc);
  return { ...fallback, bold: fallback.font };
}

/**
 * Draws the request letter. Returns the PDF, the signature code and whether the stamp
 * had to start a new page.
 */
async function buildOfficialRequestPdf({ request, author, director, addressee = director }, layout) {
  const templatePdf = fs.existsSync(getLetterheadTemplatePath())
    ? await PDFDocument.load(fs.readFileSync(getLetterheadTemplatePath()))
    : null;
  const pdfDoc = await PDFDocument.create();

  async function addPage() {
    if (templatePdf) {
      const [templatePage] = await pdfDoc.copyPages(templatePdf, [0]);
      return pdfDoc.addPage(templatePage);
    }
    return pdfDoc.addPage([595.28, 841.89]);
  }

  let page = await addPage();
  const { font, bold, toPdfText } = await embedLetterFonts(pdfDoc);

  const pageWidth = page.getWidth();
  // On the letterhead the text lines up with the ends of its separator line.
  const contentBox = templatePdf
    ? getTemplateContentBox(page, 52)
    : { startY: page.getHeight() - 70, left: 52, right: pageWidth - 52 };
  const margin = contentBox.left;
  const contentWidth = contentBox.right - contentBox.left;
  const pageStartY = contentBox.startY;
  let cursorY = pageStartY;

  if (!templatePdf && fs.existsSync(LETTERHEAD_IMAGE)) {
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

  async function ensureSpace(height) {
    if (cursorY - height > PDF_BOTTOM_MARGIN) {
      return;
    }

    page = await addPage();
    cursorY = pageStartY;
    drawFallbackFrame();
  }

  async function drawLines(lines, { color = TEXT_COLOR, gap = 0, x = margin, lineFont = font } = {}) {
    for (const line of lines) {
      await ensureSpace(LINE_HEIGHT + 4);
      page.drawText(toPdfText(line), { x, y: cursorY, size: TEXT_SIZE, font: lineFont, color });
      cursorY -= LINE_HEIGHT + gap;
    }
  }

  function wrap(text, width = contentWidth, lineFont = font) {
    return wrapText(toPdfText(text), lineFont, TEXT_SIZE, width);
  }

  /** Label and value; nothing is printed when the value is empty. */
  async function drawParagraph(label, value) {
    if (!String(value ?? "").trim()) {
      return;
    }
    const lines = wrap(value);
    // A label is never left at the bottom of a page without its value.
    await ensureSpace((LINE_HEIGHT + layout.labelGap) * (1 + Math.min(lines.length, 4)) + 4);
    await drawLines([label], { color: LABEL_COLOR, gap: layout.labelGap });
    await drawLines(lines, { gap: layout.labelGap });
    cursorY -= layout.paragraphGap;
  }

  /** "Чечими: ✓ Макулдашылды", with the director's comment after it when there is one. */
  async function drawDecision(comment) {
    await ensureSpace(LINE_HEIGHT * 2 + 4);
    await drawLines(["Чечими / Решение"], { color: LABEL_COLOR, gap: layout.labelGap });
    await ensureSpace(LINE_HEIGHT + 4);
    // PDF fonts have no check-mark glyph, so the mark is drawn.
    const markY = cursorY + 4;
    page.drawLine({ start: { x: margin, y: markY }, end: { x: margin + 4, y: markY - 4 }, thickness: 2, color: APPROVED_COLOR });
    page.drawLine({ start: { x: margin + 4, y: markY - 4 }, end: { x: margin + 12, y: markY + 6 }, thickness: 2, color: APPROVED_COLOR });
    page.drawText(toPdfText("Макулдашылды"), { x: margin + 18, y: cursorY, size: TEXT_SIZE, font: bold, color: APPROVED_COLOR });
    cursorY -= LINE_HEIGHT + layout.labelGap;
    if (String(comment || "").trim()) {
      await drawLines(wrap(comment), { gap: layout.labelGap });
    }
    cursorY -= layout.paragraphGap;
  }

  // Purchase table: № | Аталышы | Саны | Баасы | Жалпы, with the grand total in the last row.
  async function drawItemsTable(items, total) {
    const padding = layout.cellPadding;
    const widths = [30, contentWidth - 30 - 72 - 92 - 104, 72, 92, 104];
    const lineColor = rgb(0.62, 0.68, 0.78);

    async function drawRow(cells, { header = false, align = [] } = {}) {
      const wrapped = cells.map((cell, index) => wrap(cell, widths[index] - padding * 2));
      const height = Math.max(...wrapped.map((lines) => lines.length)) * LINE_HEIGHT + padding * 2;
      await ensureSpace(height + 4);
      let x = margin;
      wrapped.forEach((lines, index) => {
        page.drawRectangle({
          x,
          y: cursorY - height,
          width: widths[index],
          height,
          borderWidth: 0.75,
          borderColor: lineColor,
          color: header ? rgb(0.94, 0.96, 0.99) : undefined,
        });
        lines.forEach((line, lineIndex) => {
          const lineWidth = font.widthOfTextAtSize(line, TEXT_SIZE);
          const textX = align[index] === "right" ? x + widths[index] - padding - lineWidth : x + padding;
          page.drawText(line, {
            x: textX,
            y: cursorY - padding - TEXT_SIZE - lineIndex * LINE_HEIGHT + 3,
            size: TEXT_SIZE,
            font,
            color: header ? LABEL_COLOR : TEXT_COLOR,
          });
        });
        x += widths[index];
      });
      cursorY -= height;
    }

    await drawLines(["Буюмдар / Товары"], { color: LABEL_COLOR, gap: 4 });
    await drawRow(["№", "Аталышы / Наименование", "Саны / Кол-во", "Баасы / Цена", "Жалпы / Сумма"], {
      header: true,
    });
    const align = ["left", "left", "right", "right", "right"];
    for (const [index, item] of items.entries()) {
      await drawRow(
        [
          String(index + 1),
          item.name,
          formatMoney(item.quantity),
          formatMoney(item.price),
          formatMoney(item.quantity * item.price),
        ],
        { align }
      );
    }

    // The total row spans the first four columns.
    const totalWidth = widths.slice(0, 4).reduce((sum, width) => sum + width, 0);
    const height = LINE_HEIGHT + padding * 2;
    await ensureSpace(height + 4);
    page.drawRectangle({ x: margin, y: cursorY - height, width: totalWidth, height, borderWidth: 0.75, borderColor: lineColor });
    page.drawRectangle({ x: margin + totalWidth, y: cursorY - height, width: widths[4], height, borderWidth: 0.75, borderColor: lineColor });
    const label = toPdfText("Жалпы сумма / Итого");
    const totalText = toPdfText(formatMoney(total));
    const textY = cursorY - padding - TEXT_SIZE + 3;
    page.drawText(label, { x: margin + totalWidth - padding - bold.widthOfTextAtSize(label, TEXT_SIZE), y: textY, size: TEXT_SIZE, font: bold, color: TEXT_COLOR });
    page.drawText(totalText, { x: margin + contentWidth - padding - bold.widthOfTextAtSize(totalText, TEXT_SIZE), y: textY, size: TEXT_SIZE, font: bold, color: TEXT_COLOR });
    cursorY -= height + 12;
  }

  /** QR code with the public check page of this document, drawn as vector squares. */
  function drawQrCode(url, x, topY, size) {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
    const cell = size / modules.size;
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (modules.get(row, column)) {
          page.drawRectangle({
            x: x + column * cell,
            y: topY - (row + 1) * cell,
            width: cell + 0.05,
            height: cell + 0.05,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
  }

  async function drawStamp(signerName, verificationUrl, details) {
    await ensureSpace(STAMP_HEIGHT + LINE_HEIGHT * 2 + 12);
    const topY = cursorY + 10;
    const stamp = await drawSignatureStamp({
      pdfDoc,
      page,
      font,
      toPdfText,
      x: margin,
      topY,
      maxWidth: contentWidth - STAMP_HEIGHT - QR_GAP * 2 - 120,
      signerName,
    });
    const qrX = margin + stamp.width + QR_GAP;
    drawQrCode(verificationUrl, qrX, topY, STAMP_HEIGHT);
    const captionX = qrX + STAMP_HEIGHT + 10;
    const caption = wrap("QR аркылуу документтин чындыгын текшериңиз", margin + contentWidth - captionX);
    caption.forEach((line, index) => {
      page.drawText(line, { x: captionX, y: topY - 16 - index * LINE_HEIGHT, size: TEXT_SIZE, font, color: MUTED_COLOR });
    });
    cursorY = topY - STAMP_HEIGHT - LINE_HEIGHT;
    await drawLines(wrap(details), { color: MUTED_COLOR });
    cursorY -= 4;
  }

  // Right-hand block: "ТАКтын директору ...го" and the author "...дан".
  async function drawAddressBlock(lines) {
    const blockX = margin + contentWidth * 0.5;
    const wrapped = lines.flatMap((line) => wrap(line, margin + contentWidth - blockX));
    await ensureSpace(wrapped.length * LINE_HEIGHT + 8);
    await drawLines(wrapped, { x: blockX });
    cursorY -= layout.addressGap;
  }

  function drawCentered(text, lineFont = font, color = TEXT_COLOR) {
    const value = toPdfText(text);
    const width = lineFont.widthOfTextAtSize(value, TEXT_SIZE);
    page.drawText(value, {
      x: margin + Math.max(0, (contentWidth - width) / 2),
      y: cursorY,
      size: TEXT_SIZE,
      font: lineFont,
      color,
    });
    cursorY -= LINE_HEIGHT;
  }

  const signatureCode = crypto
    .createHash("sha256")
    .update(`${request.id}|${request.updatedAt || request.createdAt}|${director.fullName}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  drawFallbackFrame();

  // The letterhead template already carries the college name.
  if (!templatePdf) {
    drawCentered("ТАШ-КӨМҮР АЙМАКТЫК КОЛЛЕДЖИ", bold);
    cursorY -= 12;
  }

  await drawAddressBlock(buildAddressLines({ director: addressee, author }));
  await ensureSpace(LINE_HEIGHT * 3);
  drawCentered(getRequestHeading(request.type), bold);
  drawCentered(formatNumberAndDate(request.documentNumber, request.createdAt), font, MUTED_COLOR);
  cursorY -= layout.headingGap;

  await drawParagraph("Документтин аталышы / Название документа", request.documentTitle);
  await drawParagraph("Кайрылуунун түрү / Тип обращения", request.type);
  const fields = getRequestFields(request.type);
  if (fields.includes("period") && request.startDate) {
    await drawParagraph("Мөөнөтү / Период", formatPeriod(request.startDate, request.endDate));
  }
  if (fields.includes("period")) {
    await drawParagraph("Жок болгон убакыт / Время отсутствия", request.absenceTime);
  }
  if (fields.includes("trip")) {
    await drawParagraph("Кайда барат / Место назначения", request.destination);
    await drawParagraph("Максаты / Цель", request.purpose);
  }
  await drawParagraph("Кайрылуунун мазмуну / Суть обращения", request.reason);
  if (fields.includes("items") && request.items?.length) {
    await drawItemsTable(request.items, request.amount);
  }
  if (fields.includes("amount") && typeof request.amount === "number") {
    await drawParagraph("Сумма / Сумма", amountWithWords(request.amount));
  }
  await drawParagraph("Автордун комментарийи / Комментарий автора", request.comment);

  // Decision, stamp, QR code and the closing line stay together on one page.
  const signatureDetails = `Кол койгон: ${formatFullName(director.fullName)}. ЭЦП ${signatureCode}, ${formatSignedAt(
    request.updatedAt || request.createdAt
  )}`;
  const closingLine = "Документ автоматтык түрдө түзүлгөн жана расмий статуска ээ.";
  const commentLines = String(request.directorComment || "").trim() ? wrap(request.directorComment).length : 0;
  const signatureBlockHeight =
    (LINE_HEIGHT + layout.labelGap) * (2 + commentLines) +
    layout.paragraphGap +
    STAMP_HEIGHT +
    LINE_HEIGHT * (1 + wrap(signatureDetails).length + 1) +
    20;
  const pagesBefore = pdfDoc.getPageCount();
  await ensureSpace(signatureBlockHeight);
  const stampOnNewPage = pdfDoc.getPageCount() > pagesBefore;

  // An official PDF is issued only when the director approves, so the decision is always "approved".
  await drawDecision(request.directorComment);
  await drawStamp(director.fullName, buildVerificationUrl(signatureCode), signatureDetails);
  await drawLines([closingLine], { color: APPROVED_COLOR });

  return { pdfDoc, signatureCode, stampOnNewPage };
}

/** `director` signs the PDF; `addressee` is the college director the letter is written to. */
async function generateOfficialRequestPdf(options) {
  let result = await buildOfficialRequestPdf(options, REGULAR_LAYOUT);
  if (result.stampOnNewPage) {
    // A signature alone on the last page looks detached, so the letter is laid out tighter.
    result = await buildOfficialRequestPdf(options, COMPACT_LAYOUT);
  }
  const { pdfDoc, signatureCode } = result;
  const { request } = options;

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
      documentNumber: request.documentNumber,
    },
  };
}

module.exports = {
  generateOfficialRequestPdf,
};
