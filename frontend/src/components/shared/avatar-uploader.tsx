"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const text = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return text.toUpperCase() || "?";
}

interface AvatarUploaderProps {
  /** Currently saved avatar URL (from the server). */
  currentUrl?: string;
  /** Used for fallback initials when there is no image. */
  fullName?: string;
  /** Called with a validated file once the user picks one. */
  onFileSelected: (file: File) => void;
  /** Called with a human-readable message when validation fails. */
  onError?: (message: string) => void;
  /** Show a spinner / disable while an upload is in flight. */
  uploading?: boolean;
  disabled?: boolean;
  /** Diameter in pixels. */
  size?: number;
}

/**
 * AvatarUploader renders the current avatar (or initials), lets the user pick a
 * new image, validates it client-side, and shows an instant local preview. It
 * does not upload by itself — the parent decides what to do with the file.
 */
export function AvatarUploader({
  currentUrl,
  fullName,
  onFileSelected,
  onError,
  uploading = false,
  disabled = false,
  size = 96,
}: AvatarUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  // Revoke the object URL when it changes or on unmount to avoid memory leaks.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const openPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      onError?.("Faqat JPG, PNG yoki WEBP rasm tanlang");
      return;
    }
    if (file.size > MAX_SIZE) {
      onError?.("Rasm hajmi 5MB dan oshmasligi kerak");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  };

  const shown = preview ?? currentUrl;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || uploading}
        className="group relative shrink-0 overflow-hidden rounded-full border bg-muted disabled:opacity-60"
        style={{ width: size, height: size }}
        aria-label="Avatar rasmini tanlash"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl font-medium text-muted-foreground">
            {initials(fullName)}
          </span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      <div className="space-y-1">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          {uploading ? "Yuklanmoqda..." : "Rasm tanlash"}
        </button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG yoki WEBP · maksimum 5MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
