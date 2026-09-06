import { PDFDocument } from "pdf-lib";

export interface PdfPageInfo {
  pageNumber: number;
  selected: boolean;
}

export interface SplitOption {
  type: "pages" | "ranges" | "every-n";
  pages?: number[];
  ranges?: string;
  everyN?: number;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });
  return pdfDoc.getPageCount();
}

export async function splitPdf(
  file: File,
  options: SplitOption
): Promise<{ blob: Blob; name: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const results: { blob: Blob; name: string }[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  if (options.type === "pages" && options.pages) {
    for (const pageNum of options.pages) {
      if (pageNum >= 1 && pageNum <= pageCount) {
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [pageNum - 1]);
        newDoc.addPage(copiedPage);
        const pdfBytes = await newDoc.save();
        results.push({
          blob: new Blob([new Uint8Array(pdfBytes.buffer)], { type: "application/pdf" }),
          name: `${baseName}_page_${pageNum}.pdf`,
        });
      }
    }
  } else if (options.type === "ranges" && options.ranges) {
    const pageNumbers = parseRangeString(options.ranges, pageCount);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(
      pdfDoc,
      pageNumbers.map((p) => p - 1)
    );
    copiedPages.forEach((page) => newDoc.addPage(page));
    const pdfBytes = await newDoc.save();
    results.push({
      blob: new Blob([new Uint8Array(pdfBytes.buffer)], { type: "application/pdf" }),
      name: `${baseName}_extracted.pdf`,
    });
  } else if (options.type === "every-n" && options.everyN) {
    const n = options.everyN;
    for (let i = 0; i < pageCount; i += n) {
      const end = Math.min(i + n, pageCount);
      const newDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - i }, (_, idx) => i + idx);
      const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));
      const pdfBytes = await newDoc.save();
      const startPage = i + 1;
      const endPage = end;
      results.push({
        blob: new Blob([new Uint8Array(pdfBytes.buffer)], { type: "application/pdf" }),
        name: `${baseName}_pages_${startPage}-${endPage}.pdf`,
      });
    }
  }

  return results;
}

export function parseRangeString(rangeStr: string, maxPage: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((s) => parseInt(s.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPage, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pages.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPage) {
        pages.add(num);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
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
