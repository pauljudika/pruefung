// Minimaler PDF-Erzeuger für Tests und Demo-Dateien (Helvetica, WinAnsi).
// zeilen: [{ text, x?, y, groesse?, farbe?: [r,g,b], modus?: 0|3 }]
export function baueePdf({ zeilen, info = {}, links = [] }) {
  const latin1 = (s) => s.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, (c) => {
    const code = c.charCodeAt(0);
    return code < 256 ? "\\" + code.toString(8).padStart(3, "0") : "?";
  });
  const strom = zeilen
    .map(({ text, x = 72, y, groesse = 11, farbe = [0, 0, 0], modus = 0 }) => `BT ${farbe.join(" ")} rg ${modus} Tr /F1 ${groesse} Tf ${x} ${y} Td (${latin1(text)}) Tj ET`)
    .join("\n");
  const annots = links.map((_, i) => `${6 + i} 0 R`).join(" ");
  const objekte = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R${annots ? ` /Annots [${annots}]` : ""} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(strom, "latin1")} >>\nstream\n${strom}\nendstream`,
    ...links.map((url) => `<< /Type /Annot /Subtype /Link /Rect [72 50 300 60] /A << /S /URI /URI (${latin1(url)}) >> >>`),
  ];
  const infoObj = Object.keys(info).length ? `<< ${Object.entries(info).map(([k, v]) => `/${k} (${latin1(v)})`).join(" ")} >>` : null;
  if (infoObj) objekte.push(infoObj);
  let out = "%PDF-1.4\n";
  const offs = [];
  objekte.forEach((o, i) => {
    offs.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R${infoObj ? ` /Info ${objekte.length} 0 R` : ""} >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}
