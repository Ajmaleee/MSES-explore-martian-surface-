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
  onToggleArm,
  onCycleCamera,
  onReset,
}) => {
  return (
    <>
      {/* Bottom-left Keyboard shortcut badge (desktop) */}
      <div className="hidden lg:flex pointer-events-none absolute bottom-5 left-5 z-10 flex-col gap-1 rounded-md border border-slate-800 bg-slate-950/80 p-2.5 font-mono text-[10px] text-slate-400 select-none shadow-lg">
        <div className="font-bold text-amber-400 mb-0.5">CONTROLS REFERENCE</div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">W</kbd>
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">S</kbd>
          <span>ACCELERATE / REVERSE</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">A</kbd>
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">D</kbd>
          <span>STEER FRONT AXLE</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">SPACE</kbd>
          <span>DYNAMIC BRAKES</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">E</kbd>
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">Q</kbd>
          <span>DEPLOY / STOW ARM</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">C</kbd>
          <span>CYCLE CAMERA</span>
          <kbd className="ml-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200">R</kbd>
          <span>RESET / RIGHT</span>
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5">DRAG MOUSE: ORBIT CAMERA | SCROLL: ZOOM</div>
      </div>

      {/* Touch / Mobile on-screen drive controls (touch devices) */}
      <div className="lg:hidden pointer-events-auto absolute bottom-24 right-4 z-20 flex flex-col items-center gap-2 select-none">
        <button
          onPointerDown={() => onSetInput('forward', true)}
          onPointerUp={() => onSetInput('forward', false)}
          onPointerLeave={() => onSetInput('forward', false)}
          className={`h-12 w-12 rounded-lg border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
            inputs.forward ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900/90 text-slate-200'
          }`}
        >
          ▲
        </button>
        <div className="flex gap-2">
          <button
            onPointerDown={() => onSetInput('left', true)}
            onPointerUp={() => onSetInput('left', false)}
            onPointerLeave={() => onSetInput('left', false)}
            className={`h-12 w-12 rounded-lg border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
              inputs.left ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900/90 text-slate-200'
            }`}
          >
            ◀
          </button>
          <button
            onPointerDown={() => onSetInput('backward', true)}
            onPointerUp={() => onSetInput('backward', false)}
            onPointerLeave={() => onSetInput('backward', false)}
            className={`h-12 w-12 rounded-lg border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
              inputs.backward ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900/90 text-slate-200'
            }`}
          >
            ▼
          </button>
          <button
            onPointerDown={() => onSetInput('right', true)}
            onPointerUp={() => onSetInput('right', false)}
            onPointerLeave={() => onSetInput('right', false)}
            className={`h-12 w-12 rounded-lg border font-mono font-bold text-sm shadow-xl transition flex items-center justify-center ${
              inputs.right ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 bg-slate-900/90 text-slate-200'
            }`}
          >
            ▶
          </button>
        </div>
      </div>
    </>
  );
};
