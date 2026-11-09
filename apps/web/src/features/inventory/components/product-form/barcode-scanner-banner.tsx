import React from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { ScannerInput, type Gs1ParsedMedicineData } from '@/components/ui/scanner-input';
import type { ProductFormValues } from '../../schemas/product-schema';

/**
 * Isolated smart scan subtitle to show scanned GTIN / Batch without root re-renders.
 */
export const SmartScanSubtitle = React.memo(function SmartScanSubtitle({
  control,
}: {
  control: any;
}) {
  const [barcode, batchNumber] = useWatch({ control, name: ['barcode', 'batchNumber'] });
  return (
    <p className="text-[11px] text-muted-foreground truncate">
      {barcode
        ? `GTIN: ${barcode}${batchNumber ? ` • Batch: ${batchNumber}` : ''}`
        : 'Auto-fills barcode, batch & expiry'}
    </p>
  );
});

/**
 * Isolated scanner input wrapper that subscribes only to barcode value.
 */
export const BarcodeScannerField = React.memo(function BarcodeScannerField({
  id,
  control,
  onChange,
  onScan,
  placeholder,
  buttonOnly,
  buttonLabel,
}: {
  id: string;
  control: any;
  onChange: (val: string) => void;
  onScan: (scannedVal: string, parsedData?: Gs1ParsedMedicineData) => void;
  placeholder?: string;
  buttonOnly?: boolean;
  buttonLabel?: string;
}) {
  const barcode = useWatch({ control, name: 'barcode' }) || '';
  return (
    <ScannerInput
      id={id}
      placeholder={placeholder}
      buttonOnly={buttonOnly}
      buttonLabel={buttonLabel}
      value={barcode}
      onChange={onChange}
      onScan={onScan}
    />
  );
});
