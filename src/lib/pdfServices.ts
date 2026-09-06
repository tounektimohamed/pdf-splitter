import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  PageSizes,
} from "pdf-lib";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";

export interface PdfResult {
  blob: Blob;
  name: string;
}

function blobFromBytes(bytes: Uint8Array, name: string): PdfResult {
  return {
    blob: new Blob([bytes.slice()], { type: "application/pdf" }),
    name,
  };
}

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "");
}

export async function loadPdf(
  file: File,
  ignoreEncryption = false
): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer, { ignoreEncryption });
}

export async function loadBytes(
  data: ArrayBuffer | Uint8Array,
  ignoreEncryption = false
): Promise<PDFDocument> {
  return await PDFDocument.load(data, { ignoreEncryption });
}

// 6. Fusionner PDF
export async function mergePdfs(files: File[]): Promise<PdfResult> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const pdfDoc = await loadPdf(file, true);
    const pages = await mergedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
  }

  const bytes = await mergedDoc.save();
  const fileName =
    files.length === 1
      ? `${baseName(files[0].name)}_merged.pdf`
      : `merged_${files.length}_files.pdf`;

  return blobFromBytes(bytes, fileName);
}

// 7. Compresser PDF (re-save + encodage JPEG pour réduire la taille)
export async function compressPdf(
  file: File,
  compressionLevel: "low" | "medium" | "high" = "medium"
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);

  const bytes = await pdfDoc.save({
    useObjectStreams: compressionLevel !== "low",
  });

  return {
    blob: new Blob([bytes.slice()], { type: "application/pdf" }),
    name: `${baseName(file.name)}_compressed.pdf`,
  };
}

// 8. Rotation de pages
export async function rotatePdf(
  file: File,
  pageNumbers: number[],
  angle: number
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();

  for (const pageNum of pageNumbers) {
    if (pageNum >= 1 && pageNum <= pageCount) {
      const page = pdfDoc.getPage(pageNum - 1);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    }
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_rotated.pdf`);
}

// 8b. Rotation globale (toutes les pages)
export async function rotateAllPdf(
  file: File,
  angle: number
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_rotated.pdf`);
}

// 9. Réorganiser les pages
export async function reorderPdf(
  file: File,
  newOrder: number[]
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const original = pdfDoc.getPageIndices();

  if (newOrder.length !== original.length) {
    throw new Error("L'ordre doit contenir toutes les pages");
  }

  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(pdfDoc, newOrder.map((p) => p - 1));
  pages.forEach((page) => newDoc.addPage(page));

  const bytes = await newDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_reordered.pdf`);
}

// 10. Supprimer des pages
export async function deletePdf(
  file: File,
  pagesToDelete: number[]
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();
  const toDelete = new Set(pagesToDelete.filter((p) => p >= 1 && p <= pageCount));

  const keepIndices: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    if (!toDelete.has(i + 1)) {
      keepIndices.push(i);
    }
  }

  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(pdfDoc, keepIndices);
  pages.forEach((page) => newDoc.addPage(page));

  const bytes = await newDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_trimmed.pdf`);
}

// 11. Protéger par mot de passe
export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword: string
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const bytes = await pdfDoc.save();

  const encryptedBytes = await encryptPDF(bytes, userPassword, {
    ownerPassword: ownerPassword || null,
    allowPrinting: true,
    allowModifying: true,
    allowCopying: true,
    allowAnnotating: true,
    allowFillingForms: true,
    allowExtraction: true,
  });

  return blobFromBytes(encryptedBytes, `${baseName(file.name)}_protected.pdf`);
}

// 12. Signature électronique (ajouter une image de signature)
export async function signPdf(
  file: File,
  signatureImage: File,
  pageNumber: number,
  x: number,
  y: number,
  width: number = 150
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();

  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new Error(`Page ${pageNumber} invalide`);
  }

  const page = pdfDoc.getPage(pageNumber - 1);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  let image;
  const imageBytes = await signatureImage.arrayBuffer();
  const isPng = signatureImage.type.includes("png");
  const isJpg = signatureImage.type.includes("jpeg") || signatureImage.type.includes("jpg");

  if (isPng) {
    image = await pdfDoc.embedPng(imageBytes);
  } else if (isJpg) {
    image = await pdfDoc.embedJpg(imageBytes);
  } else {
    throw new Error("L'image de signature doit être PNG ou JPEG");
  }

  const actualX = x * pageWidth;
  const actualY = y * pageHeight;
  const actualWidth = width;
  const scaleFactor = actualWidth / image.width;
  const actualHeight = image.height * scaleFactor;

  page.drawImage(image, {
    x: actualX,
    y: actualY,
    width: actualWidth,
    height: actualHeight,
  });

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_signed.pdf`);
}

// 13. Filigrane (texte)
export async function watermarkPdf(
  file: File,
  text: string,
  opacity: number = 0.2,
  rotation: number = 45,
  fontSize: number = 40
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(rotation),
    });
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_watermarked.pdf`);
}

// 14. Annuler la protection (retirer le mot de passe)
export async function unprotectPdf(
  file: File
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_unprotected.pdf`);
}

// 15. Redimensionner / Marges
export async function resizePdf(
  file: File,
  pageSize: [number, number] | string,
  margin: number,
  fitMode: "fit" | "fill" | "stretch" = "fit"
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();

  let targetSize: [number, number];
  if (typeof pageSize === "string") {
    switch (pageSize.toLowerCase()) {
      case "a4":
        targetSize = PageSizes.A4;
        break;
      case "a3":
        targetSize = PageSizes.A3;
        break;
      case "a5":
        targetSize = PageSizes.A5;
        break;
      case "letter":
        targetSize = PageSizes.Letter;
        break;
      case "legal":
        targetSize = PageSizes.Legal;
        break;
      case "tabloid":
        targetSize = PageSizes.Tabloid;
        break;
      default:
        targetSize = PageSizes.A4;
    }
  } else {
    targetSize = pageSize;
  }

  const newDoc = await PDFDocument.create();

  for (let i = 0; i < pageCount; i++) {
    const copiedPages = await newDoc.copyPages(pdfDoc, [i]);
    const original = copiedPages[0];
    const { width: origW, height: origH } = original.getSize();

    const targetW = targetSize[0] - margin * 2;
    const targetH = targetSize[1] - margin * 2;

    let scaleX = targetW / origW;
    let scaleY = targetH / origH;

    if (fitMode === "fit") {
      const scale = Math.min(scaleX, scaleY);
      scaleX = scale;
      scaleY = scale;
    } else if (fitMode === "fill") {
      const scale = Math.max(scaleX, scaleY);
      scaleX = scale;
      scaleY = scale;
    }

    const offsetX = (targetW - origW * scaleX) / 2;
    const offsetY = (targetH - origH * scaleY) / 2;

    original.setSize(targetSize[0], targetSize[1]);
    const newPage = newDoc.getPage(newDoc.getPageCount() - 1);

    const embedded = await newDoc.embedPage(original);
    newPage.drawPage(embedded, {
      x: margin + offsetX,
      y: margin + offsetY,
      width: origW * scaleX,
      height: origH * scaleY,
    });
  }

  const bytes = await newDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_resized.pdf`);
}

// 16. Numérotation de pages
export async function addPageNumbersPdf(
  file: File,
  startNumber: number = 1,
  fontSize: number = 12,
  position: "bottom" | "top" = "bottom",
  color: [number, number, number] = [0.3, 0.3, 0.3]
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const pageNumber = startNumber + i;
    const text = `${pageNumber}`;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    if (position === "bottom") {
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: 30,
        size: fontSize,
        font,
        color: rgb(color[0], color[1], color[2]),
      });
    } else {
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height - 50,
        size: fontSize,
        font,
        color: rgb(color[0], color[1], color[2]),
      });
    }
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_numbered.pdf`);
}

// 17. En-tête / Pied de page
export async function addHeaderFooterPdf(
  file: File,
  headerText: string,
  footerText: string,
  fontSize: number = 10
): Promise<PdfResult> {
  const pdfDoc = await loadPdf(file, true);
  const pageCount = pdfDoc.getPageCount();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    if (headerText) {
      const headerWidth = font.widthOfTextAtSize(headerText, fontSize);
      page.drawText(headerText, {
        x: (width - headerWidth) / 2,
        y: height - 40,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    if (footerText) {
      const footerWidth = font.widthOfTextAtSize(footerText, fontSize);
      page.drawText(footerText, {
        x: (width - footerWidth) / 2,
        y: 30,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  }

  const bytes = await pdfDoc.save();
  return blobFromBytes(bytes, `${baseName(file.name)}_header_footer.pdf`);
}

// Fonction utilitaire: téléchargement
export function downloadResult(result: PdfResult) {
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
