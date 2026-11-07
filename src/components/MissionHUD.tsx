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
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 font-mono text-xs select-none">
      {/* Top Bar: Left Mission Identity & Right Telemetry Vector HUD */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Top-Left: Liquid Glassmorphic Mission Identity Panel with 20% Fog */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/15 bg-gradient-to-b from-amber-500/[0.08] via-slate-900/60 to-slate-950/80 p-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_40px_rgba(0,0,0,0.45)] max-w-xs">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span className="font-bold tracking-widest text-amber-300 text-xs uppercase">
                ARES-IV • ROVER OPS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleMute}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-amber-300 transition"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-amber-400" />}
              </button>
              <button
                onClick={onTogglePause}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-amber-300 transition"
                title={isPaused ? 'Resume (ESC)' : 'Pause (ESC)'}
              >
                {isPaused ? <Play size={14} className="text-emerald-400" /> : <Pause size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-0.5 text-slate-300">
            <div>
              SOL: <span className="text-amber-300 font-bold">{telemetry.sol}</span>
            </div>
            <div>
              UTC: <span className="text-white font-medium">{formatMissionTime(telemetry.missionTimeSeconds)}</span>
            </div>
            <div>
              WIND: <span className="text-slate-200">{telemetry.windSpeedMs} m/s</span>
            </div>
            <div>
              TEMP: <span className="text-slate-200">{telemetry.surfaceTempC}°C</span>
            </div>
          </div>

          {telemetry.isOverturned && (
            <div className="mt-1 flex items-center justify-between rounded-xl border border-red-500/50 bg-red-950/70 px-2.5 py-1.5 text-red-200">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-red-400" />
                <span className="font-bold text-[10px] tracking-wider">ROLLOVER DETECTED</span>
              </div>
              <button
                onClick={onSelfRight}
                className="rounded-lg bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-500 shadow transition"
              >
                RECOVER (R)
              </button>
            </div>
          )}
        </div>

        {/* Top-Right: Liquid Glassmorphic Telemetry Vector Panel with 20% Fog */}
        <div className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl border border-white/15 bg-gradient-to-b from-amber-500/[0.08] via-slate-900/60 to-slate-950/80 p-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-6 border-b border-white/10 pb-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
              FLIGHT VECTORS
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">VEHICLE:</span>
              <span className={`text-[10px] font-bold tracking-wider ${telemetry.isOverturned ? 'text-red-400' : isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
                {telemetry.isOverturned ? 'OVERTURNED' : isPaused ? 'HOLD' : 'ONLINE'}
              </span>
            </div>
          </div>

          {/* Speed & Heading */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">SPEED</span>
                <span className="text-sm font-bold text-amber-300">{telemetry.speedKmh} <span className="text-[10px] font-normal text-slate-400">km/h</span></span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-black/40 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (Math.abs(telemetry.speedKmh) / 22) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">HEADING</span>
                <span className="text-sm font-bold text-amber-300">
                  {telemetry.headingDeg}° <span className="text-[10px] font-medium text-slate-300">{getCompassDirection(telemetry.headingDeg)}</span>
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 px-0.5">
                <span>N</span>
                <span>E</span>
                <span>S</span>
                <span>W</span>
              </div>
            </div>
          </div>

          {/* Pitch, Roll, Slope */}
          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-[11px]">
            <div>
              <div className="text-[10px] text-slate-400">PITCH</div>
              <div className={`font-bold ${Math.abs(telemetry.pitchDeg) > 25 ? 'text-amber-400' : 'text-slate-100'}`}>
                {telemetry.pitchDeg > 0 ? `+${telemetry.pitchDeg}` : telemetry.pitchDeg}°
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">ROLL</div>
              <div className={`font-bold ${Math.abs(telemetry.rollDeg) > 25 ? 'text-amber-400' : 'text-slate-100'}`}>
                {telemetry.rollDeg > 0 ? `+${telemetry.rollDeg}` : telemetry.rollDeg}°
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">SLOPE</div>
              <div className={`font-bold ${telemetry.slopeGradePct > 35 ? 'text-red-400' : 'text-slate-100'}`}>
                {telemetry.slopeGradePct}%
              </div>
            </div>
          </div>

          {/* Elevation, Battery, Wheels */}
          <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[11px] gap-4">
            <div>
              <div className="text-[10px] text-slate-400">ELEVATION</div>
              <div className="font-bold text-slate-100">{telemetry.elevationM} m</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">MMRTG / BATT</div>
              <div className="font-bold text-emerald-400">
                {telemetry.batteryPct}% <span className="text-[9px] text-slate-400 font-normal">NOMINAL</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 text-right">4WD SUSPENSION</div>
              <div className="flex gap-1.5 justify-end mt-1">
                {telemetry.suspensionCompression.map((comp, idx) => (
                  <div
                    key={idx}
                    className="h-3.5 w-1.5 rounded-full bg-black/40 overflow-hidden flex flex-col justify-end"
                    title={`Wheel ${['FL', 'FR', 'RL', 'RR'][idx]}: ${Math.round(comp * 100)}% load`}
                  >
                    <div
                      className={`w-full rounded-full ${comp > 0.85 ? 'bg-amber-400' : comp > 0.08 ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ height: `${Math.max(20, Math.min(100, comp * 100))}%` }}
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
