// src/components/ImageUpload.jsx
import React, { useCallback, useState, useEffect } from "react";

/**
 * ImageUpload
 * - maxFiles: number
 * - onChange: receives array of base64 strings for current images
 *
 * Usage:
 * <ImageUpload maxFiles={6} onChange={(base64Arr) => setImages(base64Arr)} />
 */
export default function ImageUpload({ maxFiles = 6, onChange }) {
  const [previews, setPreviews] = useState([]); // [{ file, name, url, base64 }]

  // cleanup object URLs
  useEffect(() => {
    return () => {
      previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      const allowed = files.slice(0, Math.max(0, maxFiles - previews.length));
      if (allowed.length === 0) {
        alert(`You can upload up to ${maxFiles} images.`);
        return;
      }

      // Build previews with url + base64
      const newPreviews = await Promise.all(
        allowed.map(async (f) => {
          const url = URL.createObjectURL(f);
          const base64 = await toBase64(f);
          return { file: f, name: f.name, url, base64 };
        })
      );

      const all = [...previews, ...newPreviews];
      setPreviews(all);

      // send base64 array upward
      if (onChange) onChange(all.map((p) => p.base64));
    },
    [maxFiles, previews, onChange]
  );

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const onSelect = (e) => {
    handleFiles(e.target.files);
    // reset input so selecting same file again triggers event
    e.target.value = null;
  };

  const handleRemove = (index) => {
    const removed = previews[index];
    if (removed?.url) URL.revokeObjectURL(removed.url);
    const next = previews.filter((_, i) => i !== index);
    setPreviews(next);
    if (onChange) onChange(next.map((p) => p.base64));
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2">Images (max {maxFiles})</label>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative border-dashed border-2 border-gray-300 rounded-lg p-4 text-center bg-white cursor-pointer hover:border-gray-400 transition"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="pointer-events-none">
          <p className="text-sm text-gray-600 font-medium">Drag images here or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Recommended: square or 4:3 photos. Max {maxFiles} images.</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((p, idx) => (
            <div key={idx} className="relative rounded overflow-hidden border">
              <img src={p.url} alt={p.name} className="w-full h-28 object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600 transition"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
