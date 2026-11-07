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
    <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-md w-[90vw] font-mono text-xs select-none">
      <div className="w-full rounded-xl border border-amber-500/40 bg-slate-950/95 p-4 text-center text-slate-200 shadow-2xl">
        <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm mb-1.5">
          <Rocket size={18} />
          <span>MARS SURFACE TOUCHDOWN CONFIRMED</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
          The exploration rover is stowed inside the landing platform aeroshell. Initiate deployment to open the protective clamshell petals, lower the egress ramps, and drive onto the Martian surface.
        </p>

        <button
          onClick={onDeploy}
          disabled={isDeploying}
          className={`flex items-center justify-center gap-2 w-full rounded-lg py-2.5 px-4 font-bold tracking-wider transition ${
            isDeploying
              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 cursor-wait'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
          }`}
        >
          {isDeploying ? (
            <span>UNLATCHING AEROSHELL & EXTENDING RAMPS...</span>
          ) : (
            <>
              <Play size={15} />
              <span>COMMENCE SURFACE DEPLOYMENT</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
