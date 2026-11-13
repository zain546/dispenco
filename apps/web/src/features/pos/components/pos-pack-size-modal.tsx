import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Pill, AlertTriangle, Minus, Plus, CheckCircle2 } from 'lucide-react';

interface PosPackSizeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  packSize: string;
  onPackSizeChange: (packSize: string) => void;
  onSave: (e: React.FormEvent) => void;
  canEdit: boolean;
}

export function PosPackSizeModal({
  isOpen,
  onOpenChange,
  productName,
  packSize,
  onPackSizeChange,
  onSave,
  canEdit,
}: PosPackSizeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-2xl p-4 sm:p-5 border border-border/80 shadow-2xl bg-card">
        <DialogHeader className="space-y-2 text-left pb-1">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Package className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground leading-tight">
                Configure Medicine Pack Size
              </DialogTitle>
              <DialogDescription className="text-micro sm:text-xs text-muted-foreground mt-0.5">
                Set single units or tablets per retail box
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Product Identification Card */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/70 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Pill className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Selected Medicine
            </span>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              {productName}
            </p>
          </div>
        </div>

        {/* Authorization Guard Notice */}
        {!canEdit && (
          <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-micro font-medium">
              Manager approval required to change pack size.
            </span>
          </div>
        )}

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="pos-pack-size-input" className="font-semibold text-foreground">
                Units / Tablets per Box:
              </Label>
              <span className="font-mono text-micro text-primary font-semibold">
                1 Box = {packSize || 0} Units
              </span>
            </div>

            {/* Touch Stepper & Input: Clean Icon-Only +/- Buttons */}
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="size-11 rounded-xl border-border/80 hover:bg-muted active:scale-95 shrink-0 flex items-center justify-center p-0 cursor-pointer"
                onClick={() => {
                  const current = parseInt(packSize, 10) || 10;
                  const next = Math.max(1, current - (current > 20 ? 10 : 1));
                  onPackSizeChange(String(next));
                }}
                title="Decrease pack size"
              >
                <Minus className="size-5 text-foreground" />
              </Button>

              <div className="relative flex-1">
                <Input
                  id="pos-pack-size-input"
                  type="number"
                  min="1"
                  step="1"
                  autoFocus
                  value={packSize}
                  onChange={(e) => onPackSizeChange(e.target.value)}
                  placeholder="e.g. 100"
                  className="h-11 text-center text-xl font-extrabold tracking-tight rounded-xl bg-background border-border/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="size-11 rounded-xl border-border/80 hover:bg-muted active:scale-95 shrink-0 flex items-center justify-center p-0 cursor-pointer"
                onClick={() => {
                  const current = parseInt(packSize, 10) || 0;
                  const next = current + (current >= 20 ? 10 : 1);
                  onPackSizeChange(String(next));
                }}
                title="Increase pack size"
              >
                <Plus className="size-5 text-foreground" />
              </Button>
            </div>

            {/* Quick Pharmacy Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-medium text-muted-foreground block">
                Quick Standard Presets:
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {[10, 20, 30, 50, 100, 120].map((preset) => {
                  const isSelected = parseInt(packSize, 10) === preset;
                  return (
                    <Button
                      key={preset}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 px-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                          : 'bg-muted/40 hover:bg-muted text-foreground border-border/60'
                      }`}
                      onClick={() => onPackSizeChange(String(preset))}
                    >
                      {preset}
                    </Button>
                  );
                })}
              </div>
            </div>

            <p className="text-micro text-muted-foreground leading-relaxed pt-1">
              Enables loose-strip and single tablet POS dispensing with automatic FEFO fractional box deductions.
            </p>
          </div>

          {/* Action Buttons: Clean, well-spaced, never overlapping */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5 rounded-xl font-semibold text-xs border-border/80 hover:bg-muted active:scale-98 shrink-0 cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canEdit}
              className={`flex-1 h-11 px-4 rounded-xl font-bold text-xs sm:text-sm gap-2 shadow-xs active:scale-98 cursor-pointer ${
                !canEdit
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                  : 'bg-primary hover:bg-primary/95 text-primary-foreground'
              }`}
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="whitespace-nowrap">Save Pack Size</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

