import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface DebouncedNumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  debounceMs?: number;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  autoSelectOnFocus?: boolean;
}

export const DebouncedNumericInput: React.FC<DebouncedNumericInputProps> = ({
  value,
  onChange,
  debounceMs = 350,
  className = '',
  min,
  max,
  step = 1,
  placeholder = '0',
  disabled = false,
  autoSelectOnFocus = true,
  onFocus,
  onBlur,
  ...restProps
}) => {
  const [localVal, setLocalVal] = useState<string>(() => (value === null || value === undefined ? '' : String(value)));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep localValue in sync with parent prop if parent value changes externally and user is not active
  useEffect(() => {
    setLocalVal(value === null || value === undefined ? '' : String(value));
  }, [value]);

  const commitValue = useCallback((strVal: string) => {
    let num = parseFloat(strVal);
    if (isNaN(num)) {
      num = 0;
    }
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    onChangeRef.current(num);
  }, [min, max]);

  const sanitizeLeadingZero = (str: string): string => {
    if (!str) return '';
    // Don't strip if decimal e.g. "0.5", "0.", "0.00"
    if (str.startsWith('0.') || str === '0') return str;
    // If e.g. "05", "007"
    if (/^0+[1-9]/.test(str)) {
      return str.replace(/^0+/, '');
    }
    return str;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const newVal = sanitizeLeadingZero(rawVal);
    setLocalVal(newVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      commitValue(newVal);
    }, debounceMs);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoSelectOnFocus) {
      e.target.select();
    }
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    commitValue(localVal);
    if (onBlur) {
      onBlur(e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <input
      type="number"
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      {...restProps}
    />
  );
};

export const MemoizedDebouncedNumericInput = React.memo(DebouncedNumericInput);
