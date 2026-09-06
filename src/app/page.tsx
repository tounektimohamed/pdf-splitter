"use client";

import { useState, useCallback } from "react";
import PdfUploader from "@/components/PdfUploader";
import PdfPreview from "@/components/PdfPreview";
import SplitOptions from "@/components/SplitOptions";
import {
  PdfPageInfo,
  SplitOption,
  getPdfPageCount,
  splitPdf,
  downloadBlob,
  formatFileSize,
} from "@/lib/pdfUtils";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);

  const handleFileSelected = useCallback(async (selectedFile: File) => {
    setIsProcessing(true);
    try {
      const count = await getPdfPageCount(selectedFile);
      setPageCount(count);
      setPages(
        Array.from({ length: count }, (_, i) => ({
          pageNumber: i + 1,
          selected: false,
        }))
      );
      setFile(selectedFile);
    } catch {
      alert("Erreur lors de la lecture du fichier PDF. Veuillez vérifier que le fichier n'est pas corrompu.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleTogglePage = useCallback((pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNum ? { ...p, selected: !p.selected } : p
      )
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
  }, []);

  const handleSplit = useCallback(
    async (options: SplitOption) => {
      if (!file) return;

      setIsSplitting(true);
      try {
        const results = await splitPdf(file, options);

        if (results.length === 0) {
          alert("Aucun résultat généré. Vérifiez vos paramètres.");
          return;
        }

        if (results.length === 1) {
          downloadBlob(results[0].blob, results[0].name);
        } else {
          for (const result of results) {
            downloadBlob(result.blob, result.name);
          }
        }
      } catch {
        alert("Erreur lors de la division du PDF.");
      } finally {
        setIsSplitting(false);
      }
    },
    [file]
  );

  const handleReset = () => {
    setFile(null);
    setPageCount(0);
    setPages([]);
  };

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
            100% sécurisé - Aucun envoi de données
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PDF Splitter
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Divisez, extrayez et séparez vos fichiers PDF en quelques clics.
            Tout le traitement se fait dans votre navigateur.
          </p>
        </header>

        {!file ? (
          <div className="max-w-2xl mx-auto">
            <PdfUploader
              onFileSelected={handleFileSelected}
              isProcessing={isProcessing}
            />

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5 text-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📑</span>
                </div>
                <h3 className="font-semibold mb-1">Extraire des pages</h3>
                <p className="text-sm text-muted">
                  Sélectionnez les pages spécifiques à extraire
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5 text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📏</span>
                </div>
                <h3 className="font-semibold mb-1">Plages de pages</h3>
                <p className="text-sm text-muted">
                  Définissez des plages comme 1-5, 8, 10-12
                </p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✂️</span>
                </div>
                <h3 className="font-semibold mb-1">Diviser par blocs</h3>
                <p className="text-sm text-muted">
                  Découpez en portions de N pages chacune
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-7 h-7 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg truncate max-w-xs">
                    {file.name}
                  </h3>
                  <p className="text-sm text-muted">
                    {pageCount} pages • {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="btn-secondary px-4 py-2 rounded-xl border border-border text-sm font-medium"
              >
                Changer de fichier
              </button>
            </div>

            <PdfPreview
              pageCount={pageCount}
              pages={pages}
              onTogglePage={handleTogglePage}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />

            <SplitOptions
              pageCount={pageCount}
              selectedPages={pages.filter((p) => p.selected).map((p) => p.pageNumber)}
              onSplit={handleSplit}
              isProcessing={isSplitting}
            />
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
