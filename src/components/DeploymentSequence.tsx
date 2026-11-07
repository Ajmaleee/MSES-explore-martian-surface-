/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Rocket, Play } from 'lucide-react';

interface DeploymentSequenceProps {
  isDeployed: boolean;
  isDeploying: boolean;
  onDeploy: () => void;
}

export const DeploymentSequence: React.FC<DeploymentSequenceProps> = ({
  isDeployed,
  isDeploying,
  onDeploy,
}) => {
  if (isDeployed) return null;

  return (
    <div className="pointer-events-auto absolute top-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-md w-[90vw] font-mono text-xs select-none">
      <div className="w-full rounded-2xl border border-white/15 bg-gradient-to-b from-amber-500/[0.08] via-slate-900/70 to-slate-950/85 p-5 text-center text-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm mb-2">
          <Rocket size={18} />
          <span className="tracking-wider uppercase">SURFACE TOUCHDOWN CONFIRMED</span>
        </div>
        <p className="text-[11px] text-slate-300 mb-4 leading-relaxed">
          The heavy 820 kg rover is stowed inside the landing platform aeroshell. Initiate deployment to open the protective petals, lower the ramps, and begin surface exploration.
        </p>

        <button
          onClick={onDeploy}
          disabled={isDeploying}
          className={`flex items-center justify-center gap-2 w-full rounded-xl py-3 px-4 font-bold tracking-wider transition shadow-lg ${
            isDeploying
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 cursor-wait'
              : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold'
          }`}
        >
          {isDeploying ? (
            <span>UNLATCHING AEROSHELL & EXTENDING RAMPS...</span>
          ) : (
            <>
              <Play size={15} />
              <span>DEPLOY ROVER (OPEN RAMPS)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
