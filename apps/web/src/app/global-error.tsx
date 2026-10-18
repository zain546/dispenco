'use client';

import React, { useEffect } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import './globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Critical Global Error caught by root boundary:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
          <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertTriangle className="size-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Application Error
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed">
              A critical failure occurred at the root layout. You can reload the application session or try again.
            </p>
          </div>

          {error?.message && (
            <div className="bg-neutral-950 rounded-xl p-3 text-left border border-neutral-800 text-xs font-mono text-neutral-400 max-h-24 overflow-y-auto break-all">
              {error.message}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Retry Session</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/dashboard';
              }}
              className="flex-1 h-10 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              Reload Dispenco
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
