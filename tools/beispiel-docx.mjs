// Erzeugt public/beispiele/abgabe-beispiel.docx für Vorführungen:
// eigener Text in Calibri + ein aus ChatGPT eingefügter Absatz (Schrift „Söhne“,
// grauer Hintergrund) + Metadaten mit 4 Minuten Bearbeitungszeit.
// Ausführen: node tools/beispiel-docx.mjs
import { zipSync, strToU8 } from "fflate";
import { writeFileSync } from "node:fs";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const run = (t, { font, shd } = {}) =>
  `<w:r>${font || shd ? `<w:rPr>${font ? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>` : ""}${shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>` : ""}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const p = (...runs) => `<w:p>${runs.join("")}</w:p>`;

const eigen = [
  "Sachverhalt: A rennt durch das Wohnzimmer des B und stößt dabei eine Vase um, die zu Bruch geht. B verlangt Ersatz.",
  "Der Anspruch des B könnte sich aus § 1295 Abs 1 ABGB ergeben. Dafür braucht es einen Schaden, Kausalität, Rechtswidrigkeit und Verschulden. Die Vase ist zerbrochen, damit liegt ein positiver Schaden vor. Ohne das Rennen des A wäre die Vase nicht umgefallen, sein Verhalten ist daher kausal im Sinne der conditio sine qua non. Auch die Adäquanz ist gegeben, weil es nicht außerhalb jeder Lebenserfahrung liegt, dass beim Laufen in einem Raum etwas umgestoßen wird.",
  "Rechtswidrig ist das Verhalten, weil A in das Eigentum des B eingegriffen hat. Eigentum ist ein absolut geschütztes Recht, ein Rechtfertigungsgrund ist nicht ersichtlich. Eine Notwehrsituation oder eine Einwilligung des B liegt nach dem Sachverhalt nicht vor.",
];
const ki =
  "Hinsichtlich des Verschuldens ist festzuhalten, dass gemäß § 1294 ABGB bereits leichte Fahrlässigkeit genügt. Maßstab ist dabei die Sorgfalt eines durchschnittlich sorgfältigen Menschen in der konkreten Situation. Wer in einem fremden Wohnraum mit erkennbar zerbrechlichen Gegenständen rennt, verletzt diese objektive Sorgfaltspflicht — das Verschulden ist somit zu bejahen.";
const schluss = "Ergebnis: B hat gegen A einen Anspruch auf Ersatz des Wertes der Vase gemäß § 1295 Abs 1 ABGB.";

const body = [...eigen.map((t) => p(run(t))), p(run(ki, { font: "Söhne", shd: "F7F7F8" })), p(run(schluss))].join("");
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

const files = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
  "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="de-AT"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`,
  "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Muster Studentin</dc:creator><cp:lastModifiedBy>Muster Studentin</cp:lastModifiedBy><cp:revision>2</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">2026-11-18T09:12:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-18T09:17:00Z</dcterms:modified></cp:coreProperties>`,
  "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Template>Normal.dotm</Template><TotalTime>4</TotalTime><Pages>1</Pages><Words>243</Words><Application>Microsoft Office Word</Application><AppVersion>16.0000</AppVersion></Properties>`,
};
writeFileSync(
  new URL("../public/beispiele/abgabe-beispiel.docx", import.meta.url),
  zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))),
);
console.log("public/beispiele/abgabe-beispiel.docx geschrieben");
