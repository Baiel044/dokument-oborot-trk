const path = require("path");

// PT Sans (SIL Open Font License, assets/fonts/OFL.txt) covers Kyrgyz Cyrillic: ө, ү, ң.
const BUNDLED_FONT_PATH = path.join(__dirname, "..", "..", "assets", "fonts", "PT_Sans-Web-Regular.ttf");

// Liberation Serif (SIL Open Font License, assets/fonts/LiberationSerif-LICENSE.txt) has the letter
// widths of Times New Roman, which cannot be shipped to a Linux server. It covers ө, ү, ң.
const SERIF_FONT_PATHS = {
  regular: path.join(__dirname, "..", "..", "assets", "fonts", "LiberationSerif-Regular.ttf"),
  bold: path.join(__dirname, "..", "..", "assets", "fonts", "LiberationSerif-Bold.ttf"),
};

/** Fonts with Cyrillic glyphs, best first. The bundled font makes PDFs identical on Windows and Linux. */
function getPdfFontCandidates() {
  const windowsDir = process.env.WINDIR || "C:\Windows";
  return [
    BUNDLED_FONT_PATH,
    path.join(windowsDir, "Fonts", "arial.ttf"),
    path.join(windowsDir, "Fonts", "segoeui.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
}

module.exports = { SERIF_FONT_PATHS, getPdfFontCandidates };
