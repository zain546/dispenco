'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

export interface DraftPriceInputProps {
  value: number;
  min?: number;
  onChange: (val: number) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}

/**
 * Draft-safe decimal price input for POS terminals:
 * 1. Auto-selects on focus so cashiers can replace prices with 1 keypress.
 * 2. Allows clearing/backspacing without immediately snapping to 0 or reverting.
 * 3. Commits formatted decimal value on blur or Enter.
 * 4. Prevents mouse-wheel scrolling from modifying values.
 * 5. Suppresses blur commit on Escape cancellation.
 */
export function DraftPriceInput({
  value,
  min = 0.01,
  onChange,
  className,
  title,
  disabled,
}: DraftPriceInputProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const isCancelledRef = useRef(false);

  // Sync draft when external value changes
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitValue = (valStr: string) => {
    const trimmed = valStr.trim();
    if (trimmed === '' || isNaN(Number(trimmed))) {
      setDraft(String(value));
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed < min) {
      setDraft(String(value));
      return;
    }
    const rounded = Number(parsed.toFixed(2));
    setDraft(String(rounded));
    if (rounded !== value) {
      onChange(rounded);
    }
  };

  const handleBlur = () => {
    if (isCancelledRef.current) {
      isCancelledRef.current = false;
      return;
    }
    commitValue(draft);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      title={title}
      value={draft}
      onFocus={(e) => {
        isCancelledRef.current = false;
        e.target.select();
      }}
      onChange={(e) => {
        const val = e.target.value;
        // Accept empty string or valid decimal numbers (digits with optional single decimal point)
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
          setDraft(val);
        }
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitValue(draft);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          isCancelledRef.current = true;
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
      onWheel={(e) => e.currentTarget.blur()}
      className={className}
    />
  );
}

