import React from 'react';
import { useWatch, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { ShieldAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProductFormValues } from '../../schemas/product-schema';

/**
 * Isolated prescription toggle to eliminate root re-renders on checkbox changes.
 */
export const PrescriptionStatusSection = React.memo(function PrescriptionStatusSection({
  control,
  setValue,
}: {
  control: any;
  setValue: any;
}) {
  const isControlled = useWatch({ control, name: 'isControlledSubstance' });

  return (
    <div className="flex flex-col justify-start rounded-md border border-input p-3 bg-card gap-1.5">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isControlledSubstance"
          checked={Boolean(isControlled)}
          onCheckedChange={(checked) =>
            setValue('isControlledSubstance', !!checked, { shouldValidate: true })
          }
        />
        <Label htmlFor="isControlledSubstance" className="cursor-pointer font-medium text-xs sm:text-sm">
          Controlled Drug (Rx)
        </Label>
      </div>
      {isControlled ? (
        <div className="flex items-center gap-1.5 text-micro text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-sm">
          <ShieldAlert className="size-3 shrink-0" />
          <span>Prescription required</span>
        </div>
      ) : (
        <p className="text-micro text-muted-foreground">Standard OTC (No prescription needed)</p>
      )}
    </div>
  );
});

export const DOSAGE_FORM_PRESETS = ['Tablet', 'Capsule', 'Softgel', 'Dispersible', 'Sachet'] as const;

/**
 * Isolated dosage form field with quick-select chip presets to enforce standardization
 * and prevent typographical fragmentation (e.g. "tab", "TAB", "Capsule").
 */
export const DosageFormField = React.memo(function DosageFormField({
  control,
  register,
  setValue,
}: {
  control: any;
  register: any;
  setValue: any;
}) {
  const currentDosageForm = useWatch({ control, name: 'dosageForm' }) || '';

  return (
    <div className="space-y-1.5 col-span-1">
      <div className="flex items-center justify-between">
        <Label htmlFor="dosageForm" className="text-xs sm:text-sm">Dosage Form</Label>
        <span className="text-[11px] text-muted-foreground">Quick pick or type</span>
      </div>
      <Input
        id="dosageForm"
        placeholder="e.g. Tablet, Capsule, Softgel, Dispersible"
        autoComplete="off"
        spellCheck={false}
        {...register('dosageForm')}
      />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {DOSAGE_FORM_PRESETS.map((preset) => {
          const isSelected = currentDosageForm.toLowerCase() === preset.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setValue('dosageForm', preset, { shouldValidate: true, shouldDirty: true })}
              className={`px-2 py-0.5 text-micro font-medium rounded-md border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                  : 'bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>
    </div>
  );
});
