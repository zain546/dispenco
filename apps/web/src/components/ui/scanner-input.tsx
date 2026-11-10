'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { BrowserMultiFormatReader } from '@zxing/browser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { QrCode, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface Gs1ParsedMedicineData {
  raw: string;
  code: string; // Normalized GTIN or barcode
  gtin?: string;
  batchNumber?: string;
  expiryDate?: string; // YYYY-MM-DD
  mfgDate?: string; // YYYY-MM-DD
  serialNumber?: string;
  mrp?: number;
  isGs1: boolean;
}

/**
 * Converts a 6-digit GS1 YYMMDD string into YYYY-MM-DD.
 * In GS1 standard, DD = "00" means the last day of that month.
 */
function parseGs1DateYYMMDD(yymmdd: string): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  let dd = parseInt(yymmdd.slice(4, 6), 10);

  if (mm < 1 || mm > 12) return undefined;
  const yyyy = 2000 + yy;

  // DD === 0 means end of month in GS1 specification
  if (dd === 0) {
    dd = new Date(yyyy, mm, 0).getDate();
  } else if (dd > 31) {
    return undefined;
  }

  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Parses a raw scanned string from a medicine box (2D GS1 DataMatrix, QR code, or 1D barcode)
 * and extracts GTIN (01), Expiry Date (17), Mfg Date (11), Batch Number (10), and Serial Number (21).
 */
export function parseGs1MedicineCode(raw: string): Gs1ParsedMedicineData {
  if (!raw) {
    return { raw: '', code: '', isGs1: false };
  }

  // Strip symbology identifiers like ]d2, ]Q3, ]C1, ]e0 while preserving \x1d (GS1 Group Separator)
  const withoutSymbology = raw.replace(/^(\]d2|\]Q3|\]C1|\]e0)/i, '').trim();

  // Case 1: Human-readable parenthesized GS1 format e.g. (01)08964001422082(17)280600(10)6H121...
  if (/^\(01\)\d{14}/.test(withoutSymbology)) {
    const result: Gs1ParsedMedicineData = {
      raw,
      code: '',
      isGs1: true,
    };
    const tokenRegex = /\((\d{2,4})\)([^()]+)/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(withoutSymbology)) !== null) {
      const ai = match[1];
      const val = match[2].replace(/[\x00-\x1F\x7F]/g, '').trim();
      if (ai === '01' && /^\d{14}$/.test(val)) {
        result.gtin = val;
        result.code = val;
      } else if (ai === '17') {
        result.expiryDate = parseGs1DateYYMMDD(val.slice(0, 6));
      } else if (ai === '11') {
        result.mfgDate = parseGs1DateYYMMDD(val.slice(0, 6));
      } else if (ai === '10') {
        result.batchNumber = val;
      } else if (ai === '21') {
        result.serialNumber = val;
      }
    }
    if (result.code) return result;
  }

  // Case 2: Standard GS1 2D DataMatrix / QR unparenthesized format
  // Strip leading FNC1 (\x1d) if present at index 0
  const gs1Raw = withoutSymbology.replace(/^\x1d+/, '');
  if (gs1Raw.startsWith('01') && /^\d{14}$/.test(gs1Raw.slice(2, 16)) && gs1Raw.length > 16) {
    const gtin = gs1Raw.slice(2, 16);
    const result: Gs1ParsedMedicineData = {
      raw,
      code: gtin,
      gtin,
      isGs1: true,
    };

    let rest = gs1Raw.slice(16);
    // Split by GS1 Group Separator (\x1d) if present
    const segments = rest.split('\x1d').filter(Boolean);

    for (const seg of segments) {
      let cursor = seg;
      let safety = 0;
      while (cursor.length >= 2 && safety < 10) {
        safety++;
        cursor = cursor.replace(/^[\x00-\x1F\x7F]+/, '');
        if (cursor.startsWith('17') && /^\d{6}/.test(cursor.slice(2, 8))) {
          const parsedExp = parseGs1DateYYMMDD(cursor.slice(2, 8));
          if (parsedExp) {
            result.expiryDate = parsedExp;
            cursor = cursor.slice(8);
            continue;
          }
        }
        if (cursor.startsWith('11') && /^\d{6}/.test(cursor.slice(2, 8))) {
          const parsedMfg = parseGs1DateYYMMDD(cursor.slice(2, 8));
          if (parsedMfg) {
            result.mfgDate = parsedMfg;
            cursor = cursor.slice(8);
            continue;
          }
        }
        if (cursor.startsWith('10')) {
          const body = cursor.slice(2);
          // If no \x1d was used between Batch (10) and Expiry (17)/Mfg (11)/Serial (21),
          // check if 17YYMMDD or 11YYMMDD or 21<12+ digits> follows
          const embeddedDateMatch = body.match(/^([A-Za-z0-9\-/]{3,12}?)(17[2-3]\d[01]\d[0-3]\d|11[2-3]\d[01]\d[0-3]\d)(.*)$/);
          if (embeddedDateMatch) {
            result.batchNumber = embeddedDateMatch[1];
            cursor = embeddedDateMatch[2] + embeddedDateMatch[3];
            continue;
          }
          const embeddedSnMatch = body.match(/^([A-Za-z0-9\-/]{3,10}?)(21\d{12,20})$/);
          if (embeddedSnMatch) {
            result.batchNumber = embeddedSnMatch[1];
            cursor = embeddedSnMatch[2];
            continue;
          }
          if (!result.batchNumber) {
            result.batchNumber = body.slice(0, 20);
          }
          break;
        }
        if (cursor.startsWith('21')) {
          result.serialNumber = cursor.slice(2, 22);
          break;
        }
        break;
      }
    }

    return result;
  }

  // Case 3: Multi-line or labeled QR text (e.g. "GTIN:08964001422082 BATCH NO:6H121 EXP:06/2028 MRP RS:752.60")
  const gtinLabelMatch = withoutSymbology.match(/GTIN\s*[:=-]?\s*(\d{12,14})/i);
  if (gtinLabelMatch) {
    const gtin = gtinLabelMatch[1];
    const batchMatch = withoutSymbology.match(/BATCH(?:\s*NO)?\s*[:=-]?\s*([A-Za-z0-9\-]+)/i);
    const expMatch = withoutSymbology.match(/EXP\s*[:=-]?\s*(\d{2})\/(\d{4})/i);
    const mfgMatch = withoutSymbology.match(/MFG\s*[:=-]?\s*(\d{2})\/(\d{4})/i);
    const mrpMatch = withoutSymbology.match(/MRP(?:\s*RS)?\s*[:=.-]?\s*(\d+(?:\.\d+)?)/i);

    let expiryDate: string | undefined;
    if (expMatch) {
      const mm = parseInt(expMatch[1], 10);
      const yyyy = parseInt(expMatch[2], 10);
      const lastDay = new Date(yyyy, mm, 0).getDate();
      expiryDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    let mfgDate: string | undefined;
    if (mfgMatch) {
      mfgDate = `${mfgMatch[2]}-${mfgMatch[1]}-01`;
    }

    return {
      raw,
      code: gtin,
      gtin,
      batchNumber: batchMatch?.[1],
      expiryDate,
      mfgDate,
      mrp: mrpMatch ? parseFloat(mrpMatch[1]) : undefined,
      isGs1: true,
    };
  }

  // Standard 1D barcode or plain QR string
  const cleaned = withoutSymbology.replace(/[\x00-\x1F\x7F]/g, '').trim();
  return {
    raw,
    code: cleaned,
    isGs1: false,
  };
}

export function normalizeScannedMedicineCode(raw: string): string {
  return parseGs1MedicineCode(raw).code;
}

export interface ScannerInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onScan?: (barcode: string, parsedData?: Gs1ParsedMedicineData) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  showCameraToggle?: boolean;
  buttonOnly?: boolean;
  buttonLabel?: string;
}

export const ScannerInput = React.forwardRef<HTMLInputElement, ScannerInputProps>(
  (
    {
      value = '',
      onChange,
      onScan,
      onKeyDown: onKeyDownProp,
      placeholder = 'Scan or enter barcode...',
      autoFocus = false,
      disabled = false,
      className = '',
      id,
      name,
      showCameraToggle = true,
      buttonOnly = false,
      buttonLabel = 'Scan Box',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    const internalInputRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalInputRef;
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const nativeDetectorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasScannedRef = useRef<boolean>(false);
    const onScanRef = useRef(onScan);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
      onScanRef.current = onScan;
      onChangeRef.current = onChange;
    }, [onScan, onChange]);

    // Sync internal value with controlled value prop
    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      setInternalValue(newVal);
      onChange?.(newVal);
    };

    const stopCamera = useCallback(() => {
      if (nativeDetectorIntervalRef.current) {
        clearInterval(nativeDetectorIntervalRef.current);
        nativeDetectorIntervalRef.current = null;
      }
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {
          // Ignore stop errors
        }
        controlsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsScanning(false);
    }, []);

    const handleScanSuccess = useCallback(
      (scannedText: string) => {
        if (hasScannedRef.current) return;
        const parsed = parseGs1MedicineCode(scannedText);
        if (!parsed.code) return;

        hasScannedRef.current = true;

        // Audio feedback using Web Audio API for native beep sound
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } catch {
          // Fallback if Web Audio fails
        }

        setInternalValue(parsed.code);
        onChangeRef.current?.(parsed.code);
        onScanRef.current?.(parsed.code, parsed);

        stopCamera();
        setIsCameraOpen(false);
        setTimeout(() => {
          hasScannedRef.current = false;
        }, 500);
      },
      [stopCamera]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDownProp?.(e);
      if (e.defaultPrevented) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const parsed = parseGs1MedicineCode(internalValue);
        if (parsed.code) {
          onScan?.(parsed.code, parsed);
        }
      }
    };

    // Hardware Scanner buffer detection for rapid keypresses
    useEffect(() => {
      let buffer = '';
      let lastKeyTime = Date.now();

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          activeEl !== inputRef.current &&
          (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')
        ) {
          return;
        }

        const currentTime = Date.now();
        const timeDiff = currentTime - lastKeyTime;
        lastKeyTime = currentTime;

        if (e.key === 'Enter') {
          if (buffer.length >= 3 && timeDiff < 100) {
            e.preventDefault();
            hasScannedRef.current = false;
            handleScanSuccess(buffer);
            buffer = '';
          }
        } else if (e.key.length === 1) {
          if (timeDiff > 100) {
            buffer = e.key;
          } else {
            buffer += e.key;
          }
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleScanSuccess, inputRef]);

    // Start Camera scanning stream (supports QR Code, GS1 2D DataMatrix, and 1D Barcodes)
    const startCamera = useCallback(
      async (overrideDeviceId?: string) => {
        stopCamera();
        hasScannedRef.current = false;
        setCameraError(null);
        setIsScanning(true);

        try {
          if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            throw new Error(
              'Camera API is not available in this browser or requires a secure HTTPS connection.'
            );
          }

          // Wait briefly for Dialog portal to mount the <video> element
          let attempts = 0;
          while (!videoRef.current && attempts < 25) {
            await new Promise((resolve) => setTimeout(resolve, 40));
            attempts++;
          }

          if (!videoRef.current) {
            throw new Error('Camera video element failed to initialize. Please try again.');
          }

          // Dynamically import ZXing only when camera scanning is activated
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
          ]);

          // Configure ZXing with TRY_HARDER + all 2D (QR, DataMatrix) & 1D formats
          const hints = new Map();
          hints.set(DecodeHintType.TRY_HARDER, true);
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.AZTEC,
            BarcodeFormat.PDF_417,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.CODE_93,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.ITF,
            BarcodeFormat.CODABAR,
          ]);
          codeReaderRef.current = new BrowserMultiFormatReader(hints, {
            delayBetweenScanAttempts: 100,
          });

          const videoConstraints: MediaTrackConstraints = overrideDeviceId
            ? {
                deviceId: { exact: overrideDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              };

          const controls = await codeReaderRef.current.decodeFromConstraints(
            { video: videoConstraints, audio: false },
            videoRef.current,
            (result) => {
              if (result) {
                handleScanSuccess(result.getText());
              }
            }
          );
          controlsRef.current = controls;

          // Populate camera list now that permission is granted
          const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
          setAvailableDevices(videoInputDevices);
          if (!overrideDeviceId && !selectedDeviceId && videoInputDevices.length > 0) {
            const backCam = videoInputDevices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            setSelectedDeviceId((backCam || videoInputDevices[0]).deviceId);
          }

          // Also run native hardware-accelerated BarcodeDetector in parallel if supported by browser
          const WinWithDetector = window as unknown as {
            BarcodeDetector?: new (opts?: { formats: string[] }) => {
              detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
          };
          if (typeof WinWithDetector.BarcodeDetector === 'function') {
            try {
              const nativeDetector = new WinWithDetector.BarcodeDetector({
                formats: [
                  'qr_code',
                  'data_matrix',
                  'aztec',
                  'pdf417',
                  'ean_13',
                  'ean_8',
                  'code_128',
                  'code_39',
                  'upc_a',
                  'upc_e',
                  'itf',
                ],
              });
              nativeDetectorIntervalRef.current = setInterval(async () => {
                if (!videoRef.current || videoRef.current.readyState < 2 || hasScannedRef.current) {
                  return;
                }
                try {
                  const barcodes = await nativeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    handleScanSuccess(barcodes[0].rawValue);
                  }
                } catch {
                  // Ignore single-frame detection errors
                }
              }, 120);
            } catch {
              // Native BarcodeDetector init failed; ZXing continues running
            }
          }
        } catch (err: unknown) {
          console.error('Camera Scanner Error:', err);
          const rawMsg = err instanceof Error ? err.message : 'Unable to access camera';
          if (rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('notallowed')) {
            setCameraError(
              'Camera permission was denied. Please allow camera access in your browser address bar and click Retry.'
            );
          } else if (rawMsg.toLowerCase().includes('notfound') || rawMsg.toLowerCase().includes('device not found')) {
            setCameraError('No camera was detected on this device. You can still use any USB/Bluetooth scanner.');
          } else {
            setCameraError(rawMsg);
          }
          setIsScanning(false);
        }
      },
      [selectedDeviceId, handleScanSuccess, stopCamera]
    );

    useEffect(() => {
      if (isCameraOpen) {
        startCamera(selectedDeviceId || undefined);
      } else {
        stopCamera();
      }
      return () => {
        stopCamera();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCameraOpen]);

    return (
      <div className={buttonOnly ? 'inline-flex shrink-0' : 'relative flex items-center w-full gap-1.5'}>
        {buttonOnly ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsCameraOpen(true)}
            disabled={disabled}
            className={`h-9 px-3.5 gap-2 font-semibold text-xs rounded-lg shadow-2xs shrink-0 ${className}`}
          >
            <Camera className="size-4 shrink-0" />
            <span>{buttonLabel}</span>
          </Button>
        ) : (
          <>
            <div className="relative flex-1 min-w-0">
              <Input
                ref={inputRef}
                id={id}
                name={name}
                type="text"
                value={internalValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className={`pr-9 font-mono text-sm tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-xs sm:placeholder:text-sm focus-visible:ring-2 focus-visible:ring-primary ${className}`}
              />
              <QrCode className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none opacity-60" />
            </div>

            {showCameraToggle && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCameraOpen(true)}
                disabled={disabled}
                title="Open QR & Barcode Camera Scanner"
                className="h-11 w-11 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Camera className="size-5" />
              </Button>
            )}
          </>
        )}

        {/* Camera QR & Barcode Scanner Modal */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent className="sm:max-w-md p-4 sm:p-6 overflow-hidden">
            <DialogHeader className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Camera className="size-5 text-primary shrink-0" />
                <span>QR Code &amp; Barcode Scanner</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Point your camera at any medicine box QR code, 2D DataMatrix, or barcode.
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-2 flex flex-col items-center justify-center bg-black/90 rounded-xl overflow-hidden min-h-[280px] border border-border">
              <video
                ref={videoRef}
                className="w-full h-72 object-cover"
                autoPlay
                playsInline
                muted
              />

              {/* Universal QR + 2D DataMatrix + Barcode Target Frame */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-primary/70 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-primary rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-primary rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-primary rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-primary rounded-br-md" />
                    <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="mt-2.5 text-micro font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Scanning QR Code / DataMatrix / Barcode...
                  </p>
                </div>
              )}

              {/* Camera Access Error State */}
              {cameraError && (
                <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-4 text-center">
                  <AlertCircle className="size-10 text-destructive mb-2" />
                  <p className="text-sm font-semibold text-foreground">Camera Access Failed</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">{cameraError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                    onClick={() => startCamera(selectedDeviceId || undefined)}
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Retry Camera</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Camera Switcher Dropdown if multiple cameras exist */}
            {availableDevices.length > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Select Camera:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedDeviceId(newId);
                    startCamera(newId);
                  }}
                  className="bg-muted text-foreground text-xs rounded-md px-2 py-1 border border-border"
                >
                  {availableDevices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);
ScannerInput.displayName = 'ScannerInput';
