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

const pageWidth = 842;
const pageHeight = 595;

const colors = {
  bg: '#050505',
  panel: '#111116',
  panel2: '#17171d',
  line: '#383842',
  text: '#f5f5f2',
  muted: '#b9bac4',
  dim: '#858793',
  yellow: '#ffd400',
  yellowDim: '#7c6800',
  red: '#ff6767',
  green: '#51d88a',
  ink: '#050505',
};

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margin: 0,
  info: {
    Title: `Gremia.SBV Prospekt ${pkg.version}`,
    Author: 'Gremia.SBV',
    Subject: 'Lokale SBV-Software für vertrauliche Fallarbeit',
    Keywords: 'SBV, Schwerbehindertenvertretung, Datenschutz, SGB IX, Gremia.SBV',
    Creator: 'Gremia.SBV Prospektgenerator',
    Producer: 'PDFKit',
  },
});

doc.registerFont('Regular', fontRegular);
doc.registerFont('Bold', fontBold);
doc.pipe(fs.createWriteStream(outputPath));

function addPage() {
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
}

function background() {
  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.bg);
  doc.strokeColor('#171717').lineWidth(0.4);
  for (let x = 0; x <= pageWidth; x += 28) doc.moveTo(x, 0).lineTo(x, pageHeight).stroke();
  for (let y = 0; y <= pageHeight; y += 28) doc.moveTo(0, y).lineTo(pageWidth, y).stroke();
  doc.circle(690, 112, 92).fillOpacity(0.16).fill(colors.yellow).fillOpacity(1);
}

function footer(pageNumber) {
  doc.font('Regular').fontSize(8).fillColor(colors.dim)
    .text(`Gremia.SBV - Prospekt - Stand ${pkg.version}`, 46, 560, { width: 360 });
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

function kicker(text, x, y, width = 700) {
  doc.font('Bold').fontSize(8).fillColor(colors.yellow)
    .text(text.toUpperCase(), x, y, { width, characterSpacing: 3 });
}

function headline(text, x, y, width, size = 34) {
  doc.font('Bold').fontSize(size).lineGap(3).fillColor(colors.text).text(text, x, y, { width });
}

function body(text, x, y, width, size = 12.5, color = colors.muted, lineGap = 4) {
  doc.font('Regular').fontSize(size).lineGap(lineGap).fillColor(color).text(text, x, y, { width });
}

function smallCaps(text, x, y, width, color = colors.yellow) {
  doc.font('Bold').fontSize(7.5).fillColor(color).text(text.toUpperCase(), x, y, {
    width,
    characterSpacing: 2.6,
  });
}

function pill(text, x, y, width) {
  doc.rect(x, y, width, 23).strokeColor(colors.yellow).lineWidth(0.8).stroke();
  doc.font('Bold').fontSize(8).fillColor(colors.yellow)
    .text(text.toUpperCase(), x + 10, y + 7, { width: width - 20, characterSpacing: 1 });
}

function screenshotFrame(imagePath, x, y, width, caption) {
  if (!fs.existsSync(imagePath)) return;
  const height = width * 9 / 16;
  doc.rect(x - 8, y - 8, width + 16, height + 16).fillColor('#09090d').fill();
  doc.rect(x - 8, y - 8, width + 16, height + 16).strokeColor(colors.line).lineWidth(1).stroke();
  doc.image(imagePath, x, y, { width });
  if (caption) body(caption, x, y + height + 14, width, 8.5, colors.dim, 2);
}

function benefitCard(x, y, width, height, title, text, accent = colors.yellow) {
  doc.rect(x, y, width, height).fillColor(colors.panel).fill();
  doc.rect(x, y, width, height).strokeColor(colors.line).lineWidth(0.8).stroke();
  doc.rect(x, y, 68, 4).fillColor(accent).fill();
  doc.font('Bold').fontSize(13).fillColor(colors.text).text(title, x + 16, y + 18, { width: width - 32 });
  const titleHeight = doc.heightOfString(title, { width: width - 32 });
  doc.font('Regular').fontSize(10).lineGap(3).fillColor(colors.muted)
    .text(text, x + 16, y + 26 + titleHeight, { width: width - 32, height: height - titleHeight - 34 });
}

function numberedStep(number, title, text, x, y, width) {
  doc.circle(x + 18, y + 20, 18).fillColor(colors.yellow).fill();
  doc.font('Bold').fontSize(16).fillColor(colors.ink).text(String(number), x + 11, y + 10, { width: 14, align: 'center' });
  doc.font('Bold').fontSize(16).fillColor(colors.text).text(title, x + 52, y, { width });
  body(text, x + 52, y + 25, width, 11.2, colors.muted, 3);
}

function quote(text, x, y, width) {
  doc.rect(x, y, 4, 108).fillColor(colors.yellow).fill();
  doc.font('Bold').fontSize(22).lineGap(4).fillColor(colors.text).text(text, x + 22, y + 8, { width });
}

function bullet(text, x, y, width) {
  doc.font('Bold').fontSize(12).fillColor(colors.yellow).text('-', x, y, { width: 10 });
  body(text, x + 22, y - 1, width, 11.5, colors.muted, 3);
}

let pageNo = 1;

background();
brand();
kicker(`Open Source · SBV-Fachsoftware · v${pkg.version}`, 46, 130);
headline('Damit SBV-Arbeit nicht zwischen E-Mail, Excel und Bauchgefühl verschwindet.', 46, 160, 410, 31);
body('Gremia.SBV ist der lokale Arbeitsraum für Schwerbehindertenvertretungen: Fallakten, Fristen, Beteiligungen, Nachweise, Datenschutzprüfung und Übergaben - verschlüsselt, offline-first und ohne Telemetrie.', 46, 330, 410, 14);
pill('lokal', 46, 455, 64);
pill('verschlüsselt', 122, 455, 118);
pill('offline-first', 252, 455, 112);
pill('barrierearm', 376, 455, 112);
screenshotFrame(dashboardDarkImage, 490, 148, 300, 'Echter Dashboard-Screenshot im Dark-Mode mit Arbeitsübersicht, Fristen und Datenschutzstatus.');
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Zwei Modi, ein Arbeitsablauf', 46, 112);
headline('Dark und Light nutzen dieselben Masken, dieselben Komponenten und dieselbe Logik.', 46, 142, 720, 27);
body('Der Light-Mode ist kein Anhängsel. Er ist derselbe Arbeitsplatz mit eigener, kontrastreicher Farbwelt für andere Lichtverhältnisse und Vorlieben.', 46, 215, 720, 13);
smallCaps('Dark-Mode', 58, 286, 240);
screenshotFrame(dashboardDarkImage, 58, 306, 338);
smallCaps('Light-Mode', 446, 286, 240);
screenshotFrame(dashboardLightImage, 446, 306, 338);
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Aus Sicht der SBV', 46, 116);
headline('Die Frage ist nicht: Wo speichere ich etwas? Sondern: Was muss ich als Nächstes tun?', 46, 146, 720, 29);
quote('Ein Gespräch wird zur Fallakte. Aus der Fallakte entsteht eine Maßnahme. Aus der Maßnahme entsteht eine Frist. Und am Ende muss nachvollziehbar bleiben, warum gehandelt wurde.', 58, 275, 500);
benefitCard(620, 260, 180, 92, 'Kein HR-System', 'Gremia.SBV bleibt Werkzeug der SBV - nicht Personalakte und nicht Arbeitgeberablage.', colors.red);
benefitCard(620, 380, 180, 118, 'Kein Datensumpf', 'Datenschutzprüfung und Aufbewahrung werden als konkrete Arbeitsaufträge sichtbar.');
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Fallarbeit', 46, 110);
headline('Alles, was zu einem Fall gehört, bleibt beieinander.', 46, 140, 500, 28);
body('Die Fallakte bündelt Beratung, Maßnahmen, Notizen, Dokumente und Wiedervorlagen. Sie zeigt nicht nur Daten, sondern den Arbeitsstand: offen, wartend, eskaliert, abgeschlossen oder prüfpflichtig.', 46, 220, 505, 13);
numberedStep(1, 'Anlass festhalten', 'Beratung, BEM, Prävention, Kündigung, Gleichstellung, Arbeitsplatz oder Stellenbesetzung.', 58, 330, 480);
numberedStep(2, 'Maßnahme führen', 'Stellungnahme, Nachforderung, Gesprächsverlauf oder Beteiligungsverstoß direkt im Kontext.', 58, 405, 480);
numberedStep(3, 'Frist im Blick behalten', 'Dashboard und Fristenliste zeigen, woher die Frist kommt und springen zurück zum Vorgang.', 58, 480, 480);
benefitCard(590, 178, 205, 112, 'Für die tägliche Praxis', 'Nicht jedes Anliegen ist gleich groß. Gremia.SBV erlaubt kurze Dokumentation, echte Fallarbeit und bewusste Anonymisierung.');
benefitCard(590, 318, 205, 112, 'Für die Vertretung', 'Ausgewählte Fälle können zielgebunden übergeben und später als Rückgabe-Delta wieder eingelesen werden.', colors.green);
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Fristen, Datenschutz, Art. 15', 46, 112);
headline('Die App erinnert nicht nur. Sie erklärt, worum es geht.', 46, 142, 700, 30);
bullet('Fristen zeigen ihren fachlichen Kontext: Fallakte, Maßnahme, Wiedervorlage oder Datenschutzprüfung.', 70, 246, 560);
bullet('Aufbewahrungsregeln sind konfigurierbar; Löschung bleibt eine bewusste, begründete Entscheidung.', 70, 305, 560);
bullet('Die Art.-15-Zuarbeit sammelt gespeicherte Personen-, Fall-, Fristen-, Dokument- und Vorgangsdaten für die organisatorische Prüfung.', 70, 364, 560);
bullet('Temporäre Arbeitskopien werden kontrolliert behandelt und beim Sperren bereinigt.', 70, 440, 560);
benefitCard(640, 240, 160, 92, 'Auskunftsfähig', 'Die SBV sieht, welche lokalen Daten zu einer Person vorhanden sind.');
benefitCard(640, 360, 160, 92, 'Nachvollziehbar', 'Audit- und Lifecycle-Informationen stützen Prüfung und Rechenschaft.');
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Dokumente und Zusammenarbeit', 46, 112);
headline('Einheitliche PDFs statt Copy-and-paste-Schreiben.', 46, 142, 640, 30);
body('Einladungen, Wahlunterlagen, Stellungnahmen, Tätigkeitsberichte und Compliance-Unterlagen entstehen über dieselbe Dokumentpipeline im Gremia-Stil. Vorlagen nutzen Platzhalter, Signaturvorgaben und konkrete Fehlermeldungen.', 46, 222, 705, 13);
benefitCard(46, 330, 230, 105, 'Nach außen sauber', 'Externe Dokumente enthalten keine internen Prüftexte, technischen IDs oder Entwicklerhinweise.');
benefitCard(306, 330, 230, 105, 'Wahlakten unverfälscht', 'Rechtlich relevante Inhalte bleiben in Unicode erhalten - ohne Umlautersetzung oder stille Veränderung.', colors.green);
benefitCard(566, 330, 230, 105, 'Gremia.BR optional', 'Sitzungen lesen, TOP anfordern und erzeugte PDFs kontrolliert übergeben - ohne Produktzwang.');
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Für wen es gedacht ist', 46, 112);
headline('Für Vertrauenspersonen, die wenig Zeit und viel Verantwortung haben.', 46, 142, 640, 30);
benefitCard(58, 250, 210, 130, 'Neue SBV', 'Geführte Abläufe, Hilfe auf Abruf und klare nächste Schritte verhindern, dass wichtige Beteiligungsrechte im Alltag untergehen.');
benefitCard(316, 250, 210, 130, 'Erfahrene SBV', 'Fallakten, Vorlagen, Fristen, Wahlunterlagen und Berichte bleiben an einer Stelle statt in verstreuten Dateien.');
benefitCard(574, 250, 210, 130, 'Stellvertretung', 'Vertretungspakete enthalten genau die ausgewählten Fälle, die für eine sichere Weiterbearbeitung gebraucht werden.');
body('Gremia.SBV ersetzt keine rechtliche Beratung und keine organisatorische Datenschutzfreigabe. Es macht aber sichtbar, was vorhanden ist, was ansteht und was bewusst entschieden werden muss.', 80, 442, 670, 13);
footer(pageNo);

pageNo += 1; addPage(); background(); brand();
kicker('Fazit', 46, 112);
headline('Mehr Orientierung. Weniger Datenmüll. Bessere Nachweise.', 46, 142, 680, 33);
body('Gremia.SBV hilft der SBV, vertrauliche Arbeit so zu organisieren, wie sie tatsächlich entsteht: aus Gesprächen, Beteiligungen, Fristen, Dokumenten und Verantwortung. Lokal. Verschlüsselt. Nachvollziehbar.', 46, 260, 650, 15);
doc.rect(46, 390, 750, 52).strokeColor(colors.yellow).lineWidth(1.4).stroke();
doc.font('Bold').fontSize(14).fillColor(colors.yellow)
  .text(`Gremia.SBV ${pkg.version} - Open Source unter AGPL-3.0`, 62, 404, { width: 720 });
doc.font('Regular').fontSize(11).fillColor(colors.muted)
  .text('github.com/mclenburg/gremia-sbv', 62, 426, { width: 720 });
pill('keine Cloudpflicht', 46, 480, 136);
pill('keine Telemetrie', 196, 480, 132);
pill('lokaler Tresor', 342, 480, 120);
pill('SBV-Fokus', 476, 480, 100);
footer(pageNo);

doc.end();
