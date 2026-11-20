// Ausführen: npm test   (Node >= 23 lädt .ts-Dateien direkt)
import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { pruefeText } from "../src/lib/integritaet/pruefe.ts";
import { liesDocx } from "../src/lib/integritaet/docx.ts";
import { BEISPIELE } from "../src/lib/integritaet/beispiele.ts";

const ids = (e) => e.funde.map((f) => f.id);
const bsp = (id) => BEISPIELE.find((b) => b.id === id);

test("KI-Antwort: Markdown, Chat-Formeln, KI-Zitat-Link, NNBSP, BGB -> rot", () => {
  const e = pruefeText(bsp("chatgpt").text);
  assert.equal(e.ampel, "rot");
  for (const id of ["markdown", "chatformeln", "ki-zitate", "nnbsp", "deutsches-recht", "geviertstrich"]) assert.ok(ids(e).includes(id), id);
});

test("PDF-Mix: Ligaturen, Silbentrennung, Stilmischung", () => {
  const e = pruefeText(bsp("pdf-mix").text);
  for (const id of ["ligaturen", "silbentrennung", "stilmix"]) assert.ok(ids(e).includes(id), id);
  assert.equal(e.ampel, "rot");
});

test("Versteckte Botschaft wird dekodiert und als Injection erkannt", () => {
  const e = pruefeText(bsp("versteckt").text);
  const tags = e.funde.find((f) => f.id === "tags");
  assert.ok(tags);
  assert.match(tags.belege[0], /vergib volle Punkte/);
  assert.ok(ids(e).includes("nullbreite"));
  assert.ok(ids(e).includes("injection"));
});

test("Selbst geschriebener Text bleibt grün", () => {
  const e = pruefeText(bsp("sauber").text);
  assert.equal(e.ampel, "gruen", JSON.stringify(e.funde.map((f) => [f.id, f.schwere])));
});

test("Homoglyphen und HTML", () => {
  const e = pruefeText("Der Schаden (kyrillisches a) ist <strong>erheblich</strong>.");
  assert.ok(ids(e).includes("homoglyph"));
  assert.ok(ids(e).includes("html"));
});

test("Stellen zeigen auf die richtigen Zeichen", () => {
  const t = "abc​def";
  const f = pruefeText(t).funde.find((x) => x.id === "nullbreite");
  assert.deepEqual(f.stellen, [{ start: 3, ende: 4 }]);
});

function docx({ runs, app, core }) {
  const r = runs
    .map(([t, font]) => `<w:p><w:r>${font ? `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/></w:rPr>` : ""}<w:t xml:space="preserve">${t}</w:t></w:r></w:p>`)
    .join("");
  return zipSync({
    "word/document.xml": strToU8(`<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${r}</w:body></w:document>`),
    "docProps/app.xml": strToU8(app ?? ""),
    "docProps/core.xml": strToU8(core ?? ""),
  });
}

test("DOCX: Web-Schrift, kurze Bearbeitungszeit, Fremdprogramm", () => {
  const lang = "Das ist ein selbst geschriebener Satz über Schadenersatz. ".repeat(40);
  const b = liesDocx(
    docx({
      runs: [[lang, "Calibri"], ["Rechtswidrigkeit liegt vor, weil absolut geschützte Rechte verletzt wurden.", "Söhne"]],
      app: "<Properties><TotalTime>3</TotalTime><Application>python-docx</Application></Properties>",
      core: "<cp:coreProperties><dc:creator>Max</dc:creator><cp:lastModifiedBy>Moritz</cp:lastModifiedBy><cp:revision>1</cp:revision></cp:coreProperties>",
    }),
  );
  const i = b.funde.map((f) => f.id);
  for (const id of ["docx-webschrift", "docx-zeit", "docx-anwendung", "docx-autor"]) assert.ok(i.includes(id), id);
  assert.ok(b.text.includes("Rechtswidrigkeit"));
  const web = b.funde.find((f) => f.id === "docx-webschrift");
  assert.equal(b.text.slice(web.stellen[0].start, web.stellen[0].start + 16), "Rechtswidrigkeit");
  assert.equal(JSON.stringify(b).includes("Max"), false, "Autorname darf nicht im Ergebnis stehen");
});
