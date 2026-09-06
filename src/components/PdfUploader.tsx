"use client";

import { useCallback, useState, useRef } from "react";

interface PdfUploaderProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export default function PdfUploader({
  onFileSelected,
  isProcessing,
}: PdfUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type === "application/pdf") {
        onFileSelected(file);
      } else {
        alert("Veuillez sélectionner un fichier PDF.");
      }
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`drop-zone relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
        ${isProcessing ? "pointer-events-none opacity-50" : ""}
        transition-all duration-300`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300
            ${isDragOver ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-2">
            {isDragOver
              ? "Déposez votre PDF ici"
              : "Glissez-déposez votre PDF ici"}
          </h3>
          <p className="text-muted text-sm">
            ou cliquez pour sélectionner un fichier
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="px-2 py-1 bg-muted/10 rounded-lg">
            PDF uniquement
          </span>
          <span className="px-2 py-1 bg-muted/10 rounded-lg">
            Max 100 Mo
          </span>
        </div>
      </div>
    </div>
  );
}
