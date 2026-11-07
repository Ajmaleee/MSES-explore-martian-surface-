/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { MarsSimulation } from './simulation/marsSimulation';
import { CameraViewMode, RockSampleData, RoverInputState, RoverTelemetry, SimulationConfig } from './simulation/types';
import { SimulationCanvas } from './components/SimulationCanvas';
import { MissionHUD } from './components/MissionHUD';
import { ControlDock } from './components/ControlDock';
import { ControlsOverlay } from './components/ControlsOverlay';
import { DeploymentSequence } from './components/DeploymentSequence';
import { ScienceModal } from './components/ScienceModal';

const initialTelemetry: RoverTelemetry = {
  speedKmh: 0,
  speedMs: 0,
  motorRpm: 0,
  headingDeg: 0,
  pitchDeg: 0,
  rollDeg: 0,
  elevationM: 0,
  slopeGradePct: 0,
  batteryPct: 98,
  isOverturned: false,
  inAir: false,
  wheelLoads: [0.5, 0.5, 0.5, 0.5],
  wheelSlip: [0, 0, 0, 0],
  suspensionCompression: [0.5, 0.5, 0.5, 0.5],
  sol: 42,
  missionTimeSeconds: 0,
  odometerMeters: 0,
  isBraking: false,
  isReversing: false,
  armStatus: 'stowed',
  isDrilling: false,
  lastSampleName: null,
  deployedFromLander: false,
  windSpeedMs: 8.5,
  surfaceTempC: -58,
  atmospherePressureKPa: 0.63,
};

export default function App() {
  const simRef = useRef<MarsSimulation | null>(null);

  const [telemetry, setTelemetry] = useState<RoverTelemetry>(initialTelemetry);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isLanderDeployed, setIsLanderDeployed] = useState(false);
  const [isLanderDeploying, setIsLanderDeploying] = useState(false);
  const [activeSample, setActiveSample] = useState<RockSampleData | null>(null);

  const [inputs, setInputs] = useState<RoverInputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    armDeploy: false,
    armStow: false,
    drill: false,
  });

  const [config, setConfig] = useState<SimulationConfig>({
    gravity: -9.81,
    windSpeed: 8.5,
    windDirectionAngle: 0.4,
    dustDensity: 1.0,
    timeOfDayHours: 14.5,
    shadowsEnabled: true,
    drivePower: 1.0,
    cameraMode: 'third_person',
  });

  const handleSimulationReady = useCallback((sim: MarsSimulation) => {
    simRef.current = sim;
  }, []);

  const handleTelemetryUpdate = useCallback((t: RoverTelemetry) => {
    setTelemetry(t);
  }, []);

  const handleSampleScanned = useCallback((sample: RockSampleData) => {
    setActiveSample(sample);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!simRef.current) return;
    const nextMuted = !isMuted;
    simRef.current.audio.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted]);

  const handleTogglePause = useCallback(() => {
    if (!simRef.current) return;
    simRef.current.togglePause();
    setIsPaused(simRef.current.isPaused);
  }, []);

  const handleDeployArm = useCallback(() => {
    simRef.current?.toggleArm();
  }, []);

  const handleStowArm = useCallback(() => {
    simRef.current?.stowArm();
  }, []);

  const handleTriggerDrill = useCallback(() => {
    simRef.current?.triggerSampleDrill();
  }, []);

  const handleChangeCamera = useCallback((mode: CameraViewMode) => {
    if (!simRef.current) return;
    simRef.current.cameraController.setMode(mode);
    setConfig(prev => ({ ...prev, cameraMode: mode }));
  }, []);

  const handleCycleCamera = useCallback(() => {
    if (!simRef.current) return;
    const nextMode = simRef.current.cycleCamera();
    setConfig(prev => ({ ...prev, cameraMode: nextMode }));
  }, []);

  const handleResetPosition = useCallback(() => {
    simRef.current?.resetRoverPosition();
  }, []);

  const handleSelfRight = useCallback(() => {
    simRef.current?.roverPhysics.selfRight();
  }, []);

  const handleDeployLander = useCallback(() => {
    if (!simRef.current) return;
    setIsLanderDeploying(true);
    simRef.current.deployLander();
    setTimeout(() => {
      setIsLanderDeploying(false);
      setIsLanderDeployed(true);
    }, 2400);
  }, []);

  const handleUpdateConfig = useCallback((newConfig: Partial<SimulationConfig>) => {
    setConfig(prev => {
      const merged = { ...prev, ...newConfig };
      if (simRef.current) {
        simRef.current.config = merged;
        if (newConfig.gravity !== undefined) {
          simRef.current.world.gravity.set(0, newConfig.gravity, 0);
        }
        if (newConfig.windSpeed !== undefined) {
          simRef.current.dust.windSpeed = newConfig.windSpeed;
        }
      }
      return merged;
    });
  }, []);

  const handleSetInput = useCallback((key: keyof RoverInputState, value: boolean) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    if (simRef.current) {
      simRef.current.inputs[key] = value;
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D Simulation Canvas */}
      <SimulationCanvas
        onSimulationReady={handleSimulationReady}
        onTelemetryUpdate={handleTelemetryUpdate}
        onSampleScanned={handleSampleScanned}
      />

      {/* Main HUD with Vector Telemetry */}
      <MissionHUD
        telemetry={telemetry}
        isMuted={isMuted}
        isPaused={isPaused}
        onToggleMute={handleToggleMute}
        onTogglePause={handleTogglePause}
        onSelfRight={handleSelfRight}
      />

      {/* Landing Module Deployment Banner */}
      <DeploymentSequence
        isDeployed={isLanderDeployed}
        isDeploying={isLanderDeploying}
        onDeploy={handleDeployLander}
      />

      {/* Collapsible Mission Control Dock */}
      <ControlDock
        telemetry={telemetry}
        config={config}
        nearbySample={simRef.current?.nearbySample || null}
        onDeployArm={handleDeployArm}
        onStowArm={handleStowArm}
        onTriggerDrill={handleTriggerDrill}
        onChangeCamera={handleChangeCamera}
        onResetPosition={handleResetPosition}
        onSelfRight={handleSelfRight}
        onDeployLander={handleDeployLander}
        onUpdateConfig={handleUpdateConfig}
      />

      {/* Controls Reference & Mobile Virtual Buttons */}
      <ControlsOverlay
        inputs={inputs}
        onSetInput={handleSetInput}
        onToggleArm={handleDeployArm}
        onCycleCamera={handleCycleCamera}
        onReset={handleResetPosition}
      />

      {/* Science Sample Inspection Report Modal */}
      <ScienceModal
        sample={activeSample}
        onClose={() => setActiveSample(null)}
      />
    </div>
  );
}
