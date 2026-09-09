#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outputPath = path.join(root, 'Gremia_SBV_Prospekt.pdf');
const dashboardDarkImage = path.join(root, 'docs/assets/gremia-sbv-dashboard-dark-preview.png');
const dashboardLightImage = path.join(root, 'docs/assets/gremia-sbv-dashboard-light-preview.png');
const iconImage = path.join(root, 'docs/assets/gremia-sbv-icon-128.png');
const fontRegular = path.join(root, 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const fontBold = path.join(root, 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');

const colors = {
  bg: '#050505',
  panel: '#111116',
  panel2: '#17171d',
  text: '#f5f5f2',
  muted: '#b9bac4',
  dim: '#858793',
  yellow: '#ffd400',
  line: '#383842',
  red: '#ff6767',
  green: '#51d88a',
};

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margin: 0,
  info: {
    Title: `Gremia.SBV Prospekt ${pkg.version}`,
    Author: 'Gremia.SBV',
    Subject: 'SBV-Software fuer Schwerbehindertenvertretungen',
    Keywords: 'SBV, Schwerbehindertenvertretung, Datenschutz, SGB IX, Gremia.SBV',
    Creator: 'Gremia.SBV Prospektgenerator',
    Producer: 'PDFKit',
  },
});

doc.registerFont('Regular', fontRegular);
doc.registerFont('Bold', fontBold);
doc.pipe(fs.createWriteStream(outputPath));

function page() {
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
}

function background() {
  doc.rect(0, 0, 842, 595).fill(colors.bg);
  doc.strokeColor('#171717').lineWidth(0.4);
  for (let x = 0; x <= 842; x += 28) doc.moveTo(x, 0).lineTo(x, 595).stroke();
  for (let y = 0; y <= 595; y += 28) doc.moveTo(0, y).lineTo(842, y).stroke();
  doc.circle(675, 110, 92).fillOpacity(0.18).fill(colors.yellow).fillOpacity(1);
}

function footer(pageNumber) {
  doc.font('Regular').fontSize(8).fillColor(colors.dim)
    .text(`Gremia.SBV - Werbeprospekt - Stand ${pkg.version}`, 46, 560, { width: 350 });
  doc.text(String(pageNumber), 786, 560, { width: 20, align: 'right' });
}

function brand(x = 46, y = 38) {
  doc.roundedRect(x, y, 220, 56, 2).strokeColor(colors.line).lineWidth(0.8).stroke();
  if (fs.existsSync(iconImage)) {
    doc.image(iconImage, x + 14, y + 11, { width: 34, height: 34 });
  } else {
    doc.rect(x + 14, y + 11, 34, 34).strokeColor(colors.yellow).stroke();
    doc.font('Bold').fontSize(12).fillColor(colors.yellow).text('SBV', x + 19, y + 22);
  }
  doc.font('Bold').fontSize(17).fillColor(colors.text).text('Gremia.SBV', x + 62, y + 14);
  doc.font('Bold').fontSize(8).fillColor(colors.muted).text('LOCAL', x + 62, y + 36, { characterSpacing: 4 });
}

function kicker(text, x, y) {
  doc.font('Bold').fontSize(8).fillColor(colors.yellow).text(text.toUpperCase(), x, y, { characterSpacing: 3 });
}

function h1(text, x, y, width = 620) {
  doc.font('Bold').fontSize(31).lineGap(3).fillColor(colors.text).text(text, x, y, { width });
}

function h2(text, x, y, width = 620) {
  doc.font('Bold').fontSize(25).lineGap(2).fillColor(colors.text).text(text, x, y, { width });
}

function body(text, x, y, width, options = {}) {
  doc.font('Regular').fontSize(options.size ?? 13).lineGap(options.lineGap ?? 5).fillColor(options.color ?? colors.muted)
    .text(text, x, y, { width, align: options.align ?? 'left' });
}

function pill(text, x, y, width) {
  doc.rect(x, y, width, 22).strokeColor(colors.yellow).lineWidth(0.7).stroke();
  doc.font('Bold').fontSize(8).fillColor(colors.yellow).text(text.toUpperCase(), x + 10, y + 7, { width: width - 20, characterSpacing: 1 });
}

function card(x, y, w, h, title, text, accent = colors.yellow) {
  doc.rect(x, y, w, h).fillColor(colors.panel).fill();
  doc.rect(x, y, w, h).strokeColor(colors.line).lineWidth(0.8).stroke();
  doc.rect(x, y, 58, 3).fillColor(accent).fill();
  const titleWidth = w - 32;
  doc.font('Bold').fontSize(13).fillColor(colors.text);
  doc.text(title, x + 16, y + 18, { width: titleWidth });
  const titleHeight = doc.heightOfString(title, { width: titleWidth });
  doc.font('Regular').fontSize(10.5).lineGap(3).fillColor(colors.muted)
    .text(text, x + 16, y + 24 + titleHeight, { width: titleWidth });
}

function bulletList(items, x, y, width) {
  let cursor = y;
  for (const item of items) {
    doc.font('Bold').fontSize(12).fillColor(colors.yellow).text('-', x, cursor, { width: 12 });
    doc.font('Regular').fontSize(11.5).lineGap(3).fillColor(colors.muted).text(item, x + 22, cursor, { width });
    cursor += Math.max(34, doc.heightOfString(item, { width, lineGap: 3 }) + 10);
  }
}

function screenshotFrame(imagePath, x, y, w) {
  if (!fs.existsSync(imagePath)) return;
  doc.rect(x - 8, y - 8, w + 16, (w * 9 / 16) + 16).fillColor('#09090d').fill();
  doc.rect(x - 8, y - 8, w + 16, (w * 9 / 16) + 16).strokeColor(colors.line).stroke();
  doc.image(imagePath, x, y, { width: w });
}

let pageNo = 1;
background();
brand();
kicker(`Open Source · SBV-Fachsoftware · v${pkg.version}`, 46, 138);
h1('Der lokale Arbeitsraum für SBV-Arbeit', 46, 166, 390);
body('Software für Schwerbehindertenvertretungen: Gremia.SBV unterstützt vertrauliche Arbeit mit Personenverzeichnis, Fallakten, Fristen, Dokumentation, Datenschutzprüfung, sicheren Übergaben und optionaler Gremia.BR-Anbindung - ohne Cloudpflicht und ohne Telemetrie.', 46, 292, 390, { size: 14 });
pill('lokal', 46, 456, 64);
pill('verschlüsselt', 122, 456, 118);
pill('offline-first', 252, 456, 112);
pill('light/dark', 376, 456, 96);
screenshotFrame(dashboardDarkImage, 470, 150, 330);
body('Aktueller Dashboard-Screenshot im Dark-Mode. Light-Mode ist ein gleichwertiger Arbeitsmodus.', 470, 348, 330, { size: 9, color: colors.dim });
footer(pageNo);

pageNo += 1; page(); background(); brand();
kicker('Zwei Arbeitsmodi', 46, 118);
h2('Dark und Light folgen demselben Gremia.SBV-Styleguide', 46, 148, 680);
body('Der helle Modus ist kein Kompromiss, sondern derselbe Arbeitsbereich mit eigener, kontrastreicher Farbwelt. Beide Modi nutzen dieselben Layout-, Komponenten- und Bedienregeln.', 46, 208, 700);
kicker('Dark-Mode', 58, 274);
screenshotFrame(dashboardDarkImage, 58, 294, 340);
kicker('Light-Mode', 444, 274);
screenshotFrame(dashboardLightImage, 444, 294, 340);
footer(pageNo);

pageNo += 1; page(); background(); brand();
kicker('Warum Gremia.SBV', 46, 118);
h2('Fokus auf echte SBV-Arbeit - nicht auf Datenablage um der Datenablage willen', 46, 148, 720);
body('Die Anwendung bildet Arbeitsabläufe ab: Anlass erkennen, Person oder Fall einordnen, Beteiligung prüfen, Fristen nachhalten, Dokumente erzeugen und Entscheidungen nachvollziehbar dokumentieren.', 46, 218, 720);
card(46, 300, 350, 96, 'Fallakten und Maßnahmen', 'Zentrale Arbeitsmappe für Anliegen, Maßnahmen, Dokumente, Notizen, Fristen und Datenschutzstatus. Gleiche Funktionen liegen an gleichen Stellen.');
card(446, 300, 350, 96, 'Fristen und Datenschutz', 'Fristen zeigen ihren Ursprung, bleiben verlängerbar und führen direkt zum Kontext. Aufbewahrung und Löschprüfung sind konfigurierbar.');
card(46, 420, 350, 96, 'Dokumente und Berichte', 'Einheitliche PDF-Erzeugung im Gremia-Stil, mit Vorlagen, Platzhaltern, Signaturvorgaben und bewusster Freigabe.');
card(446, 420, 350, 96, 'Übergaben und Gremia.BR', 'Vertretung, Rückgabe-Delta, Amtsübergabe und optionale Gremia.BR-Anbindung bleiben eigenständig und kontrolliert.');
footer(pageNo);

pageNo += 1; page(); background(); brand();
kicker('Arbeitsablauf', 46, 118);
h2('Vom Anlass zum belastbaren Nachweis', 46, 148, 520);
const steps = [
  ['1', 'Anlass erfassen', 'Beratung, Beteiligung, BEM, Prävention, Kündigung, Stellenbesetzung oder Gleichstellung/GdB.'],
  ['2', 'Kontext verbinden', 'Person, Fallakte, Maßnahme, Frist, Dokument und Journal bleiben nachvollziehbar verknüpft.'],
  ['3', 'Nächsten Schritt sehen', 'Status, Risiken, Wiedervorlagen und Hilfetexte führen durch den fachlich passenden Ablauf.'],
  ['4', 'Nachweis sichern', 'Entscheidungen, Fristen, Dokumente und Datenschutzfolgen bleiben prüfbar, aber datensparsam.'],
];
let y = 230;
for (const [number, title, text] of steps) {
  doc.circle(70, y + 20, 18).fillColor(colors.yellow).fill();
  doc.font('Bold').fontSize(16).fillColor('#050505').text(number, 64, y + 10, { width: 12, align: 'center' });
  doc.font('Bold').fontSize(16).fillColor(colors.text).text(title, 106, y);
  doc.font('Regular').fontSize(11.5).lineGap(3).fillColor(colors.muted).text(text, 106, y + 25, { width: 530 });
  y += 78;
}
card(650, 230, 150, 140, 'Hilfe dort, wo sie gebraucht wird', 'Hilfetexte liegen nicht als Wand auf der Maske, sondern kontextbezogen hinter Hilfe-Funktionen.');
card(650, 390, 150, 100, 'Barrierefreiheit', 'Tastaturbedienung, Fokusführung, Kontrast und Screenreader-Hinweise sind verbindliche Entwicklungsziele.', colors.green);
footer(pageNo);

pageNo += 1; page(); background(); brand();
kicker('Datenschutz und Sicherheit', 46, 118);
h2('Vertraulich arbeiten, bewusst weitergeben', 46, 148, 620);
bulletList([
  'Lokaler, verschlüsselter Tresor statt Arbeitgebercloud oder Telemetrie.',
  'Temporäre Arbeitskopien werden kontrolliert behandelt und beim Sperren bereinigt.',
  'Aufbewahrungsfristen sind konfigurierbar; Löschungen bleiben manuelle, begründete Entscheidungen.',
  'Art.-15-Zuarbeit sammelt relevante lokale Daten vollständig und markiert prüfpflichtige Fundstellen.',
  'Exporte und Übergaben sind zielgebunden; Import erfolgt erst nach prüfbarem Importplan.',
], 60, 235, 520);
card(620, 230, 180, 130, 'Vollständige Zuarbeit', 'Auskunfts- und Übergabefunktionen sammeln relevante Daten umfassend und prüfbar.');
card(620, 382, 180, 130, 'Nachvollziehbar', 'Audit- und Lifecycle-Informationen stützen Datenschutzprüfung und Rechenschaft.');
footer(pageNo);

pageNo += 1; page(); background(); brand();
kicker('Gremia.BR optional', 46, 118);
h2('Medienbrucharm zusammenarbeiten - ohne Produktzwang', 46, 148, 650);
body('Gremia.SBV funktioniert eigenständig. Ist eine Gremia.BR-Instanz konfiguriert, kann die SBV Sitzungen lesen, eigene Themen einbringen und von Gremia.SBV erzeugte PDF-Dokumente kontrolliert übergeben.', 46, 218, 700);
card(46, 300, 230, 112, 'Sitzungen importieren', 'BR-Sitzungen und Agendabezug können gelesen und in Gremia.SBV übernommen werden, statt Termine abzutippen.');
card(306, 300, 230, 112, 'Dokumente freigeben', 'Nur bewusst erzeugte PDFs werden übergeben; Fallzusammenfassungen können den BR-Kontext herstellen.');
card(566, 300, 230, 112, 'Eigenständigkeit', 'Keine Pflicht zur Kopplung: beide Produkte müssen auch ohne das jeweils andere sinnvoll funktionieren.');
footer(pageNo);

pageNo += 1; page(); background(); brand();
kicker('Fazit', 46, 118);
h1('Mehr Orientierung. Weniger Datenmüll. Bessere Nachweise.', 46, 150, 720);
body('Gremia.SBV ist für Vertrauenspersonen gedacht, die Rechte aus dem SGB IX im Alltag sicher nachhalten wollen: lokal, strukturiert, datenschutzbewusst, barrierefrei ausgerichtet und nachvollziehbar.', 46, 270, 650, { size: 15 });
card(46, 370, 230, 90, 'Für die SBV', 'Fallarbeit, Beteiligung, Fristen, Verfahren und Nachweise in einer Arbeitsoberfläche.');
card(306, 370, 230, 90, 'Für neue Vertrauenspersonen', 'Geführte Abläufe, Hilfe-on-demand, Warnungen und konkrete nächste Schritte.');
card(566, 370, 230, 90, 'Für Kontrolle', 'Local-first, Exportbewusstsein, Datenschutz-Lifecycle und nachvollziehbare Dokumente.');
doc.rect(46, 500, 750, 32).strokeColor(colors.yellow).lineWidth(1.4).stroke();
doc.font('Bold').fontSize(13).fillColor(colors.yellow)
  .text(`Gremia.SBV ${pkg.version} - Open Source unter AGPL-3.0 - github.com/mclenburg/gremia-sbv`, 62, 509, { width: 720 });
footer(pageNo);

doc.end();
