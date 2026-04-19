"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  storage_path?: string;
}

const MAX_IMAGES = 10;
const MAX_BYTES = 2 * 1024 * 1024;

export default function ReferenceGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        if (data.images && Array.isArray(data.images)) {
          setImages(data.images);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxSrc(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || uploading) return;
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/")
      );
      if (!files.length) return;

      setUploading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUploading(false);
        return;
      }

      const remaining = MAX_IMAGES - images.length;

      for (const f of files.slice(0, remaining)) {
        if (f.size > MAX_BYTES) continue;

        const id = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        const ext = (f.type.split("/")[1] || "png").replace("jpeg", "jpg");
        const path = `${user.id}/${id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(path, f, { contentType: f.type });

        if (uploadError) continue;

        await supabase.from("gallery_images").insert({
          id,
          user_id: user.id,
          name: f.name,
          storage_path: path,
        });

        const { data: signed } = await supabase.storage
          .from("gallery")
          .createSignedUrl(path, 3600);

        if (signed?.signedUrl) {
          setImages((prev) => [
            ...prev,
            { id, name: f.name, url: signed.signedUrl, storage_path: path },
          ]);
        }
      }

      setUploading(false);
    },
    [images.length, uploading]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));

    fetch("/api/gallery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#1e293b]">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-200 m-0">
          Reference Charts
        </h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-[#1e293b] text-slate-200 border border-[#334155] px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer hover:bg-[#334155] hover:border-[#475569] disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "+ Upload"}
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
            Drag &amp; drop chart screenshots here, or click Upload.
          </div>
        )}

        {images.map((img) => (
          <div
            key={img.id}
            className="relative w-20 h-20 rounded-md overflow-hidden cursor-pointer flex-none border border-[#1e293b] group"
            onClick={() => setLightboxSrc(img.url)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
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
