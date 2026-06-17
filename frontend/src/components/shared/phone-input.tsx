"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPhoneInput, onlyDigits } from "@/lib/utils";

interface PhoneInputProps {
  id?: string;
  /** 9 raqamli xom qiymat (masalan "901000002") */
  value: string;
  onChange: (rawDigits: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
}

/** +998 prefiksli, "00 000 0000" niqobli telefon inputi (faqat raqam). */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder = "00 000 0000",
}: PhoneInputProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-full overflow-hidden rounded-md border bg-background shadow-sm transition-colors focus-within:ring-1",
        invalid
          ? "border-destructive focus-within:ring-destructive"
          : "border-input focus-within:ring-ring",
      )}
    >
      <span className="flex select-none items-center border-r bg-muted px-3 text-sm text-muted-foreground">
        +998
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder}
        value={formatPhoneInput(value)}
        onChange={(e) => onChange(onlyDigits(e.target.value))}
        onBlur={onBlur}
        className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
