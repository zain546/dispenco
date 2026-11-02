'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
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

/**
 * Normalizes raw scanned strings from medicine boxes:
 * - Strips GS1 / symbology prefixes (e.g. \u001d, ]d2, ]Q3, ]C1)
 * - If the code is a GS1 2D DataMatrix or GS1 QR code (used on DRAP/pharma packs
 *   containing AI (01) GTIN + (17) Expiry + (10) Batch + (21) Serial), extracts the
 *   14-digit GTIN so every box of the same medicine shares the same identifier.
 */
export function normalizeScannedMedicineCode(raw: string): string {
  if (!raw) return '';
  // Strip control characters (GS1 FNC1 = ASCII 29 / \x1d) and symbology identifiers
  let cleaned = raw
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/^(\]d2|\]Q3|\]C1|\]e0)/i, '')
    .trim();

  // Check human-readable GS1 format: (01)08964001234567(17)...
  const parenGs1Match = cleaned.match(/^\(01\)(\d{14})/);
  if (parenGs1Match) {
    return parenGs1Match[1];
  }

  // Check standard unparenthesized GS1 2D DataMatrix / QR format:
  // Starts with '01' followed by 14-digit GTIN, then AI '17' (YYMMDD) or '10' (Batch) or '21' (Serial)
  if (cleaned.length >= 22 && cleaned.startsWith('01')) {
    const potentialGtin = cleaned.slice(2, 16);
    const remainder = cleaned.slice(16);
    if (/^\d{14}$/.test(potentialGtin) && /^(17\d{6}|10|21|11\d{6})/.test(remainder)) {
      return potentialGtin;
    }
  }

  // If it is a URL with a product code or query param, keep cleaned string
  return cleaned;
}

export interface ScannerInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onScan?: (barcode: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  showCameraToggle?: boolean;
}

export const ScannerInput = React.forwardRef<HTMLInputElement, ScannerInputProps>(
  (
    {
      value = '',
      onChange,
      onScan,
      onKeyDown: onKeyDownProp,
      placeholder = 'Scan QR / barcode or type...',
      autoFocus = false,
      disabled = false,
      className = '',
      id,
      name,
      showCameraToggle = true,
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
        const normalized = normalizeScannedMedicineCode(scannedText);
        if (!normalized) return;

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

        setInternalValue(normalized);
        onChangeRef.current?.(normalized);
        onScanRef.current?.(normalized);
        toast.success(`Scanned code: ${normalized}`);

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
        const normalized = normalizeScannedMedicineCode(internalValue);
        if (normalized) {
          onScan?.(normalized);
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

          // Start decoding directly from constraints (opens camera permission + HD stream in one step)
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
          // (Reads small QR codes & glossy medicine box DataMatrix codes significantly faster)
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
      <div className="relative flex items-center w-full gap-1.5">
        <div className="relative flex-1">
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
            className={`pr-9 font-mono text-sm tracking-wide focus-visible:ring-2 focus-visible:ring-primary ${className}`}
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

        {/* Camera QR & Barcode Scanner Modal */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent className="sm:max-w-md p-4 sm:p-6 overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Camera className="size-5 text-primary" />
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
