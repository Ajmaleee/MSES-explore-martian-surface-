/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CameraViewMode, RockSampleData, RoverTelemetry, SimulationConfig } from '../simulation/types';
import {
  Activity,
  Compass,
  Cpu,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Camera,
  Wind,
  Layers,
  Crosshair,
  ShieldAlert,
} from 'lucide-react';

interface ControlDockProps {
  telemetry: RoverTelemetry;
  config: SimulationConfig;
  nearbySample: RockSampleData | null;
  onDeployArm: () => void;
  onStowArm: () => void;
  onTriggerDrill: () => void;
  onChangeCamera: (mode: CameraViewMode) => void;
  onResetPosition: () => void;
  onSelfRight: () => void;
  onDeployLander: () => void;
  onUpdateConfig: (newConfig: Partial<SimulationConfig>) => void;
}

type TabType = 'telemetry' | 'science' | 'optics' | 'physics' | 'lander';

export const ControlDock: React.FC<ControlDockProps> = ({
  telemetry,
  config,
  nearbySample,
  onDeployArm,
  onStowArm,
  onTriggerDrill,
  onChangeCamera,
  onResetPosition,
  onSelfRight,
  onDeployLander,
  onUpdateConfig,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('science');

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-[94vw] max-w-3xl font-mono text-xs select-none">
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-t-md border border-b-0 border-amber-500/30 bg-slate-950 px-3 py-1 text-[11px] text-amber-400 font-semibold shadow-lg hover:bg-slate-900 transition"
      >
        {isOpen ? (
          <>
            <ChevronDown size={14} />
            <span>HIDE MISSION CONTROL</span>
          </>
        ) : (
          <>
            <ChevronUp size={14} />
            <span>SHOW MISSION CONTROL</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      {isOpen && (
        <div className="w-full rounded-lg rounded-t-none border border-amber-500/30 bg-slate-950/95 p-3 sm:p-4 text-slate-200 shadow-2xl">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 pb-2 mb-3 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('science')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition ${
                activeTab === 'science'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Crosshair size={13} />
              <span>ROBOTIC ARM & SCIENCE</span>
              {nearbySample && (
                <span className="ml-1 rounded bg-amber-500 px-1 py-0.2 text-[9px] font-bold text-slate-950">
                  TARGET
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition ${
                activeTab === 'telemetry'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity size={13} />
              <span>SUSPENSION & DYNAMICS</span>
            </button>

            <button
              onClick={() => setActiveTab('optics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition ${
                activeTab === 'optics'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Camera size={13} />
              <span>OPTICS & CAMERAS</span>
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition ${
                activeTab === 'physics'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Wind size={13} />
              <span>PHYSICS & ENVIRONMENT</span>
            </button>

            <button
              onClick={() => setActiveTab('lander')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition ${
                activeTab === 'lander'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers size={13} />
              <span>LANDER MODULE</span>
            </button>
          </div>

          {/* TAB 1: Robotic Arm & Science */}
          {activeTab === 'science' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-between border border-slate-800 rounded p-3 bg-slate-900/60">
                <div>
                  <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                    <span>INSTRUMENT DEPLOYMENT ARM (4-DOF)</span>
                    <span className="text-[10px] text-slate-400">
                      STATUS: <strong className="text-slate-200 uppercase">{telemetry.armStatus}</strong>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">
                    Articulated arm equipped with Alpha Particle X-Ray Spectrometer (APXS), Microscopic Imager, and Core Percussive Drill.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {telemetry.armStatus === 'stowed' ? (
                    <button
                      onClick={onDeployArm}
                      className="flex-1 rounded bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500 transition text-[11px]"
                    >
                      DEPLOY ROBOTIC ARM (E)
                    </button>
                  ) : (
                    <button
                      onClick={onStowArm}
                      className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700 transition text-[11px]"
                    >
                      STOW ROBOTIC ARM (Q)
                    </button>
                  )}

                  <button
                    onClick={onTriggerDrill}
                    disabled={telemetry.isDrilling}
                    className={`flex-1 rounded px-3 py-1.5 font-bold transition text-[11px] ${
                      telemetry.isDrilling
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {telemetry.isDrilling ? 'DRILL PERCUSSING...' : 'TRIGGER SAMPLE DRILL'}
                  </button>
                </div>
              </div>

              {/* Proximity Geological Scanner */}
              <div className="border border-slate-800 rounded p-3 bg-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                    <span>GEOLOGICAL TARGET PROXIMITY</span>
                    <span className="text-[10px] text-slate-400">APXS / CHEMCAM</span>
                  </div>

                  {nearbySample ? (
                    <div className="rounded border border-amber-500/40 bg-amber-950/20 p-2 text-[11px]">
                      <div className="font-bold text-amber-300">{nearbySample.name}</div>
                      <div className="text-slate-300 text-[10px] mt-0.5">{nearbySample.description}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>CLASSIFICATION: <strong className="text-slate-200">{nearbySample.type}</strong></span>
                        <span>DISTANCE: <strong className="text-amber-400">{nearbySample.distance} m</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded border border-slate-800 bg-slate-950 p-2 text-[10px] text-slate-500 text-center py-3">
                      Drive near rock outcrops or boulders (&lt; 3.5m) to engage autonomous APXS mineral spectrometer.
                    </div>
                  )}
                </div>

                {nearbySample && (
                  <button
                    onClick={onTriggerDrill}
                    className="mt-2 w-full rounded bg-amber-600/90 py-1.5 font-bold text-white hover:bg-amber-500 transition text-[11px]"
                  >
                    ENGAGE CORE DRILL & SPECTROMETER SCAN
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Suspension & Dynamics */}
          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-800 rounded p-2.5 bg-slate-900/60">
                <div className="text-[10px] font-bold text-amber-400 mb-1">ODOMETER & DRIVETRAIN</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISTANCE TRAVELLED:</span>
                    <span className="font-bold text-slate-200">{telemetry.odometerMeters} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MOTOR SHAFT RPM:</span>
                    <span className="font-bold text-slate-200">{telemetry.motorRpm} RPM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BRAKE SYSTEM:</span>
                    <span className={telemetry.isBraking ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {telemetry.isBraking ? 'ENGAGED' : 'DISENGAGED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Wheels Suspension Travel */}
              <div className="border border-slate-800 rounded p-2.5 bg-slate-900/60">
                <div className="text-[10px] font-bold text-amber-400 mb-1">INDEPENDENT SUSPENSION TRAVEL</div>
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {['FRONT LEFT', 'FRONT RIGHT', 'REAR LEFT', 'REAR RIGHT'].map((name, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="h-14 w-full bg-slate-950 rounded border border-slate-800 flex flex-col justify-end p-0.5">
                        <div
                          className="w-full bg-amber-500 rounded-xs transition-all duration-75"
                          style={{ height: `${Math.round(telemetry.suspensionCompression[i] * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">{['FL', 'FR', 'RL', 'RR'][i]}</span>
                      <span className="text-[8px] text-slate-300 font-mono">
                        {Math.round(telemetry.suspensionCompression[i] * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery & Rollover controls */}
              <div className="border border-slate-800 rounded p-2.5 bg-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-amber-400 mb-1">RECOVERY & GYROSCOPE</div>
                  <div className="text-[10px] text-slate-400 mb-2">
                    Martian surface gravity (3.71 m/s²) permits authentic body tipping and rollover over excessive terrain crests.
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onSelfRight}
                    className="w-full rounded bg-slate-800 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                  >
                    SELF-RIGHT ROVER (R)
                  </button>
                  <button
                    onClick={onResetPosition}
                    className="w-full rounded border border-slate-700 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-slate-800 transition"
                  >
                    RESET POSITION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Optics & Cameras */}
          {activeTab === 'optics' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'third_person', name: 'ORBIT CHASE', desc: 'Third-person orbital follow' },
                { id: 'mast_cam', name: 'MASTCAM 1ST-PERSON', desc: 'Remote sensing mast optics' },
                { id: 'arm_cam', name: 'ARM DRILL CAM', desc: 'Macro contact lens' },
                { id: 'free_orbit', name: 'SURVEY DRONE', desc: 'Free aerial vantage' },
              ].map(cam => (
                <button
                  key={cam.id}
                  onClick={() => onChangeCamera(cam.id as CameraViewMode)}
                  className={`flex flex-col items-start p-2.5 rounded border text-left transition ${
                    config.cameraMode === cam.id
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-[11px]">{cam.name}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">{cam.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* TAB 4: Physics & Environment */}
          {activeTab === 'physics' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-slate-800 rounded p-2.5 bg-slate-900/60">
                <div className="text-[10px] font-bold text-amber-400 mb-1">SURFACE GRAVITY</div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onUpdateConfig({ gravity: -3.71 })}
                    className={`flex-1 py-1.5 rounded font-bold text-[10px] transition ${
                      Math.abs(config.gravity - (-3.71)) < 0.1
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    MARS (3.71 m/s²)
                  </button>
                  <button
                    onClick={() => onUpdateConfig({ gravity: -9.81 })}
                    className={`flex-1 py-1.5 rounded font-bold text-[10px] transition ${
                      Math.abs(config.gravity - (-9.81)) < 0.1
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    EARTH (9.81 m/s²)
                  </button>
                </div>
              </div>

              <div className="border border-slate-800 rounded p-2.5 bg-slate-900/60">
                <div className="flex justify-between items-center text-[10px] font-bold text-amber-400 mb-1">
                  <span>WIND SPEED</span>
                  <span className="text-slate-200">{config.windSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={config.windSpeed}
                  onChange={e => onUpdateConfig({ windSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 mt-2"
                />
              </div>

              <div className="border border-slate-800 rounded p-2.5 bg-slate-900/60">
                <div className="flex justify-between items-center text-[10px] font-bold text-amber-400 mb-1">
                  <span>DRIVE MOTOR POWER</span>
                  <span className="text-slate-200">{Math.round(config.drivePower * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={config.drivePower}
                  onChange={e => onUpdateConfig({ drivePower: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 mt-2"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Lander Module */}
          {activeTab === 'lander' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-800 rounded p-3 bg-slate-900/60">
                <div className="text-[11px] font-bold text-amber-400 mb-1">DESCENT LANDER PLATFORM</div>
                <p className="text-[10px] text-slate-400 mb-3">
                  Hexagonal descent stage with crushable honeycomb shock struts, descent thrusters, opening clamshell protective petals, and articulated deployment ramps.
                </p>
                <button
                  onClick={onDeployLander}
                  className="rounded bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500 transition text-[11px]"
                >
                  DEPLOY LANDER PETALS & RAMPS
                </button>
              </div>

              <div className="border border-slate-800 rounded p-3 bg-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-400 mb-1">RESET TO LANDING DECK</div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Teleport the rover back to the landing base deck to test the deployment and drive-out sequence again.
                  </p>
                </div>
                <button
                  onClick={onResetPosition}
                  className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700 transition text-[11px]"
                >
                  RETURN TO LANDER DECK
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
