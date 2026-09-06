"use client";

import { useState } from "react";
import { SplitOption } from "@/lib/pdfUtils";

interface SplitOptionsProps {
  pageCount: number;
  selectedPages: number[];
  onSplit: (options: SplitOption) => void;
  isProcessing: boolean;
}

export default function SplitOptions({
  pageCount,
  selectedPages,
  onSplit,
  isProcessing,
}: SplitOptionsProps) {
  const [activeTab, setActiveTab] = useState<"pages" | "ranges" | "every-n">(
    "pages"
  );
  const [rangeInput, setRangeInput] = useState("");
  const [everyN, setEveryN] = useState(2);

  const handleSplit = () => {
    if (activeTab === "pages") {
      if (selectedPages.length === 0) {
        alert("Veuillez sélectionner au moins une page.");
        return;
      }
      onSplit({ type: "pages", pages: selectedPages });
    } else if (activeTab === "ranges") {
      if (!rangeInput.trim()) {
        alert("Veuillez entrer une plage de pages.");
        return;
      }
      onSplit({ type: "ranges", ranges: rangeInput });
    } else {
      onSplit({ type: "every-n", everyN });
    }
  };

  const tabs = [
    { id: "pages" as const, label: "Pages sélectionnées", icon: "📑" },
    { id: "ranges" as const, label: "Plage de pages", icon: "📏" },
    { id: "every-n" as const, label: "Toutes les N pages", icon: "✂️" },
  ];

  return (
    <div className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Options de division</h3>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-surface border border-border text-muted hover:border-primary/30"
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        {activeTab === "pages" && (
          <div>
            <p className="text-sm text-muted mb-3">
              {selectedPages.length > 0
                ? `${selectedPages.length} page(s) sélectionnée(s) : ${selectedPages.sort((a, b) => a - b).join(", ")}`
                : "Sélectionnez des pages dans l'aperçu ci-dessus."}
            </p>
            {selectedPages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPages
                  .sort((a, b) => a - b)
                  .map((page) => (
                    <span
                      key={page}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      Page {page}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ranges" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Entrez les plages de pages
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="Ex: 1-5, 8, 10-12"
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            <p className="text-xs text-muted mt-2">
              Séparez les plages par des virgules. Ex: 1-5, 8, 10-12
            </p>
          </div>
        )}

        {activeTab === "every-n" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Extraire toutes les N pages
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={pageCount}
                value={everyN}
                onChange={(e) => setEveryN(parseInt(e.target.value))}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={everyN}
                  onChange={(e) =>
                    setEveryN(
                      Math.max(1, Math.min(pageCount, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-20 px-3 py-2 border border-border rounded-xl bg-background text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm text-muted">pages</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">
              Cela créera des fichiers de {everyN} pages chacun
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSplit}
        disabled={isProcessing}
        className="btn-primary w-full py-4 rounded-xl text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isProcessing ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Traitement en cours...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Diviser et télécharger
          </>
        )}
      </button>
    </div>
  );
}
