"use client";

import { useCallback, useState, useRef } from "react";
import PdfUploader from "@/components/PdfUploader";
import {
  PdfResult,
  formatFileSize,
  downloadResult,
  loadPdf,
} from "@/lib/pdfServices";
import {
  mergePdfs,
  compressPdf,
  rotateAllPdf,
  rotatePdf,
  reorderPdf,
  deletePdf,
  protectPdf,
  signPdf,
  watermarkPdf,
  unprotectPdf,
  resizePdf,
  addPageNumbersPdf,
  addHeaderFooterPdf,
} from "@/lib/pdfServices";
import {
  pdfToImages,
  pdfToWord,
  pdfToExcel,
  pdfToText,
  pdfToHtml,
  imagesToPdf,
  ocrPdf,
  findBlankPages,
  removeBlankPages,
  pdfStats,
  searchInPdf,
  translatePdf,
  addBookmarksPdf,
  addFormFieldsPdf,
  convertToPdfA,
} from "@/lib/pdfAdvancedServices";

type ServiceId =
  | "merge"
  | "compress"
  | "rotate"
  | "reorder"
  | "delete"
  | "protect"
  | "sign"
  | "watermark"
  | "unprotect"
  | "resize"
  | "numbering"
  | "header-footer"
  | "pdf2image"
  | "pdf2word"
  | "pdf2excel"
  | "pdf2text"
  | "pdf2html"
  | "images2pdf"
  | "ocr"
  | "blank"
  | "stats"
  | "search"
  | "translate"
  | "toc"
  | "form"
  | "pdfa";

interface ServiceInfo {
  id: ServiceId;
  name: string;
  icon: string;
  description: string;
  needsFile: boolean;
  needsMultipleFiles?: boolean;
  needsImages?: boolean;
}

const ALL_SERVICES: ServiceInfo[] = [
  { id: "merge", name: "Fusionner", icon: "🔗", description: "Combiner plusieurs PDF en un seul", needsFile: true, needsMultipleFiles: true },
  { id: "compress", name: "Compresser", icon: "🗜", description: "Réduire la taille du fichier", needsFile: true },
  { id: "rotate", name: "Rotation", icon: "🔄", description: "Pivoter des pages à 90°, 180°, 270°", needsFile: true },
  { id: "reorder", name: "Réorganiser", icon: "📋", description: "Changer l'ordre des pages", needsFile: true },
  { id: "delete", name: "Supprimer", icon: "🗑️", description: "Retirer des pages inutiles", needsFile: true },
  { id: "protect", name: "Protéger", icon: "🔒", description: "Ajouter un mot de passe", needsFile: true },
  { id: "sign", name: "Signer", icon: "✍️", description: "Ajouter une signature", needsFile: true },
  { id: "watermark", name: "Filigrane", icon: "💧", description: "Ajouter un texte en filigrane", needsFile: true },
  { id: "unprotect", name: "Déprotéger", icon: "🔓", description: "Retirer le mot de passe", needsFile: true },
  { id: "resize", name: "Redimensionner", icon: "📐", description: "Ajuster la taille et les marges", needsFile: true },
  { id: "numbering", name: "Numérotation", icon: "🔢", description: "Ajouter des numéros de pages", needsFile: true },
  { id: "header-footer", name: "En-tête/Pied", icon: "📝", description: "Ajouter texte en haut/bas", needsFile: true },
  { id: "pdf2image", name: "PDF → Images", icon: "🖼️", description: "Convertir chaque page en image PNG/JPEG", needsFile: true },
  { id: "pdf2word", name: "PDF → Word", icon: "📄", description: "Extraire le texte en document Word (.docx)", needsFile: true },
  { id: "pdf2excel", name: "PDF → Excel", icon: "📊", description: "Extraire le contenu en feuille Excel (.xlsx)", needsFile: true },
  { id: "pdf2text", name: "PDF → Texte", icon: "📃", description: "Extraire le texte brut du PDF", needsFile: true },
  { id: "pdf2html", name: "PDF → HTML", icon: "🌐", description: "Convertir le PDF en page HTML", needsFile: true },
  { id: "images2pdf", name: "Images → PDF", icon: "📷", description: "Regrouper des images en un PDF", needsFile: true, needsImages: true },
  { id: "ocr", name: "OCR", icon: "🔍", description: "Reconnaissance de texte sur PDF scanné", needsFile: true },
  { id: "blank", name: "Pages vierges", icon: "⬜", description: "Détecter et supprimer les pages vierges", needsFile: true },
  { id: "stats", name: "Statistiques", icon: "📈", description: "Analyse du PDF (pages, mots, caractères)", needsFile: true },
  { id: "search", name: "Recherche", icon: "🔎", description: "Chercher du texte dans le PDF", needsFile: true },
  { id: "translate", name: "Traduire", icon: "🌍", description: "Extraire et traduire le contenu", needsFile: true },
  { id: "toc", name: "Signets/TOC", icon: "📑", description: "Ajouter une table des matières", needsFile: true },
  { id: "form", name: "Formulaires", icon: "📋", description: "Ajouter des champs de formulaire", needsFile: true },
  { id: "pdfa", name: "PDF/A", icon: "🏛️", description: "Convertir au format d'archivage", needsFile: true },
];

export default function Home() {
  const [activeService, setActiveService] = useState<ServiceId>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PdfResult | PdfResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Config par service
  const [rotationAngle, setRotationAngle] = useState(90);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);
  const [pageNumbersToDelete, setPageNumbersToDelete] = useState("");
  const [reorderOrder, setReorderOrder] = useState("");
  const [pageSize, setPageSize] = useState("A4");
  const [margin, setMargin] = useState(20);
  const [numStart, setNumStart] = useState(1);
  const [numPosition, setNumPosition] = useState<"bottom" | "top">("bottom");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [allPagesSelected, setAllPagesSelected] = useState(true);
  const [imageFormat, setImageFormat] = useState<"png" | "jpeg">("png");
  const [imageScale, setImageScale] = useState(1.5);
  const [ocrLanguage, setOcrLanguage] = useState("fra");
  const [searchQuery, setSearchQuery] = useState("");
  const [translateLang, setTranslateLang] = useState("fr");
  const [tocText, setTocText] = useState("");
  const [formFieldCount, setFormFieldCount] = useState(3);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [infoMessages, setInfoMessages] = useState<string[]>([]);
  const [searchResultsState, setSearchResultsState] = useState<{ page: number; context: string }[] | null>(null);
  const [blankPagesState, setBlankPagesState] = useState<{ blankPages: number[]; totalPages: number } | null>(null);
  const [statsState, setStatsState] = useState<{
    pages: number; size: number; words: number; chars: number; hasImages: boolean; isEncrypted: boolean;
  } | null>(null);
  const [progress, setProgress] = useState(0);

  const activeServiceInfo = ALL_SERVICES.find(
    (s) => s.id === activeService
  )!;

  const handleFileSelected = useCallback(async (file: File) => {
    setFiles([file]);
    setResult(null);
    setError(null);
    setIsProcessing(true);
    try {
      const pdfDoc = await loadPdf(file, true);
      setPageCount(pdfDoc.getPageCount());
      setSelectedPages(new Set(Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i + 1)));
    } catch {
      setError("Erreur lors de la lecture du fichier PDF.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleMultipleFiles = useCallback(async (filesList: File[]) => {
    setFiles(filesList);
    setResult(null);
    setError(null);
    try {
      const pdfDoc = await loadPdf(filesList[0], true);
      setPageCount(pdfDoc.getPageCount());
    } catch {
      setError("Erreur lors de la lecture du fichier PDF.");
    }
  }, []);

  const executeService = useCallback(async () => {
    if (!files.length) return;
    if (activeService === "protect" && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (activeService === "watermark" && !watermarkText.trim()) {
      setError("Veuillez entrer le texte du filigrane.");
      return;
    }
    if (activeService === "sign" && !signatureImage) {
      setError("Veuillez ajouter une image de signature.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      let res: PdfResult | PdfResult[] | null = null;

      switch (activeService) {
        case "merge":
          res = await mergePdfs(files);
          break;
        case "compress":
          res = await compressPdf(files[0]);
          break;
        case "rotate":
          if (allPagesSelected || selectedPages.size === pageCount) {
            res = await rotateAllPdf(files[0], rotationAngle);
          } else {
            res = await rotatePdf(files[0], Array.from(selectedPages), rotationAngle);
          }
          break;
        case "reorder":
          {
            const order = reorderOrder
              .split(",")
              .map((s) => parseInt(s.trim()))
              .filter((n) => !isNaN(n) && n >= 1 && n <= pageCount);
            if (order.length !== pageCount) {
              setError(`Veuillez entrer les ${pageCount} pages dans l'ordre voulu (séparées par des virgules).`);
              setIsProcessing(false);
              return;
            }
            res = await reorderPdf(files[0], order);
          }
          break;
        case "delete":
          {
            const toDelete = pageNumbersToDelete
              .split(",")
              .map((s) => parseInt(s.trim()))
              .filter((n) => !isNaN(n) && n >= 1 && n <= pageCount);
            if (toDelete.length === 0) {
              setError("Veuillez entrer des numéros de pages à supprimer (ex: 2, 5, 8).");
              setIsProcessing(false);
              return;
            }
            res = await deletePdf(files[0], toDelete);
          }
          break;
        case "protect":
          res = await protectPdf(files[0], password, password);
          break;
        case "sign":
          res = await signPdf(files[0], signatureImage!, 1, 0.5, 0.1);
          break;
        case "watermark":
          res = await watermarkPdf(files[0], watermarkText, watermarkOpacity);
          break;
        case "unprotect":
          res = await unprotectPdf(files[0]);
          break;
        case "resize":
          res = await resizePdf(files[0], pageSize as [number, number] | string, margin);
          break;
        case "numbering":
          res = await addPageNumbersPdf(files[0], numStart, 12, numPosition);
          break;
        case "header-footer":
          res = await addHeaderFooterPdf(files[0], headerText, footerText);
          break;
        case "pdf2image":
          {
            setProgress(0);
            const images = await pdfToImages(files[0], imageFormat, imageScale, (cur, total) => {
              setProgress(Math.round((cur / total) * 100));
            });
            setProgress(100);
            res = images;
          }
          break;
        case "pdf2word":
          res = await pdfToWord(files[0]);
          break;
        case "pdf2excel":
          res = await pdfToExcel(files[0]);
          break;
        case "pdf2text":
          res = await pdfToText(files[0]);
          break;
        case "pdf2html":
          res = await pdfToHtml(files[0]);
          break;
        case "images2pdf":
          if (imageFiles.length === 0) {
            setError("Veuillez sélectionner au moins une image.");
            setIsProcessing(false);
            return;
          }
          res = await imagesToPdf(imageFiles, "fit");
          break;
        case "ocr":
          {
            setProgress(0);
            const ocrResult = await ocrPdf(files[0], ocrLanguage, (cur, total) => {
              setProgress(Math.round((cur / total) * 100));
            });
            setProgress(100);
            setInfoMessages([`OCR terminé. ${ocrResult.text.length} caractères extraits.`]);
            res = ocrResult;
          }
          break;
        case "blank":
          {
            const info = await findBlankPages(files[0]);
            setBlankPagesState(info);
            if (info.blankPages.length > 0) {
              setInfoMessages([
                `Pages vierges détectées : ${info.blankPages.join(", ")} (sur ${info.totalPages} pages). Vous pouvez les supprimer.`,
              ]);
              res = await removeBlankPages(files[0]);
            } else {
              setInfoMessages([`Aucune page vierge détectée (${info.totalPages} pages).`]);
              res = null;
            }
          }
          break;
        case "stats":
          {
            const stats = await pdfStats(files[0]);
            setStatsState(stats);
            res = null;
          }
          break;
        case "search":
          if (!searchQuery.trim()) {
            setError("Veuillez entrer un texte à rechercher.");
            setIsProcessing(false);
            return;
          }
          {
            const results = await searchInPdf(files[0], searchQuery);
            setSearchResultsState(results);
            setInfoMessages([
              results.length > 0
                ? `"${searchQuery}" trouvé ${results.length} fois dans le PDF.`
                : `"${searchQuery}" introuvable dans le PDF.`,
            ]);
            res = null;
          }
          break;
        case "translate":
          {
            setProgress(0);
            const translated = await translatePdf(files[0], translateLang, (cur, total) => {
              setProgress(Math.round((cur / total) * 100));
            });
            setProgress(100);
            res = translated;
          }
          break;
        case "toc":
          {
            const keys = tocText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (keys.length === 0) {
              setError("Veuillez entrer les titres des signets (séparés par des virgules).");
              setIsProcessing(false);
              return;
            }
            res = await addBookmarksPdf(files[0], keys);
          }
          break;
        case "form":
          {
            const fields = Array.from({ length: formFieldCount }, (_, i) => ({
              label: `Champ ${i + 1}`,
              page: 1,
              x: 0.1 + (i % 2) * 0.4,
              y: 0.7 - Math.floor(i / 2) * 0.12,
              width: 150,
              height: 25,
            }));
            res = await addFormFieldsPdf(files[0], fields);
          }
          break;
        case "pdfa":
          res = await convertToPdfA(files[0]);
          break;
      }

      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors du traitement du PDF.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    files,
    activeService,
    password,
    confirmPassword,
    watermarkText,
    watermarkOpacity,
    signatureImage,
    rotationAngle,
    selectedPages,
    allPagesSelected,
    pageCount,
    reorderOrder,
    pageNumbersToDelete,
    pageSize,
    margin,
    numStart,
    numPosition,
    headerText,
    footerText,
    imageFormat,
    imageScale,
    ocrLanguage,
    searchQuery,
    translateLang,
    tocText,
    formFieldCount,
    imageFiles,
  ]);

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            Traitement 100% côté client - Sécurisé
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PDF Toolbox
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Tous vos outils PDF en un seul endroit : fusionner, compresser,
            protéger, filigraner et plus. Vos fichiers ne quittent jamais
            votre navigateur.
          </p>
        </header>

        {/* Navigation par service */}
        <div className="bg-surface border border-border rounded-2xl p-4 mb-8 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {ALL_SERVICES.map((service) => (
              <button
                key={service.id}
                onClick={() => {
                  setActiveService(service.id);
                  setResult(null);
                  setError(null);
                  setInfoMessages([]);
                  setSearchResultsState(null);
                  setBlankPagesState(null);
                  setStatsState(null);
                  setProgress(0);
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all
                  ${
                    activeService === service.id
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-muted/5 hover:bg-primary/10 text-foreground"
                  }`}
              >
                <span className="text-2xl">{service.icon}</span>
                <span className="text-xs font-medium">{service.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-1">
            {activeServiceInfo.icon} {activeServiceInfo.name}
          </h2>
          <p className="text-muted">{activeServiceInfo.description}</p>
        </div>

        {/* Upload */}
        {activeService === "images2pdf" && imageFiles.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <ImageUploader onImagesSelected={setImageFiles} />
          </div>
        ) : files.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <PdfUploader
              onFileSelected={
                activeService === "merge"
                  ? (f) => handleMultipleFiles([...files, f])
                  : handleFileSelected
              }
              isProcessing={isProcessing}
              multiple={activeService === "merge"}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fichier chargé */}
            <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {activeService === "images2pdf" ? (
                  <>
                    {imageFiles.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                          <span className="text-purple-500 text-xs">IMG</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm max-w-[180px] truncate">{f.name}</p>
                          <p className="text-xs text-muted">{formatFileSize(f.size)}</p>
                        </div>
                      </div>
                    ))}
                    {imageFiles.length > 3 && (
                      <span className="text-sm text-muted">+{imageFiles.length - 3} images</span>
                    )}
                  </>
                ) : (
                  <>
                    {files.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                          <span className="text-red-500 font-bold text-sm">PDF</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm max-w-[180px] truncate">{f.name}</p>
                          <p className="text-xs text-muted">{formatFileSize(f.size)}</p>
                        </div>
                      </div>
                    ))}
                    {files.length > 3 && (
                      <span className="text-sm text-muted">
                        +{files.length - 3} fichiers
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeService === "images2pdf" ? (
                  <span className="text-sm text-muted">{imageFiles.length} images</span>
                ) : (
                  <span className="text-sm text-muted">{pageCount} pages</span>
                )}
                <button
                  onClick={() => {
                    setFiles([]);
                    setImageFiles([]);
                    setResult(null);
                    setError(null);
                    setInfoMessages([]);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted/10 transition-colors"
                >
                  Changer
                </button>
              </div>
            </div>

            {/* Config par service */}
            <ServiceConfig
              service={activeServiceInfo}
              pageCount={pageCount}
              rotationAngle={rotationAngle}
              setRotationAngle={setRotationAngle}
              selectedPages={selectedPages}
              setSelectedPages={setSelectedPages}
              allPagesSelected={allPagesSelected}
              setAllPagesSelected={setAllPagesSelected}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              signatureImage={signatureImage}
              setSignatureImage={setSignatureImage}
              watermarkText={watermarkText}
              setWatermarkText={setWatermarkText}
              watermarkOpacity={watermarkOpacity}
              setWatermarkOpacity={setWatermarkOpacity}
              pageNumbersToDelete={pageNumbersToDelete}
              setPageNumbersToDelete={setPageNumbersToDelete}
              reorderOrder={reorderOrder}
              setReorderOrder={setReorderOrder}
              pageSize={pageSize}
              setPageSize={setPageSize}
              margin={margin}
              setMargin={setMargin}
              numStart={numStart}
              setNumStart={setNumStart}
              numPosition={numPosition}
              setNumPosition={setNumPosition}
              headerText={headerText}
              setHeaderText={setHeaderText}
              footerText={footerText}
              setFooterText={setFooterText}
              imageFormat={imageFormat}
              setImageFormat={setImageFormat}
              imageScale={imageScale}
              setImageScale={setImageScale}
              ocrLanguage={ocrLanguage}
              setOcrLanguage={setOcrLanguage}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              translateLang={translateLang}
              setTranslateLang={setTranslateLang}
              tocText={tocText}
              setTocText={setTocText}
              formFieldCount={formFieldCount}
              setFormFieldCount={setFormFieldCount}
              imageFiles={imageFiles}
            />

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
                {error}
              </div>
            )}

            {/* Bouton exécuter */}
            <button
              onClick={executeService}
              disabled={isProcessing}
              className="btn-primary w-full py-4 rounded-xl text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Traitement en cours...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Appliquer {activeServiceInfo.name}
                </>
              )}
            </button>

            {/* Progression */}
            {isProcessing && progress > 0 && progress < 100 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Traitement en cours...</span>
                  <span className="text-sm text-muted">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Messages d'information */}
            {infoMessages.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fade-in">
                {infoMessages.map((msg, i) => (
                  <p key={i} className="text-sm text-blue-700 mb-1">{msg}</p>
                ))}
              </div>
            )}

            {/* Résultats spéciaux : Statistiques */}
            {statsState && (
              <div className="bg-surface border border-border rounded-xl p-5 animate-fade-in">
                <h3 className="font-semibold mb-4">📈 Statistiques du PDF</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard label="Pages" value={String(statsState.pages)} icon="📄" />
                  <StatCard label="Taille" value={formatFileSize(statsState.size)} icon="💾" />
                  <StatCard label="Mots" value={statsState.words.toLocaleString("fr-FR")} icon="🔤" />
                  <StatCard label="Caractères" value={statsState.chars.toLocaleString("fr-FR")} icon="✏️" />
                  <StatCard label="Chiffré" value={statsState.isEncrypted ? "Oui" : "Non"} icon="🔒" />
                </div>
              </div>
            )}

            {/* Résultats spéciaux : Recherche */}
            {searchResultsState && (
              <div className="bg-surface border border-border rounded-xl p-5 animate-fade-in">
                <h3 className="font-semibold mb-4">🔎 Résultats de recherche</h3>
                {searchResultsState.length === 0 ? (
                  <p className="text-sm text-muted">Aucun résultat trouvé.</p>
                ) : (
                  <div className="space-y-3">
                    {searchResultsState.map((r, i) => (
                      <div key={i} className="bg-muted/5 rounded-lg p-3">
                        <p className="text-xs font-semibold text-primary mb-1">Page {r.page}</p>
                        <p className="text-sm text-muted">...{r.context}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Résultats spéciaux : Pages vierges */}
            {blankPagesState && (
              <div className="bg-surface border border-border rounded-xl p-5 animate-fade-in">
                <h3 className="font-semibold mb-4">⬜ Pages vierges détectées</h3>
                <p className="text-sm text-muted mb-3">
                  {blankPagesState.blankPages.length === 0
                    ? `Aucune page vierge détectée sur ${blankPagesState.totalPages} pages.`
                    : `${blankPagesState.blankPages.length} page(s) vierge(s) sur ${blankPagesState.totalPages} pages : ${blankPagesState.blankPages.join(", ")}`}
                </p>
              </div>
            )}

            {/* Résultat */}
            {result && (
              <ResultDisplay result={result} onReset={() => setResult(null)} />
            )}
          </div>
        )}

        <footer className="text-center mt-16 pb-8 text-sm text-muted">
          <p>
            Traitement 100% côté client. Vos fichiers ne quittent jamais votre navigateur.
          </p>
        </footer>
      </div>
    </main>
  );
}

// ======== Config component ========

interface ServiceConfigProps {
  service: ServiceInfo;
  pageCount: number;
  rotationAngle: number;
  setRotationAngle: (n: number) => void;
  selectedPages: Set<number>;
  setSelectedPages: (s: Set<number>) => void;
  allPagesSelected: boolean;
  setAllPagesSelected: (b: boolean) => void;
  password: string;
  setPassword: (s: string) => void;
  confirmPassword: string;
  setConfirmPassword: (s: string) => void;
  signatureImage: File | null;
  setSignatureImage: (f: File | null) => void;
  watermarkText: string;
  setWatermarkText: (s: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (n: number) => void;
  pageNumbersToDelete: string;
  setPageNumbersToDelete: (s: string) => void;
  reorderOrder: string;
  setReorderOrder: (s: string) => void;
  pageSize: string;
  setPageSize: (s: string) => void;
  margin: number;
  setMargin: (n: number) => void;
  numStart: number;
  setNumStart: (n: number) => void;
  numPosition: "bottom" | "top";
  setNumPosition: (p: "bottom" | "top") => void;
  headerText: string;
  setHeaderText: (s: string) => void;
  footerText: string;
  setFooterText: (s: string) => void;
  imageFormat: "png" | "jpeg";
  setImageFormat: (f: "png" | "jpeg") => void;
  imageScale: number;
  setImageScale: (n: number) => void;
  ocrLanguage: string;
  setOcrLanguage: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  translateLang: string;
  setTranslateLang: (s: string) => void;
  tocText: string;
  setTocText: (s: string) => void;
  formFieldCount: number;
  setFormFieldCount: (n: number) => void;
  imageFiles?: File[];
}

function ServiceConfig(props: ServiceConfigProps) {
  const {
    service,
    pageCount,
    rotationAngle, setRotationAngle,
    selectedPages, setSelectedPages,
    allPagesSelected, setAllPagesSelected,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    signatureImage, setSignatureImage,
    watermarkText, setWatermarkText,
    watermarkOpacity, setWatermarkOpacity,
    pageNumbersToDelete, setPageNumbersToDelete,
    reorderOrder, setReorderOrder,
    pageSize, setPageSize,
    margin, setMargin,
    numStart, setNumStart,
    numPosition, setNumPosition,
    headerText, setHeaderText,
    footerText, setFooterText,
    imageFormat, setImageFormat,
    imageScale, setImageScale,
    ocrLanguage, setOcrLanguage,
    searchQuery, setSearchQuery,
    translateLang, setTranslateLang,
    tocText, setTocText,
    formFieldCount, setFormFieldCount,
    imageFiles = [],
  } = props;

  const inputClass =
    "w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "block text-sm font-medium mb-2";
  const cardClass = "bg-surface border border-border rounded-xl p-5";

  switch (service.id) {
    case "merge":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted mb-2">
            Cliquez sur <b>&quot;Changer&quot;</b> puis sélectionnez
            plusieurs fichiers PDF pour les fusionner en un seul document.
          </p>
          <p className="text-sm text-muted">
            Vous pouvez aussi déposer plusieurs PDF ici pour les fusionner.
          </p>
        </div>
      );

    case "compress":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted mb-2">
            La compression optimise le fichier PDF en réécrivant la structure
            interne pour réduire sa taille finale.
          </p>
          <div className="text-xs text-muted bg-muted/5 rounded-lg p-3">
            ⚠️ Note : La compression complète (images de basse résolution,
            suppression de métadonnées) n&apos;est pas supportée côté client.
            Cette compression réorganise les structures objectives pour un
            gain modéré, sans perte de qualité.
          </div>
        </div>
      );

    case "rotate":
      return (
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className={labelClass}>Angle de rotation</label>
            <div className="flex gap-2">
              {[90, 180, 270].map((angle) => (
                <button
                  key={angle}
                  onClick={() => setRotationAngle(angle)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1
                    ${rotationAngle === angle
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-muted/5 hover:bg-primary/10"}`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allPages"
              checked={allPagesSelected}
              onChange={(e) => {
                setAllPagesSelected(e.target.checked);
                if (e.target.checked) {
                  setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
                }
              }}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="allPages" className="text-sm">
              {allPagesSelected
                ? `Toutes les pages (${pageCount} pages)`
                : `${selectedPages.size} page(s) sélectionnée(s)`}
            </label>
          </div>
        </div>
      );

    case "reorder":
      return (
        <div className={cardClass}>
          <label className={labelClass}>
            Nouvel ordre des pages (séparées par des virgules)
          </label>
          <input
            type="text"
            value={reorderOrder}
            onChange={(e) => setReorderOrder(e.target.value)}
            placeholder={`Ex: ${Array.from({ length: Math.min(pageCount, 10) }, (_, i) => pageCount - i).join(", ")} (ordre inverse)`}
            className={inputClass}
          />
          <p className="text-xs text-muted mt-2">
            Entrez les {pageCount} numéros de page dans l&apos;ordre voulu.
            Ex: 1, 3, 2, 4 pour échanger les pages 2 et 3.
          </p>
        </div>
      );

    case "delete":
      return (
        <div className={cardClass}>
          <label className={labelClass}>
            Pages à supprimer (séparées par des virgules)
          </label>
          <input
            type="text"
            value={pageNumbersToDelete}
            onChange={(e) => setPageNumbersToDelete(e.target.value)}
            placeholder={`Ex: 2, 5, 8 (sur ${pageCount} pages)`}
            className={inputClass}
          />
          <p className="text-xs text-muted mt-2">
            Entrez les numéros des pages à retirer. Les autres pages seront
            conservées dans le document final.
          </p>
        </div>
      );

    case "protect":
      return (
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className={labelClass}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez un mot de passe"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez le mot de passe"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-muted bg-muted/5 rounded-lg p-3">
            Le PDF protégé nécessitera ce mot de passe pour être ouvert.
          </p>
        </div>
      );

    case "sign":
      return (
        <div className={cardClass}>
          <label className={labelClass}>Image de signature (PNG ou JPEG)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => setSignatureImage(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          {signatureImage && (
            <p className="text-xs text-green-600 mt-2">
              ✅ {signatureImage.name} ({formatFileSize(signatureImage.size)})
            </p>
          )}
          <p className="text-xs text-muted mt-2">
            L&apos;image sera placée au centre de la première page.
            (positionnement avancé à venir)
          </p>
        </div>
      );

    case "watermark":
      return (
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className={labelClass}>Texte du filigrane</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Ex: CONFIDENTIEL, COPYRIGHT, PROJET..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Opacité : {Math.round(watermarkOpacity * 100)}%
            </label>
            <input
              type="range"
              min={0.05}
              max={0.8}
              step={0.05}
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      );

    case "unprotect":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted">
            Cette opération retirera le mot de passe du PDF et produira un
            document librement accessible. Si le fichier est protégé, cliquez
            sur <b>Appliquer Déprotéger</b> pour créer la version sans
            protection.
          </p>
        </div>
      );

    case "resize":
      return (
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className={labelClass}>Format de la page</label>
            <div className="flex flex-wrap gap-2">
              {["A4", "A3", "A5", "Letter", "Legal", "Tabloid"].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all
                    ${pageSize === size
                      ? "bg-primary text-white"
                      : "bg-muted/5 hover:bg-primary/10"}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Marge : {margin} pts</label>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={margin}
              onChange={(e) => setMargin(parseInt(e.target.value))}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      );

    case "numbering":
      return (
        <div className={cardClass}>
          <label className={labelClass}>Position des numéros</label>
          <div className="flex gap-2 mb-4">
            {["bottom", "top"].map((pos) => (
              <button
                key={pos}
                onClick={() => setNumPosition(pos as "bottom" | "top")}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex-1
                  ${numPosition === pos
                    ? "bg-primary text-white"
                    : "bg-muted/5 hover:bg-primary/10"}`}
              >
                {pos === "bottom" ? "Bas de page" : "Haut de page"}
              </button>
            ))}
          </div>
          <label className={labelClass}>Commencer à la page numéro</label>
          <input
            type="number"
            min={1}
            value={numStart}
            onChange={(e) => setNumStart(parseInt(e.target.value) || 1)}
            className={inputClass}
          />
        </div>
      );

    case "header-footer":
      return (
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className={labelClass}>Texte de l&apos;en-tête</label>
            <input
              type="text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Ex: Rapport annuel 2026"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Texte du pied de page</label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Ex: © 2026 Tous droits réservés"
              className={inputClass}
            />
          </div>
        </div>
      );

    case "pdf2image":
      return (
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className={labelClass}>Format d&apos;image</label>
            <div className="flex gap-2">
              {["png", "jpeg"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setImageFormat(fmt as "png" | "jpeg")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex-1
                    ${imageFormat === fmt ? "bg-primary text-white" : "bg-muted/5 hover:bg-primary/10"}`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Qualité / Résolution : {Math.round(imageScale * 100)}%
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.25}
              value={imageScale}
              onChange={(e) => setImageScale(parseFloat(e.target.value))}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <p className="text-xs text-muted">
            Chaque page du PDF sera convertie en une image téléchargeable.
          </p>
        </div>
      );

    case "pdf2word":
    case "pdf2excel":
    case "pdf2text":
    case "pdf2html":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted">
            Le contenu textuel du PDF sera extrait et converti au format
            choisi. 📌 Note : les mises en page complexes peuvent être
            légèrement simplifiées lors de la conversion.
          </p>
        </div>
      );

    case "images2pdf":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted">
            <b>{imageFiles ? "Images sélectionnées" : "Sélectionnez des images"}</b>{" "}
            (PNG, JPEG, GIF, WEBP) pour créer un PDF. Cliquez sur{" "}
            <b>&quot;Changer&quot;</b> pour re-sélectionner.
          </p>
        </div>
      );

    case "ocr":
      return (
        <div className={cardClass}>
          <label className={labelClass}>Langue du texte</label>
          <select
            value={ocrLanguage}
            onChange={(e) => setOcrLanguage(e.target.value)}
            className={inputClass}
          >
            <option value="fra">Français</option>
            <option value="eng">Anglais</option>
            <option value="spa">Espagnol</option>
            <option value="ita">Italien</option>
            <option value="deu">Allemand</option>
            <option value="ara">Arabe</option>
            <option value="por">Portugais</option>
            <option value="nld">Néerlandais</option>
          </select>
          <p className="text-xs text-muted mt-3 bg-muted/5 rounded-lg p-3">
            🔍 L&apos;OCR (reconnaissance de texte) analyse chaque page comme
            une image et extrait le texte. Idéal pour les PDF scannés.
            <br />
            ⚠️ Le téléchargement des modèles de langue peut prendre du temps
            au premier usage.
          </p>
        </div>
      );

    case "blank":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted">
            Cette opération analyse chaque page pour détecter les pages
            vierges, puis crée une version du PDF sans ces pages.
          </p>
        </div>
      );

    case "stats":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted">
            Analyse complète du document : nombre de pages, taille du fichier,
            nombre de mots et de caractères, état du chiffrement.
          </p>
        </div>
      );

    case "search":
      return (
        <div className={cardClass}>
          <label className={labelClass}>Rechercher dans le PDF</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Entrez un mot ou une phrase..."
            className={inputClass}
          />
        </div>
      );

    case "translate":
      return (
        <div className={cardClass}>
          <label className={labelClass}>Langue de traduction</label>
          <select
            value={translateLang}
            onChange={(e) => setTranslateLang(e.target.value)}
            className={inputClass}
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
            <option value="es">Espagnol</option>
            <option value="it">Italien</option>
            <option value="de">Allemand</option>
            <option value="ar">Arabe</option>
            <option value="pt">Portugais</option>
            <option value="nl">Néerlandais</option>
            <option value="zh-CN">Chinois</option>
            <option value="ja">Japonais</option>
          </select>
          <p className="text-xs text-muted mt-3 bg-muted/5 rounded-lg p-3">
            🌍 Le texte du PDF est extrait puis traduit (limité à 500
            caractères par page avec l&apos;API gratuite de traduction).
          </p>
        </div>
      );

    case "toc":
      return (
        <div className={cardClass}>
          <label className={labelClass}>
            Titres des signets (séparés par des virgules)
          </label>
          <input
            type="text"
            value={tocText}
            onChange={(e) => setTocText(e.target.value)}
            placeholder="Ex: Introduction, Chapitre 1, Chapitre 2, Conclusion"
            className={inputClass}
          />
          <p className="text-xs text-muted mt-2">
            Une page de table des matières sera ajoutée au début du PDF avec
            les titres indiqués.
          </p>
        </div>
      );

    case "form":
      return (
        <div className={`${cardClass} space-y-4`}>
          <label className={labelClass}>
            Nombre de champs de formulaire : {formFieldCount}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={formFieldCount}
            onChange={(e) => setFormFieldCount(parseInt(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted">
            Des champs texte remplissables seront ajoutés à la première page.
          </p>
        </div>
      );

    case "pdfa":
      return (
        <div className={cardClass}>
          <p className="text-sm text-muted">
            Conversion au format d&apos;archivage long terme. Le document est
            ré-encodé de manière optimisée pour la conservation.
          </p>
        </div>
      );

    default:
      return null;
  }
}

// ======== Result display component ========

function ResultDisplay({
  result,
  onReset,
}: {
  result: PdfResult | PdfResult[];
  onReset: () => void;
}) {
  const results = Array.isArray(result) ? result : [result];

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-fade-in">
      <h3 className="font-semibold text-green-700 mb-3">
        ✅ {results.length} fichier{results.length > 1 ? "s" : ""} prêt{results.length > 1 ? "s" : ""}
      </h3>
      <div className="space-y-2 mb-4">
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-green-100">
            <span className="text-sm font-medium truncate">{r.name}</span>
            <span className="text-xs text-muted ml-3 shrink-0">
              {formatFileSize(r.blob.size)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => results.forEach(downloadResult)}
          className="flex-1 btn-primary py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Télécharger
        </button>
        <button
          onClick={onReset}
          className="px-4 py-3 rounded-xl border border-green-200 text-green-700 font-medium hover:bg-green-100 transition-colors"
        >
          Refaire
        </button>
      </div>
    </div>
  );
}

// ======== StatCard component ========

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-muted/5 rounded-xl p-4 flex flex-col items-center gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

// ======== ImageUploader component ========

function ImageUploader({ onImagesSelected }: { onImagesSelected: (files: File[]) => void }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && !f.type.includes("svg")
    );
    if (imageFiles.length > 0) {
      onImagesSelected(imageFiles);
    } else {
      alert("Veuillez sélectionner des images (PNG, JPEG, GIF, WEBP).");
    }
  };

  return (
    <div
      className={`drop-zone relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
        transition-all duration-300`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-4">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isDragOver ? "bg-primary text-white" : "bg-purple-100 text-purple-500"}`}>
          <span className="text-4xl">📷</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Déposez vos images ici</h3>
          <p className="text-muted text-sm">ou cliquez pour sélectionner des images</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="px-2 py-1 bg-muted/10 rounded-lg">PNG, JPEG, GIF, WEBP</span>
          <span className="px-2 py-1 bg-muted/10 rounded-lg">Multi-sélection</span>
        </div>
      </div>
    </div>
  );
}
