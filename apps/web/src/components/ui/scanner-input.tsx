'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
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

export interface ScannerInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onScan?: (barcode: string) => void;
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
      placeholder = 'Scan barcode or type...',
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
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

    const internalInputRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalInputRef;
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);

  // Sync internal value with controlled value prop
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInternalValue(newVal);
    onChange?.(newVal);
  };

  const handleScanSuccess = useCallback(
    (scannedText: string) => {
      const trimmed = scannedText.trim();
      if (!trimmed) return;

      // Audio feedback using Web Audio API for native sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (err) {
        // Fallback if Web Audio fails
      }

      setInternalValue(trimmed);
      onChange?.(trimmed);
      onScan?.(trimmed);
      toast.success(`Scanned: ${trimmed}`);

      // Stop camera if open
      if (isCameraOpen) {
        setIsCameraOpen(false);
      }
    },
    [onChange, onScan, isCameraOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = internalValue.trim();
      if (trimmed) {
        onScan?.(trimmed);
      }
    }
  };

  // Hardware Scanner buffer detection for rapid keypresses
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in a text area or another input not managed here
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
          handleScanSuccess(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // Rapid typing (<50ms between keys) implies hardware barcode scanner
        if (timeDiff > 100) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleScanSuccess]);

  // Start Camera scanning stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      setAvailableDevices(videoInputDevices);

      // Default to back camera (environment) if available
      let deviceToUse = selectedDeviceId;
      if (!deviceToUse && videoInputDevices.length > 0) {
        const backCamera = videoInputDevices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );
        deviceToUse = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        setSelectedDeviceId(deviceToUse);
      }

      if (videoRef.current && deviceToUse) {
        const controls = await codeReaderRef.current.decodeFromVideoDevice(
          deviceToUse,
          videoRef.current,
          (result, error) => {
            if (result) {
              handleScanSuccess(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      }
    } catch (err: any) {
      console.error('Camera Scanner Error:', err);
      setCameraError(err.message || 'Unable to access camera');
      setIsScanning(false);
    }
  }, [selectedDeviceId, handleScanSuccess]);

  // Stop camera stream when modal closes
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraOpen, startCamera, stopCamera]);

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
          title="Open camera barcode scanner"
          className="h-11 w-11 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Camera className="size-5" />
        </Button>
      )}

      {/* Camera Barcode Scanner Modal */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Camera className="size-5 text-primary" />
              <span>Camera Barcode Scanner</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Point your camera at a medicine barcode (EAN-13, Code 128, UPC, DataMatrix).
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-2 flex flex-col items-center justify-center bg-black/90 rounded-xl overflow-hidden min-h-[260px] border border-border">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />

            {/* Scanning Laser Animation Overlay */}
            {isScanning && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-3/4 h-36 border-2 border-primary/70 rounded-lg relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-3 text-[11px] font-medium text-white/80 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  Scanning for barcode...
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
                  onClick={startCamera}
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
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-muted text-foreground text-xs rounded-md px-2 py-1 border border-border"
              >
                {availableDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
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
