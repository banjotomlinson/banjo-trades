"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GalleryImage {
  id: string;
  name: string;
  dataUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GALLERY_KEY = "liqGallery";
const MAX_IMAGES = 10;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ReferenceGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GALLERY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GalleryImage[];
        if (Array.isArray(parsed)) setImages(parsed);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  // Persist to localStorage whenever images change (skip initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(images));
    } catch (err) {
      console.warn("[liq-gallery] localStorage write failed", err);
    }
  }, [images]);

  // Close lightbox on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxSrc(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Process dropped / selected files
  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/")
      );
      if (!files.length) return;

      const remaining = MAX_IMAGES - images.length;
      files.slice(0, remaining).forEach((f) => {
        if (f.size > MAX_BYTES) {
          console.warn("[liq-gallery] skipping large file", f.name, f.size);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const newImg: GalleryImage = {
            id:
              "img_" +
              Date.now() +
              "_" +
              Math.random().toString(36).slice(2, 8),
            name: f.name,
            dataUrl: reader.result as string,
          };
          setImages((prev) => {
            if (prev.length >= MAX_IMAGES) return prev;
            return [...prev, newImg];
          });
        };
        reader.readAsDataURL(f);
      });
    },
    [images.length]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#1e293b]">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-200 m-0">
          Reference Charts
        </h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#1e293b] text-slate-200 border border-[#334155] px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer hover:bg-[#334155] hover:border-[#475569]"
        >
          + Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragover(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragover(false);
          if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
        }}
        className={`min-h-[96px] border-2 border-dashed rounded-lg p-2.5 flex flex-wrap gap-2.5 items-center transition-colors ${
          dragover
            ? "border-blue-500 bg-blue-500/5"
            : "border-[#1e293b]"
        }`}
      >
        {images.length === 0 && (
          <div className="flex-1 text-center text-slate-600 text-xs">
            Drag &amp; drop chart screenshots here, or click Upload. Stored
            locally until backend is wired.
          </div>
        )}

        {images.map((img) => (
          <div
            key={img.id}
            className="relative w-20 h-20 rounded-md overflow-hidden cursor-pointer flex-none border border-[#1e293b] group"
            onClick={() => setLightboxSrc(img.dataUrl)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.dataUrl}
              alt={img.name}
              className="w-full h-full object-cover block"
            />
            <button
              type="button"
              aria-label="Remove"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(img.id);
              }}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-slate-900/85 text-slate-200 border-none rounded-full text-xs font-bold cursor-pointer hidden group-hover:flex items-center justify-center p-0 hover:bg-red-500"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-10 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-full max-h-full rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          />
        </div>
      )}
    </div>
  );
}
