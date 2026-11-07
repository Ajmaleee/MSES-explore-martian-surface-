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
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 font-mono text-xs text-slate-200">
      <div className="w-full max-w-lg rounded-xl border border-amber-500/40 bg-slate-900 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-400" size={18} />
            <span className="font-bold text-amber-400 tracking-wide text-sm">
              SAMPLE ANALYSIS REPORT • APXS / CHEMCAM
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SAMPLE DESIGNATION</div>
            <div className="text-base font-bold text-white mt-0.5">{sample.name}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-amber-300 font-bold text-[10px]">
                {sample.type}
              </span>
              {sample.scientificallyValuable && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <Award size={12} /> HIGH SCIENTIFIC VALUE
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">
            {sample.description}
          </div>

          {/* Elemental Composition Bar Gauges */}
          <div className="space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SPECTRAL ELEMENTAL ASSAY</div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">IRON OXIDE (Fe₂O₃ / FeO)</span>
                <span className="font-bold text-amber-400">{sample.ironOxidePct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                  style={{ width: `${sample.ironOxidePct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">SILICATE MATRIX (SiO₂)</span>
                <span className="font-bold text-sky-400">{sample.silicaPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full"
                  style={{ width: `${sample.silicaPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">STRUCTURALLY BOUND H₂O / HYDROXYL</span>
                <span className="font-bold text-emerald-400">{sample.waterBoundPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                  style={{ width: `${sample.waterBoundPct * 8}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500 transition text-xs"
          >
            TRANSMIT TELEMETRY TO EARTH
          </button>
        </div>
      </div>
    </div>
  );
};
