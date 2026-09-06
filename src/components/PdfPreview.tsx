"use client";

import { useEffect, useRef, useState } from "react";
import { PdfPageInfo } from "@/lib/pdfUtils";

interface PdfPreviewProps {
  pageCount: number;
  pages: PdfPageInfo[];
  onTogglePage: (pageNum: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function PdfPreview({
  pageCount,
  pages,
  onTogglePage,
  onSelectAll,
  onDeselectAll,
}: PdfPreviewProps) {
  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            Pages du PDF
          </h3>
          <p className="text-sm text-muted">
            {selectedCount} sur {pageCount} pages sélectionnées
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Tout sélectionner
          </button>
          <button
            onClick={onDeselectAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted/10 text-muted hover:bg-muted/20 transition-colors"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {pages.map((page) => (
          <button
            key={page.pageNumber}
            onClick={() => onTogglePage(page.pageNumber)}
            className={`page-card relative aspect-[3/4] rounded-xl border-2 flex items-center justify-center font-semibold text-lg
              ${
                page.selected
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border bg-surface text-muted hover:border-primary/30"
              }`}
          >
            {page.pageNumber}
            {page.selected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
