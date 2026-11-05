/**
 * Voxel Realms - In-Game HUD Component
 * Health, hunger, oxygen, hotbar, mining progress, crosshair, clock, and biome info.
 */

import React from 'react';
import { Heart, Drumstick, Droplets, Sun, Moon, Compass, Crosshair as CrosshairIcon } from 'lucide-react';
import { InventoryItem, PlayerStats } from '../types';
import { ItemIcon } from './ItemIcon';

interface HUDProps {
  stats: PlayerStats;
  inventory: (InventoryItem | null)[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  targetBlock: string | null;
  miningProgress: number;
  timeString: string;
  isNight: boolean;
  playerPos: { x: number; y: number; z: number; biome: string };
  onOpenInventory: () => void;
  onOpenPause: () => void;
  isMobile: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  inventory,
  selectedSlot,
  onSelectSlot,
  targetBlock,
  miningProgress,
  timeString,
  isNight,
  playerPos,
  onOpenInventory,
  onOpenPause,
  isMobile,
}) => {
  // Biome translation
  const biomeNames: Record<string, string> = {
    plains: 'Planícies Floridas',
    forest: 'Floresta Densa',
    mountains: 'Picos Rochosos',
    desert: 'Deserto Dourado',
    beach: 'Praia Tropical',
    ocean: 'Oceano Profundo',
    snow: 'Tundra Gelada',
  };

  const biomeName = biomeNames[playerPos.biome] || playerPos.biome;

  // Render 10 hearts (each heart = 2 health)
  const hearts = Array.from({ length: 10 }, (_, i) => {
    const value = stats.health - i * 2;
    if (value >= 2) return 'full';
    if (value >= 1) return 'half';
    return 'empty';
  });

  // Render 10 hunger drumsticks (each = 2 hunger)
  const drumsticks = Array.from({ length: 10 }, (_, i) => {
    const value = stats.hunger - i * 2;
    if (value >= 2) return 'full';
    if (value >= 1) return 'half';
    return 'empty';
  });

  // Submerged oxygen bubbles
  const showOxygen = stats.oxygen < stats.maxOxygen;
  const bubbles = Array.from({ length: 10 }, (_, i) => {
    return stats.oxygen >= (i + 1) * 2;
  });

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none">
      {/* Top Header: Compass, Time & Menu */}
      <div className="flex items-start justify-between">
        {/* Coordinates & Biome */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-slate-200 rounded-xl px-3 py-2 text-xs flex flex-col gap-1 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-100">{biomeName}</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            X: {playerPos.x} | Y: {playerPos.y} | Z: {playerPos.z}
          </div>
        </div>

        {/* Time of Day & Menu */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-slate-200 rounded-xl px-3 py-2 text-xs flex items-center gap-2 shadow-lg font-mono">
            {isNight ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-semibold">{timeString}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isNight ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/40' : 'bg-amber-950 text-amber-300 border border-amber-700/40'}`}>
              {isNight ? 'Noite' : 'Dia'}
            </span>
          </div>

          <button
            id="btn-pause-menu"
            onClick={onOpenPause}
            className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg transition-colors cursor-pointer"
          >
            Pausar
          </button>
        </div>
      </div>

      {/* Center Screen: Crosshair & Mining Progress */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Classic Minecraft Crosshair */}
        <div className="relative flex items-center justify-center">
          <div className="w-4 h-[2px] bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]" />
          <div className="absolute h-4 w-[2px] bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]" />
        </div>

        {/* Target Block Label */}
        {targetBlock && (
          <div className="mt-8 bg-slate-950/80 backdrop-blur-sm border border-slate-700/70 text-slate-200 text-xs px-2.5 py-1 rounded-lg font-medium shadow-md">
            {targetBlock}
          </div>
        )}

        {/* Mining Progress Bar */}
        {miningProgress > 0 && (
          <div className="mt-2 w-28 bg-slate-950/90 rounded-full h-2 border border-slate-600 overflow-hidden p-0.5 shadow-md">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-75"
              style={{ width: `${Math.min(100, miningProgress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Bottom Area: Health, Hunger, Hotbar */}
      <div className="flex flex-col items-center gap-2 pb-2">
        {/* Vitals (Health & Hunger) */}
        <div className="flex items-center justify-between w-full max-w-md px-2 text-xs">
          {/* Health Hearts */}
          <div className="flex items-center gap-0.5">
            {hearts.map((state, i) => (
              <div key={i} className="relative">
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    state === 'full'
                      ? 'text-red-500 fill-red-500'
                      : state === 'half'
                      ? 'text-red-400 fill-red-400/50'
                      : 'text-slate-600 fill-slate-800/40'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Submerged Oxygen Bubbles */}
          {showOxygen && (
            <div className="flex items-center gap-0.5">
              {bubbles.map((filled, i) => (
                <Droplets
                  key={i}
                  className={`w-3.5 h-3.5 ${filled ? 'text-cyan-400 fill-cyan-400' : 'text-slate-600 fill-slate-800'}`}
                />
              ))}
            </div>
          )}

          {/* Hunger Drumsticks */}
          <div className="flex items-center gap-0.5">
            {drumsticks.map((state, i) => (
              <div key={i} className="relative">
                <Drumstick
                  className={`w-4 h-4 ${
                    state === 'full'
                      ? 'text-amber-500 fill-amber-500'
                      : state === 'half'
                      ? 'text-amber-400 fill-amber-400/50'
                      : 'text-slate-600 fill-slate-800/40'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Hotbar Slots (9 slots) */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto">
          {Array.from({ length: 9 }, (_, i) => {
            const item = inventory[i];
            const isSelected = i === selectedSlot;

            return (
              <button
                key={i}
                id={`hotbar-slot-${i}`}
                onClick={() => onSelectSlot(i)}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] scale-105'
                    : 'bg-slate-900/80 border border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* Slot Number key hint */}
                <span className="absolute top-0.5 left-1 text-[9px] text-slate-400 font-mono">
                  {i + 1}
                </span>

                {/* Item Icon */}
                {item && (
                  <ItemIcon item={item} className="w-7 h-7" />
                )}

                {/* Stack Count */}
                {item && item.count > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[11px] font-bold text-white font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                    {item.count}
                  </span>
                )}

                {/* Durability Bar */}
                {item && item.durability && item.maxDurability && (
                  <div className="absolute bottom-0 left-1 right-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(item.durability / item.maxDurability) * 100}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}

          {/* Quick Inventory Toggle Button */}
          <button
            id="btn-hud-inventory"
            onClick={onOpenInventory}
            className="w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 flex flex-col items-center justify-center text-[10px] font-bold shadow cursor-pointer ml-1"
          >
            <span>INV</span>
            <span className="text-[8px] text-slate-400">(E)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
