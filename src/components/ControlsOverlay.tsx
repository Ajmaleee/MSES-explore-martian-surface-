/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RoverInputState } from '../simulation/types';

interface ControlsOverlayProps {
  inputs: RoverInputState;
  onSetInput: (key: keyof RoverInputState, value: boolean) => void;
  onToggleArm: () => void;
  onCycleCamera: () => void;
  onReset: () => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  inputs,
  onSetInput,
}) => {
  return (
    <>
      {/* Bottom-left Liquid Glass Keyboard Reference with 20% Fog (desktop) */}
      <div className="hidden lg:flex pointer-events-none absolute bottom-6 left-6 z-10 flex-col gap-1.5 rounded-2xl border border-white/15 bg-gradient-to-b from-amber-500/[0.08] via-slate-900/60 to-slate-950/80 p-3 font-mono text-[10px] text-slate-300 select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_30px_rgba(0,0,0,0.4)]">
        <div className="font-bold text-amber-300 tracking-wider mb-0.5">CONTROLS REFERENCE</div>
        <div className="flex items-center gap-2">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">W</kbd>
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">S</kbd>
          <span>ACCELERATE / REVERSE</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">A</kbd>
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">D</kbd>
          <span>STEER FRONT AXLE</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">SPACE</kbd>
          <span>DYNAMIC BRAKES</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">E</kbd>
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">Q</kbd>
          <span>DEPLOY / STOW ARM</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">C</kbd>
          <span>CYCLE CAM</span>
          <kbd className="ml-1 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white font-bold">R</kbd>
          <span>RECOVER / RIGHT</span>
        </div>
      </div>

      {/* Touch / Mobile on-screen drive controls (liquid glass styling) */}
      <div className="lg:hidden pointer-events-auto absolute bottom-24 right-4 z-20 flex flex-col items-center gap-2 select-none">
        <button
          onPointerDown={() => onSetInput('forward', true)}
          onPointerUp={() => onSetInput('forward', false)}
          onPointerLeave={() => onSetInput('forward', false)}
          className={`h-13 w-13 rounded-2xl border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
            inputs.forward
              ? 'border-amber-400 bg-amber-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'border-white/15 bg-slate-900/70 text-white'
          }`}
        >
          ▲
        </button>
        <div className="flex gap-2">
          <button
            onPointerDown={() => onSetInput('left', true)}
            onPointerUp={() => onSetInput('left', false)}
            onPointerLeave={() => onSetInput('left', false)}
            className={`h-13 w-13 rounded-2xl border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
              inputs.left
                ? 'border-amber-400 bg-amber-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'border-white/15 bg-slate-900/70 text-white'
            }`}
          >
            ◀
          </button>
          <button
            onPointerDown={() => onSetInput('backward', true)}
            onPointerUp={() => onSetInput('backward', false)}
            onPointerLeave={() => onSetInput('backward', false)}
            className={`h-13 w-13 rounded-2xl border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
              inputs.backward
                ? 'border-amber-400 bg-amber-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'border-white/15 bg-slate-900/70 text-white'
            }`}
          >
            ▼
          </button>
          <button
            onPointerDown={() => onSetInput('right', true)}
            onPointerUp={() => onSetInput('right', false)}
            onPointerLeave={() => onSetInput('right', false)}
            className={`h-13 w-13 rounded-2xl border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
              inputs.right
                ? 'border-amber-400 bg-amber-500 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'border-white/15 bg-slate-900/70 text-white'
            }`}
          >
            ▶
          </button>
        </div>
      </div>
    </>
  );
};
