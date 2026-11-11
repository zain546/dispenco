'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export interface DraftQuantityInputProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}

/**
 * Draft-safe quantity input for POS terminals:
 * 1. Auto-selects on focus so cashiers can replace numbers with 1 keypress.
 * 2. Allows clearing/backspacing without immediately resetting to 1 or deleting the row.
 * 3. Commits clamped value on blur or Enter.
 * 4. Prevents mouse-wheel scrolling from accidentally modifying numbers.
 */
export function DraftQuantityInput({
  value,
  min = 1,
  max,
  onChange,
  className,
  title,
  disabled,
}: DraftQuantityInputProps) {
  const [draft, setDraft] = useState<string>(String(value));

  // Sync draft when external value changes (e.g. from +/- buttons)
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitValue = (valStr: string) => {
    const trimmed = valStr.trim();
    if (trimmed === '' || isNaN(Number(trimmed))) {
      setDraft(String(value));
      return;
    }
    let parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    if (parsed < min) parsed = min;
    if (max !== undefined && max > 0 && parsed > max) {
      parsed = max;
    }
    setDraft(String(parsed));
    if (parsed !== value) {
      onChange(parsed);
    }
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      disabled={disabled}
      title={title}
      value={draft}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const val = e.target.value;
        // Accept empty string or numeric digits only
        if (val === '' || /^\d+$/.test(val)) {
          setDraft(val);
        }
      }}
      onBlur={() => commitValue(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitValue(draft);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
      onWheel={(e) => e.currentTarget.blur()}
      className={className}
    />
  );
}

