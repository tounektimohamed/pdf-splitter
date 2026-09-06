"use client";

import { useCallback, useState } from "react";
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
  | "header-footer";

interface ServiceInfo {
  id: ServiceId;
  name: string;
  icon: string;
  description: string;
  needsFile: boolean;
  needsMultipleFiles?: boolean;
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
        {files.length === 0 ? (
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
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">{pageCount} pages</span>
                <button
                  onClick={() => {
                    setFiles([]);
                    setResult(null);
                    setError(null);
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
