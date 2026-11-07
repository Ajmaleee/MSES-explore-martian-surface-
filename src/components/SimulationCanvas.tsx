/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { MarsSimulation } from '../simulation/marsSimulation';
import { RockSampleData, RoverTelemetry } from '../simulation/types';

interface SimulationCanvasProps {
  onSimulationReady: (sim: MarsSimulation) => void;
  onTelemetryUpdate: (telemetry: RoverTelemetry) => void;
  onSampleScanned: (sample: RockSampleData) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  onSimulationReady,
  onTelemetryUpdate,
  onSampleScanned,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<MarsSimulation | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate simulation once
    const sim = new MarsSimulation(containerRef.current);
    sim.onTelemetryUpdate = onTelemetryUpdate;
    sim.onSampleScanned = onSampleScanned;
    simRef.current = sim;
    onSimulationReady(sim);

    return () => {
      sim.dispose();
      simRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    />
  );
};
