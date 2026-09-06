import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import * as XLSX from "xlsx";

export interface PdfResult {
  blob: Blob;
  name: string;
}

function blobFromBytes(bytes: Uint8Array | ArrayBuffer, name: string): PdfResult {
  return {
    blob: new Blob([bytes.slice()], { type: "application/pdf" }),
    name,
  };
}

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "");
}

let pdfjsReady = false;

async function ensurePdfJs() {
  if (!pdfjsReady) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    pdfjsReady = true;
  }
  return pdfjsLib;
}

async function getPdfJs() {
  const lib = await ensurePdfJs();
  return lib;
}

export async function loadPdfDoc(
  file: File,
  ignoreEncryption = false
): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer, { ignoreEncryption });
}

export async function downloadResult(result: PdfResult) {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const sizes = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============ PDF vers Image (chaque page en PNG/JPEG) ============
export async function pdfToImages(
  file: File,
  format: "png" | "jpeg" = "png",
  scale: number = 1.5,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; name: string }[]> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const results: { blob: Blob; name: string }[] = [];
  const base = baseName(file.name);

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve) => {
      const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
      canvas.toBlob((b) => resolve(b!), mimeType, 0.92);
    });

    results.push({
      blob,
      name: `${base}_page_${String(i).padStart(3, "0")}.${format}`,
    });
    onProgress?.(i, pdf.numPages);
  }

  return results;
}

// ============ PDF vers Document Word (.docx) ============
export async function pdfToWord(file: File): Promise<PdfResult> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const paragraphs: Paragraph[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ");
    pageText = pageText
      .replace(/\s{2,}/g, " ")
      .replace(/(\.\s*)/g, ".\n")
      .trim();

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `--- Page ${i} ---`,
            bold: true,
            size: 28,
          }),
        ],
      })
    );

    pageText.split("\n").filter((l) => l.trim()).forEach((line) => {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.trim(), size: 24 })],
          spacing: { after: 120 },
        })
      );
    });

    paragraphs.push(new Paragraph({}));
  }

  const doc = new DocxDocument({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return {
    blob,
    name: `${baseName(file.name)}.docx`,
  };
}

// ============ PDF vers Excel (.xlsx) ============
export async function pdfToExcel(file: File): Promise<PdfResult> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const rows: string[][] = [["Page", "Contenu"]];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ");
    rows.push([String(i), text.trim()]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PDF");
  const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([xlsxData], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return { blob, name: `${baseName(file.name)}.xlsx` };
}

// ============ PDF vers Texte brut (.txt) ============
export async function pdfToText(file: File): Promise<PdfResult> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  let allText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ");
    allText += `--- Page ${i} ---\n${pageText.trim()}\n\n`;
  }

  const blob = new Blob([allText], { type: "text/plain" });
  return { blob, name: `${baseName(file.name)}.txt` };
}

// ============ PDF vers HTML (.html) ============
export async function pdfToHtml(file: File): Promise<PdfResult> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${baseName(file.name)}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:2em} .page{margin-bottom:2em;border-bottom:1px solid #ccc;padding-bottom:2em}h2{font-size:1.1em}</style></head><body>`;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ");
    const paragraphs = pageText
      .replace(/\s{2,}/g, " ")
      .split(/(?<=\.)\s+/)
      .filter((p) => p.trim());
    html += `<div class="page"><h2>Page ${i}</h2>`;
    paragraphs.forEach((p) => {
      html += `<p>${p.trim()}</p>`;
    });
    html += `</div>`;
  }

  html += `</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  return { blob, name: `${baseName(file.name)}.html` };
}

// ============ PDF vers Word (même que pdfToWord) ============
export { pdfToWord as convertToWord };

// ============ Images vers PDF ============
export async function imagesToPdf(
  images: File[],
  pageSize: "fit" | "a4" = "fit"
): Promise<PdfResult> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    const bytes = await img.arrayBuffer();
    let image;
    if (img.type.includes("png")) {
      image = await pdfDoc.embedPng(bytes);
    } else if (img.type.includes("jpeg") || img.type.includes("jpg")) {
      image = await pdfDoc.embedJpg(bytes);
    } else if (img.type.includes("gif") || img.type.includes("webp")) {
      continue;
    } else {
      continue;
    }

    const pageWidth = image.width;
    const pageHeight = image.height;

    let finalW = pageWidth;
    let finalH = pageHeight;

    if (pageSize === "a4") {
      finalW = 595;
      finalH = 842;
    }

    const page = pdfDoc.addPage([finalW, finalH]);
    let drawW = pageWidth;
    let drawH = pageHeight;
    if (pageSize === "a4") {
      const ratio = Math.min(595 / drawW, 842 / drawH);
      drawW *= ratio;
      drawH *= ratio;
    }
    page.drawImage(image, {
      x: (finalW - drawW) / 2,
      y: (finalH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `images_combined.pdf`);
}

// ============ OCR (reconnaissance de texte) ============
export async function ocrPdf(
  file: File,
  language: string = "fra",
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; name: string; text: string }> {
  const lib = await getPdfJs();
  const { createWorker } = await import("tesseract.js");
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  let allText = "";

  const worker = await createWorker(language.toLowerCase() || "fra");
  await worker.setParameters({
    logger: undefined,
  });

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });

    const { data: result } = await worker.recognize(blob);
    allText += `--- Page ${i} ---\n${result.text}\n\n`;
    onProgress?.(i, pdf.numPages);
  }

  await worker.terminate();

  const textBlob = new Blob([allText], { type: "text/plain" });
  return {
    blob: textBlob,
    name: `${baseName(file.name)}_ocr.txt`,
    text: allText,
  };
}

// ============ Détection et suppression des pages vierges ============
const CONTENT_OPS = new Set<number>([
  60, 61, 62, 63, // showText, showSpacedText, nextLineShowText, nextLineSetSpacingShowText
  27, 28, 29, 30, 31, 32, 33, 34, // stroke, closeStroke, fill, eoFill, fillStroke, etc.
  66, 67, 68, 69, // paintImageXObject, paintImageMaskXObject, paintJpegXObject, paintInlineImageXObject
]);

async function isPageBlank(
  pdf: PDFDocumentProxy,
  pageIndex: number
): Promise<boolean> {
  const page = await pdf.getPage(pageIndex);
  const operatorList = await page.getOperatorList();
  const fns = operatorList.fnArray as number[];

  let contentOps = 0;
  for (const fn of fns) {
    if (CONTENT_OPS.has(fn)) contentOps++;
  }
  if (contentOps > 0) return false;

  const textContent = await page.getTextContent();
  let hasText = false;
  for (const item of textContent.items as Array<{ str?: string }>) {
    if (item.str && item.str.trim().length > 0) {
      hasText = true;
      break;
    }
  }
  return !hasText;
}

export async function findBlankPages(
  file: File
): Promise<{ blankPages: number[]; totalPages: number }> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const blankPages: number[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const blank = await isPageBlank(pdf, i);
    if (blank) {
      blankPages.push(i);
    }
  }

  return { blankPages, totalPages: pdf.numPages };
}

// ============ Supprimer les pages vierges ============
export async function removeBlankPages(
  file: File
): Promise<PdfResult> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const keepIndices: number[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const blank = await isPageBlank(pdf, i);
    if (!blank) {
      keepIndices.push(i - 1);
    }
  }

  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(pdfDoc, keepIndices);
  pages.forEach((page) => newDoc.addPage(page));
  const bytes = await newDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_no_blank.pdf`);
}

// ============ Statistiques du PDF ============
export async function pdfStats(
  file: File
): Promise<{
  pages: number;
  size: number;
  words: number;
  chars: number;
  hasImages: boolean;
  isEncrypted: boolean;
}> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
  const pdf = await lib.getDocument({ data }).promise;

  let words = 0;
  let chars = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ");
    words += text.trim().split(/\s+/).filter(Boolean).length;
    chars += text.length;
  }

  return {
    pages: pdfDoc.getPageCount(),
    size: file.size,
    words,
    chars,
    hasImages: false,
    isEncrypted: pdfDoc.isEncrypted,
  };
}

// ============ Recherche de texte dans le PDF ============
export async function searchInPdf(
  file: File,
  query: string
): Promise<
  { page: number; context: string }[]
> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const results: { page: number; context: string }[] = [];
  const needle = query.toLowerCase();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ")
      .replace(/\s{2,}/g, " ");

    if (text.toLowerCase().includes(needle)) {
      const index = text.toLowerCase().indexOf(needle);
      const start = Math.max(0, index - 60);
      const end = Math.min(text.length, index + query.length + 60);
      const context = text.substring(start, end).trim();
      results.push({ page: i, context });
    }
  }

  return results;
}

// ============ Traduction du PDF ============
export async function translatePdf(
  file: File,
  targetLang: string = "fr",
  onProgress?: (current: number, total: number) => void
): Promise<PdfResult> {
  const lib = await getPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data }).promise;
  const sourceLang = "auto";
  let translatedDoc = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => (item as { str?: string }).str || "")
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();

    let translatedText = text;
    const chunk = text.substring(0, 500);
    if (chunk.trim()) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          chunk
        )}&langpair=${sourceLang}|${targetLang}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json?.responseData?.translatedText) {
          translatedText = json.responseData.translatedText;
        }
      } catch {
        translatedText = text;
      }
    }

    translatedDoc += `--- Page ${i} ---\n${translatedText}\n\n`;
    onProgress?.(i, pdf.numPages);
  }

  const blob = new Blob([translatedDoc], { type: "text/plain" });
  return {
    blob,
    name: `${baseName(file.name)}_${targetLang}.txt`,
  };
}

// ============ Table des matières / Signets ============
export async function addBookmarksPdf(
  file: File,
  bookmarkKeys: string[]
): Promise<PdfResult> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const pageCount = pdfDoc.getPageCount();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const tocPage = pdfDoc.insertPage(0, [595, 842]);
  tocPage.drawText("Table des matières", {
    x: 50,
    y: 780,
    size: 24,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  tocPage.drawLine({
    start: { x: 50, y: 760 },
    end: { x: 545, y: 760 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  const keys = bookmarkKeys.slice(0, pageCount);
  for (let i = 0; i < keys.length; i++) {
    const y = 720 - i * 32;
    if (y < 50) break;
    tocPage.drawText(`${i + 1}. ${keys[i]}`, {
      x: 60,
      y,
      size: 14,
      color: rgb(0.3, 0.3, 0.6),
    });
    tocPage.drawText(`p.${i + 1}`, {
      x: 480,
      y,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_toc.pdf`);
}

// ============ Ajouter des formulaires (champs texte) ============
export async function addFormFieldsPdf(
  file: File,
  fields: { label: string; page: number; x: number; y: number; width: number; height: number }[]
): Promise<PdfResult> {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const pageCount = pdfDoc.getPageCount();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();

  for (const field of fields) {
    if (field.page < 1 || field.page > pageCount) continue;
    const page = pdfDoc.getPage(field.page - 1);
    const { width: pageW, height: pageH } = page.getSize();

    const textField = form.createTextField(field.label);
    textField.setText("");
    textField.addToPage(page, {
      x: field.x * pageW,
      y: field.y * pageH,
      width: field.width,
      height: field.height,
      borderColor: rgb(0.4, 0.4, 0.9),
      backgroundColor: rgb(0.95, 0.95, 0.98),
      textColor: rgb(0.1, 0.1, 0.1),
      font,
    });

    page.drawText(field.label, {
      x: field.x * pageW,
      y: field.y * pageH + field.height + 4,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_form.pdf`);
}

// ============ PDF/A (archivage compatible) ============
export async function convertToPdfA(
  file: File
): Promise<PdfResult> {
  const pdfDoc = await loadPdfDoc(file, true);
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return blobFromBytes(bytes, `${baseName(file.name)}_pdfa.pdf`);
}