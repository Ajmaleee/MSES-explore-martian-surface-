/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CameraViewMode, RockSampleData, RoverTelemetry, SimulationConfig } from '../simulation/types';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Camera,
  Wind,
  Layers,
  Crosshair,
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

type TabType = 'science' | 'telemetry' | 'optics' | 'physics' | 'lander';

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
      {/* Liquid Glass Collapse / Expand Toggle Button with 20% Fog */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-t-2xl border border-b-0 border-white/15 bg-gradient-to-b from-amber-500/[0.12] to-slate-900/80 px-4 py-1.5 text-[11px] text-amber-300 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.3)] hover:text-white transition"
      >
        {isOpen ? (
          <>
            <ChevronDown size={14} />
            <span className="tracking-widest">COLLAPSE DOCK</span>
          </>
        ) : (
          <>
            <ChevronUp size={14} />
            <span className="tracking-widest">EXPAND MISSION DOCK</span>
          </>
        )}
      </button>

      {/* Main Liquid Glass Container with 20% Fog Layer */}
      {isOpen && (
        <div className="w-full rounded-2xl rounded-t-none border border-white/15 bg-gradient-to-b from-amber-500/[0.08] via-slate-900/75 to-slate-950/90 p-4 sm:p-5 text-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_60px_rgba(0,0,0,0.55)]">
          {/* Liquid Glass Navigation Tabs */}
          <div className="flex border-b border-white/10 pb-2.5 mb-3.5 gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('science')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition ${
                activeTab === 'science'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crosshair size={13} />
              <span>ROBOTIC ARM & SCIENCE</span>
              {nearbySample && (
                <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-950">
                  TARGET
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition ${
                activeTab === 'telemetry'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity size={13} />
              <span>SUSPENSION & MASS</span>
            </button>

            <button
              onClick={() => setActiveTab('optics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition ${
                activeTab === 'optics'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Camera size={13} />
              <span>OPTICS</span>
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition ${
                activeTab === 'physics'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wind size={13} />
              <span>ENVIRONMENT</span>
            </button>

            <button
              onClick={() => setActiveTab('lander')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition ${
                activeTab === 'lander'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={13} />
              <span>LANDER</span>
            </button>
          </div>

          {/* TAB 1: Robotic Arm & Science */}
          {activeTab === 'science' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-between border border-white/10 rounded-xl p-3.5 bg-black/30 shadow-inner">
                <div>
                  <div className="text-[11px] font-bold text-amber-300 mb-1 flex items-center justify-between">
                    <span>4-DOF INSTRUMENT DEPLOYMENT ARM</span>
                    <span className="text-[10px] text-slate-300">
                      STATUS: <strong className="text-white uppercase">{telemetry.armStatus}</strong>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mb-3 leading-relaxed">
                    Articulated arm with Alpha Particle X-Ray Spectrometer (APXS) and Percussive Core Drill for regolith mineral assay.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {telemetry.armStatus === 'stowed' ? (
                    <button
                      onClick={onDeployArm}
                      className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-3 py-2 font-bold text-slate-950 hover:brightness-110 shadow-md transition text-[11px]"
                    >
                      DEPLOY ROBOTIC ARM (E)
                    </button>
                  ) : (
                    <button
                      onClick={onStowArm}
                      className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-bold text-slate-100 hover:bg-white/20 transition text-[11px]"
                    >
                      STOW ROBOTIC ARM (Q)
                    </button>
                  )}

                  <button
                    onClick={onTriggerDrill}
                    disabled={telemetry.isDrilling}
                    className={`flex-1 rounded-xl px-3 py-2 font-bold transition text-[11px] shadow-md ${
                      telemetry.isDrilling
                        ? 'bg-amber-400 text-slate-950 font-extrabold'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {telemetry.isDrilling ? 'DRILL ACTIVE...' : 'ENGAGE CORE DRILL'}
                  </button>
                </div>
              </div>

              {/* Proximity Geological Scanner */}
              <div className="border border-white/10 rounded-xl p-3.5 bg-black/30 shadow-inner flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-300 mb-1 flex items-center justify-between">
                    <span>SPECTROMETER PROXIMITY SCAN</span>
                    <span className="text-[10px] text-slate-300">AUTONOMOUS</span>
                  </div>

                  {nearbySample ? (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-2.5 text-[11px]">
                      <div className="font-bold text-amber-200">{nearbySample.name}</div>
                      <div className="text-slate-300 text-[10px] mt-0.5">{nearbySample.description}</div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-300">
                        <span>CLASSIFICATION: <strong className="text-white">{nearbySample.type}</strong></span>
                        <span>DISTANCE: <strong className="text-amber-300">{nearbySample.distance} m</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] text-slate-400 text-center py-4">
                      Drive near rock outcrops or weathered boulders (&lt; 3.5m) to engage APXS spectroscopy analysis.
                    </div>
                  )}
                </div>

                {nearbySample && (
                  <button
                    onClick={onTriggerDrill}
                    className="mt-2.5 w-full rounded-xl bg-amber-500 py-2 font-bold text-slate-950 hover:bg-amber-400 shadow-md transition text-[11px]"
                  >
                    COLLECT SAMPLE & TRANSMIT ASSAY
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Suspension & Mass */}
          {activeTab === 'telemetry' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-white/10 rounded-xl p-3 bg-black/30 shadow-inner">
                <div className="text-[10px] font-bold text-amber-300 mb-2 uppercase">CHASSIS MASS & DRIVETRAIN</div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROVER MASS:</span>
                    <span className="font-bold text-white">820 kg (Martian Weight 3,042 N)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISTANCE LOGGED:</span>
                    <span className="font-bold text-white">{telemetry.odometerMeters} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MOTOR SPEED:</span>
                    <span className="font-bold text-white">{telemetry.motorRpm} RPM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BRAKES:</span>
                    <span className={telemetry.isBraking ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                      {telemetry.isBraking ? 'DYNAMIC BRAKE' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Wheels Suspension Travel */}
              <div className="border border-white/10 rounded-xl p-3 bg-black/30 shadow-inner">
                <div className="text-[10px] font-bold text-amber-300 mb-1.5 uppercase">INDEPENDENT SUSPENSION TRAVEL</div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {['FRONT LEFT', 'FRONT RIGHT', 'REAR LEFT', 'REAR RIGHT'].map((name, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="h-16 w-full bg-black/40 rounded-xl border border-white/10 flex flex-col justify-end p-0.5">
                        <div
                          className="w-full bg-amber-400 rounded-lg transition-all duration-75 shadow"
                          style={{ height: `${Math.round(telemetry.suspensionCompression[i] * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold mt-1">{['FL', 'FR', 'RL', 'RR'][i]}</span>
                      <span className="text-[8px] text-slate-400">
                        {Math.round(telemetry.suspensionCompression[i] * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery */}
              <div className="border border-white/10 rounded-xl p-3 bg-black/30 shadow-inner flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-amber-300 mb-1 uppercase">GYROSCOPE & STABILITY</div>
                  <p className="text-[10px] text-slate-300 mb-2 leading-relaxed">
                    Heavy wide stance stabilizes the chassis on loose regolith dunes.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onSelfRight}
                    className="w-full rounded-xl bg-white/10 py-1.5 text-[11px] font-bold text-white hover:bg-white/20 transition"
                  >
                    SELF-RIGHT CHASSIS (R)
                  </button>
                  <button
                    onClick={onResetPosition}
                    className="w-full rounded-xl border border-white/10 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 transition"
                  >
                    RESET POSITION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Optics */}
          {activeTab === 'optics' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'third_person', name: 'ORBIT CHASE', desc: 'Damped third-person follow' },
                { id: 'mast_cam', name: 'MASTCAM 1ST-PERSON', desc: 'Remote sensing mast turret' },
                { id: 'arm_cam', name: 'ARM DRILL CAM', desc: 'Macro toolhead contact lens' },
                { id: 'free_orbit', name: 'SURVEY DRONE', desc: 'Panoramic orbital perspective' },
              ].map(cam => (
                <button
                  key={cam.id}
                  onClick={() => onChangeCamera(cam.id as CameraViewMode)}
                  className={`flex flex-col items-start p-3 rounded-xl border transition ${
                    config.cameraMode === cam.id
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                      : 'border-white/10 bg-black/25 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-[11px]">{cam.name}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">{cam.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* TAB 4: Environment & Physics */}
          {activeTab === 'physics' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-white/10 rounded-xl p-3 bg-black/30 shadow-inner">
                <div className="text-[10px] font-bold text-amber-300 mb-1 uppercase">PLANETARY GRAVITY</div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onUpdateConfig({ gravity: -3.71 })}
                    className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition ${
                      Math.abs(config.gravity - (-3.71)) < 0.1
                        ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                        : 'bg-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    MARS (3.71 m/s²)
                  </button>
                  <button
                    onClick={() => onUpdateConfig({ gravity: -9.81 })}
                    className={`flex-1 py-2 rounded-xl font-bold text-[10px] transition ${
                      Math.abs(config.gravity - (-9.81)) < 0.1
                        ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                        : 'bg-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    EARTH (9.81 m/s²)
                  </button>
                </div>
              </div>

              <div className="border border-white/10 rounded-xl p-3 bg-black/30 shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-bold text-amber-300 mb-1 uppercase">
                  <span>WIND SPEED</span>
                  <span className="text-white">{config.windSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={config.windSpeed}
                  onChange={e => onUpdateConfig({ windSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 mt-2"
                />
              </div>

              <div className="border border-white/10 rounded-xl p-3 bg-black/30 shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-bold text-amber-300 mb-1 uppercase">
                  <span>DRIVE MOTOR TORQUE</span>
                  <span className="text-white">{Math.round(config.drivePower * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.drivePower}
                  onChange={e => onUpdateConfig({ drivePower: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 mt-2"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Lander Module */}
          {activeTab === 'lander' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-white/10 rounded-xl p-3.5 bg-black/30 shadow-inner">
                <div className="text-[11px] font-bold text-amber-300 mb-1 uppercase">DESCENT STAGE PLATFORM</div>
                <p className="text-[10px] text-slate-300 mb-3 leading-relaxed">
                  Hexagonal descent lander with crushable honeycomb shock struts, descent thrusters, clamshell protective petals, and traction deployment ramps.
                </p>
                <button
                  onClick={onDeployLander}
                  className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400 shadow-md transition text-[11px]"
                >
                  DEPLOY LANDER PETALS & RAMPS
                </button>
              </div>

              <div className="border border-white/10 rounded-xl p-3.5 bg-black/30 shadow-inner flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-300 mb-1 uppercase">RETURN TO LANDING DECK</div>
                  <p className="text-[10px] text-slate-300 mb-2 leading-relaxed">
                    Teleport rover back to the landing base deck to test the deployment and driving egress ramp again.
                  </p>
                </div>
                <button
                  onClick={onResetPosition}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-bold text-slate-100 hover:bg-white/20 transition text-[11px]"
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
