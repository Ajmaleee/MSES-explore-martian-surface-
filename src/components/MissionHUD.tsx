/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RoverTelemetry } from '../simulation/types';
import { Volume2, VolumeX, Pause, Play, AlertTriangle } from 'lucide-react';

interface MissionHUDProps {
  telemetry: RoverTelemetry;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onSelfRight: () => void;
}

export const MissionHUD: React.FC<MissionHUDProps> = ({
  telemetry,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onSelfRight,
}) => {
  // Heading compass label
  const getCompassDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  const formatMissionTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 font-mono text-xs text-slate-300 select-none">
      {/* Top Bar: Left Mission Identity & Right Telemetry Vector HUD */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left: Mission identity and quick status */}
        <div className="pointer-events-auto flex flex-col gap-1.5 rounded-lg border border-amber-500/20 bg-slate-950/85 p-3 shadow-xl max-w-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span className="font-bold tracking-widest text-amber-400 text-xs">
                NASA/JPL • MER-SIM
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleMute}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-amber-400" />}
              </button>
              <button
                onClick={onTogglePause}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition"
                title={isPaused ? 'Resume (ESC)' : 'Pause (ESC)'}
              >
                {isPaused ? <Play size={14} className="text-emerald-400" /> : <Pause size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-0.5 text-slate-400">
            <div>
              SOL: <span className="text-amber-300 font-semibold">{telemetry.sol}</span>
            </div>
            <div>
              UTC: <span className="text-slate-200">{formatMissionTime(telemetry.missionTimeSeconds)}</span>
            </div>
            <div>
              WIND: <span className="text-slate-200">{telemetry.windSpeedMs} m/s</span>
            </div>
            <div>
              TEMP: <span className="text-slate-200">{telemetry.surfaceTempC}°C</span>
            </div>
          </div>

          {/* Overturned alert banner */}
          {telemetry.isOverturned && (
            <div className="mt-1 flex items-center justify-between rounded border border-red-500/50 bg-red-950/80 px-2 py-1 text-red-200 animate-pulse">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-red-400" />
                <span className="font-bold text-[10px] tracking-wider">CHASSIS OVERTURNED</span>
              </div>
              <button
                onClick={onSelfRight}
                className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-500 transition"
              >
                RECOVER (R)
              </button>
            </div>
          )}
        </div>

        {/* Top-Right: Flight Dynamics & Attitude HUD */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-slate-950/85 p-3 shadow-xl">
          <div className="flex items-center justify-between gap-6 border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400">
              DYNAMICS VECTOR
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">STATUS:</span>
              <span className={`text-[10px] font-bold ${telemetry.isOverturned ? 'text-red-400' : isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
                {telemetry.isOverturned ? 'ROLLOVER' : isPaused ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Speed & Heading row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">SPEED</span>
                <span className="text-sm font-bold text-amber-300">{telemetry.speedKmh} <span className="text-[10px] font-normal text-slate-400">km/h</span></span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-75"
                  style={{ width: `${Math.min(100, (Math.abs(telemetry.speedKmh) / 18) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">HEADING</span>
                <span className="text-sm font-bold text-amber-300">
                  {telemetry.headingDeg}° <span className="text-[10px] font-normal text-slate-400">{getCompassDirection(telemetry.headingDeg)}</span>
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 px-0.5">
                <span>N</span>
                <span>E</span>
                <span>S</span>
                <span>W</span>
              </div>
            </div>
          </div>

          {/* Attitude & Gyro (Pitch / Roll) */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-2 text-[11px]">
            <div>
              <div className="text-[10px] text-slate-400">PITCH</div>
              <div className={`font-semibold ${Math.abs(telemetry.pitchDeg) > 25 ? 'text-amber-400' : 'text-slate-200'}`}>
                {telemetry.pitchDeg > 0 ? `+${telemetry.pitchDeg}` : telemetry.pitchDeg}°
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">ROLL</div>
              <div className={`font-semibold ${Math.abs(telemetry.rollDeg) > 25 ? 'text-amber-400' : 'text-slate-200'}`}>
                {telemetry.rollDeg > 0 ? `+${telemetry.rollDeg}` : telemetry.rollDeg}°
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">SLOPE</div>
              <div className={`font-semibold ${telemetry.slopeGradePct > 35 ? 'text-red-400' : 'text-slate-200'}`}>
                {telemetry.slopeGradePct}%
              </div>
            </div>
          </div>

          {/* Elevation & Battery & Wheel Traction Matrix */}
          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px] gap-4">
            <div>
              <div className="text-[10px] text-slate-400">ELEVATION</div>
              <div className="font-semibold text-slate-200">{telemetry.elevationM} m</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">MMRTG / BATT</div>
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <span>{telemetry.batteryPct}%</span>
                <span className="text-[9px] text-slate-400">PWR NORM</span>
              </div>
            </div>

            {/* 4 Wheels Traction mini-matrix */}
            <div>
              <div className="text-[10px] text-slate-400 text-right">WHEELS (4WD)</div>
              <div className="flex gap-1 justify-end mt-1">
                {telemetry.suspensionCompression.map((comp, idx) => (
                  <div
                    key={idx}
                    className="h-3.5 w-1.5 rounded-xs bg-slate-800 overflow-hidden flex flex-col justify-end"
                    title={`Wheel ${['FL', 'FR', 'RL', 'RR'][idx]}: ${Math.round(comp * 100)}% load`}
                  >
                    <div
                      className={`w-full ${comp > 0.85 ? 'bg-amber-400' : comp > 0.1 ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ height: `${Math.max(15, Math.min(100, comp * 100))}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
