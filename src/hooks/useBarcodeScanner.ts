'use client';

import { useEffect, useRef } from 'react';

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enableInInputs?: boolean;
}

/**
 * Enterprise React Custom Hook for Global Hardware HID Barcode Scanner Interception.
 * Handles fast keystroke bursts (< 50ms) from USB/Bluetooth laser/CCD scanners
 * without requiring the user to click or focus on an input element.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 4,
  maxIntervalMs = 60,
  enableInInputs = false,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Guard against standard form inputs unless explicitly allowed
      const target = event.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInput && !enableInInputs) {
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // 2. Clear buffer if key arrival interval exceeds hardware threshold
      if (timeSinceLastKey > maxIntervalMs) {
        bufferRef.current = '';
      }

      // 3. Check for Terminator key (Enter / Tab) sent by hardware scanners
      if (event.key === 'Enter' || event.key === 'Tab') {
        const scannedCode = bufferRef.current.trim();
        if (scannedCode.length >= minChars) {
          event.preventDefault();
          event.stopPropagation();
          onScanRef.current(scannedCode);
        }
        bufferRef.current = '';
        return;
      }

      // 4. Append standard single printable characters to buffer
      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [minChars, maxIntervalMs, enableInInputs]);
}
