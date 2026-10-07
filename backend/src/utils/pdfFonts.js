const path = require("path");

// PT Sans (SIL Open Font License, assets/fonts/OFL.txt) covers Kyrgyz Cyrillic: ө, ү, ң.
const BUNDLED_FONT_PATH = path.join(__dirname, "..", "..", "assets", "fonts", "PT_Sans-Web-Regular.ttf");

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

module.exports = { getPdfFontCandidates };
