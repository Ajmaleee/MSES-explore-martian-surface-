/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RockSampleData } from '../simulation/types';
import { X, CheckCircle, Award } from 'lucide-react';

interface ScienceModalProps {
  sample: RockSampleData | null;
  onClose: () => void;
}

export const ScienceModal: React.FC<ScienceModalProps> = ({ sample, onClose }) => {
  if (!sample) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-mono text-xs text-slate-100 select-none">
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-gradient-to-b from-amber-500/[0.12] via-slate-900/80 to-slate-950/95 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="text-emerald-400" size={18} />
            <span className="font-bold text-amber-300 tracking-wider text-sm uppercase">
              SPECTROMETER ASSAY • APXS / CHEMCAM
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SAMPLE DESIGNATION</div>
            <div className="text-base font-bold text-white mt-0.5">{sample.name}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 text-amber-300 font-bold text-[10px]">
                {sample.type}
              </span>
              {sample.scientificallyValuable && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <Award size={13} /> HIGH SCIENTIFIC RELEVANCE
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 text-[11px] leading-relaxed text-slate-200">
            {sample.description}
          </div>

          {/* Elemental Composition Bars */}
          <div className="space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SPECTRAL ELEMENTAL ASSAY</div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">IRON OXIDE (Fe₂O₃ / FeO)</span>
                <span className="font-bold text-amber-300">{sample.ironOxidePct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                  style={{ width: `${sample.ironOxidePct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">SILICATE MATRIX (SiO₂)</span>
                <span className="font-bold text-sky-400">{sample.silicaPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full"
                  style={{ width: `${sample.silicaPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">STRUCTURALLY BOUND H₂O / HYDROXYL</span>
                <span className="font-bold text-emerald-400">{sample.waterBoundPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                  style={{ width: `${sample.waterBoundPct * 8}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 font-bold text-slate-950 hover:brightness-110 shadow-lg transition text-xs"
          >
            TRANSMIT ASSAY TO EARTH
          </button>
        </div>
      </div>
    </div>
  );
};
