/**
 * Voxel Realms - Mobile Virtual Controls
 * Minecraft-inspired responsive touch interface optimized for two-thumb gameplay.
 * Features customizable button size, opacity, virtual joystick, attack, place, jump, crouch, sprint, and inventory.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Pickaxe, ArrowUp, ChevronsDown, Package, Settings, Sliders, Zap, Shield, Sparkles, X } from 'lucide-react';
import * as THREE from 'three';

export interface MobileSettings {
  buttonScale: number; // 0.8, 1.0, 1.2
  opacity: number; // 0.35, 0.55, 0.75
  sensitivity: number; // 0.003, 0.005, 0.008
  layout: 'right-handed' | 'left-handed'; // joystick left vs right
}

const DEFAULT_SETTINGS: MobileSettings = {
  buttonScale: 1.0,
  opacity: 0.5,
  sensitivity: 0.005,
  layout: 'right-handed',
};

const STORAGE_KEY = 'voxel_realms_mobile_controls_v1';

interface MobileControlsProps {
  onMoveChange: (input: THREE.Vector2) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onCrouchToggle?: (crouching: boolean) => void;
  onSprintToggle?: (sprinting: boolean) => void;
  onMineStart: () => void;
  onMineEnd: () => void;
  onPlaceClick: () => void;
  onOpenInventory: () => void;
  onLookDelta: (dx: number, dy: number, sensitivity: number) => void;
  isCrouching?: boolean;
  isSprinting?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveChange,
  onJumpStart,
  onJumpEnd,
  onCrouchToggle,
  onSprintToggle,
  onMineStart,
  onMineEnd,
  onPlaceClick,
  onOpenInventory,
  onLookDelta,
  isCrouching = false,
  isSprinting = false,
}) => {
  // Saved touch settings
  const [settings, setSettings] = useState<MobileSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Save settings when changed
  const updateSettings = (partial: Partial<MobileSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickTouchId = useRef<number | null>(null);

  // Camera look tracking
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number } | null>(null);

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    setIsJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setIsJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveChange(new THREE.Vector2(0, 0));
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    let nx = dx;
    let ny = dy;
    if (dist > maxRadius) {
      nx = (dx / dist) * maxRadius;
      ny = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: nx, y: ny });

    // Normalize input vector (-1 to 1)
    const normX = nx / maxRadius;
    const normY = -(ny / maxRadius); // forward is positive Y in game engine
    onMoveChange(new THREE.Vector2(normX, normY));
  };

  // Look touch handlers (screen pan)
  const handleScreenTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Check if this touch is on the look zone (not on buttons/joystick)
      if (lookTouchId.current === null && touch.identifier !== joystickTouchId.current) {
        lookTouchId.current = touch.identifier;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleScreenTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current && lastLookPos.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        onLookDelta(dx, dy, settings.sensitivity);
        break;
      }
    }
  };

  const handleScreenTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lastLookPos.current = null;
        break;
      }
    }
  };

  // Opacity styles
  const bgOpacityClass =
    settings.opacity === 0.35
      ? 'bg-slate-900/35 border-slate-700/40'
      : settings.opacity === 0.75
      ? 'bg-slate-900/80 border-slate-600/80'
      : 'bg-slate-900/55 border-slate-700/60';

  const isLeftHanded = settings.layout === 'left-handed';

  return (
    <div
      id="mobile-controls-root"
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden touch-none"
      onTouchStart={handleScreenTouchStart}
      onTouchMove={handleScreenTouchMove}
      onTouchEnd={handleScreenTouchEnd}
      onTouchCancel={handleScreenTouchEnd}
    >
      {/* Top action row: Mobile settings & Backpack button */}
      <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto z-40">
        {/* Quick Touch Settings Button */}
        <button
          id="btn-mobile-config"
          onClick={() => setIsConfigOpen(true)}
          className={`p-2.5 rounded-xl border backdrop-blur-sm text-slate-300 active:text-amber-400 active:scale-95 transition-all shadow-lg cursor-pointer ${bgOpacityClass}`}
          title="Ajustar Controles Touch"
        >
          <Sliders className="w-5 h-5" />
        </button>

        {/* Quick Inventory / Mochila Button */}
        <button
          id="btn-mobile-inventory"
          onClick={onOpenInventory}
          className={`px-3 py-2 rounded-xl border backdrop-blur-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-lg cursor-pointer text-amber-400 font-bold text-xs ${bgOpacityClass}`}
        >
          <Package className="w-4 h-4 text-amber-400" />
          <span>Mochila</span>
        </button>
      </div>

      {/* Main bottom controls container */}
      <div
        className={`absolute inset-x-0 bottom-0 px-4 pb-20 sm:pb-24 flex items-end justify-between pointer-events-none ${
          isLeftHanded ? 'flex-row-reverse' : 'flex-row'
        }`}
        style={{
          transform: `scale(${settings.buttonScale})`,
          transformOrigin: isLeftHanded ? 'bottom right' : 'bottom left',
        }}
      >
        {/* ======================================================== */}
        {/* JOYSTICK CONTROLLER (Movement Thumb)                      */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          {/* Sprint Toggle Pill above joystick */}
          {onSprintToggle && (
            <button
              onClick={() => onSprintToggle(!isSprinting)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer ${
                isSprinting
                  ? 'bg-amber-500/80 text-slate-950 border-amber-300 font-extrabold'
                  : `${bgOpacityClass} text-slate-300`
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{isSprinting ? 'CORRENDO' : 'CORRER'}</span>
            </button>
          )}

          {/* Minecraft-styled Virtual Joystick Area */}
          <div
            ref={joystickBaseRef}
            id="mobile-joystick-pad"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onTouchCancel={handleJoystickEnd}
            className={`relative w-32 h-32 rounded-full backdrop-blur-sm border-2 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing ${bgOpacityClass}`}
          >
            {/* Minecraft D-Pad style directional chevron indicators */}
            <div className="absolute top-1 text-slate-400/60 font-black text-xs pointer-events-none">▲</div>
            <div className="absolute bottom-1 text-slate-400/60 font-black text-xs pointer-events-none">▼</div>
            <div className="absolute left-1.5 text-slate-400/60 font-black text-xs pointer-events-none">◀</div>
            <div className="absolute right-1.5 text-slate-400/60 font-black text-xs pointer-events-none">▶</div>

            {/* Center crosshair dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400/30 pointer-events-none" />

            {/* Moveable Thumb Knob */}
            <div
              id="mobile-joystick-knob"
              className="absolute w-14 h-14 rounded-full bg-amber-500/80 border-2 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] flex items-center justify-center pointer-events-none transition-transform"
              style={{
                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
                transition: isJoystickActive ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0.9, 0.3, 1)',
              }}
            >
              <div className="w-5 h-5 rounded-full bg-amber-300/60 border border-amber-100" />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ACTION BUTTONS CLUSTER (Action Thumb)                    */}
        {/* ======================================================== */}
        <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
          {/* Top row: Place/Interact & Mine/Attack */}
          <div className="flex items-center gap-3">
            {/* 1. INTERACT / PLACE BLOCK BUTTON */}
            <button
              id="btn-mobile-place"
              onClick={onPlaceClick}
              className={`w-16 h-16 rounded-2xl border-2 backdrop-blur-sm flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer ${
                settings.opacity === 0.35
                  ? 'bg-emerald-950/40 border-emerald-500/50 active:bg-emerald-600/80'
                  : 'bg-emerald-900/60 border-emerald-400/80 active:bg-emerald-600/90'
              } text-emerald-200`}
            >
              <div className="w-5 h-5 border-2 border-dashed border-emerald-300 rounded mb-0.5" />
              <span className="text-[10px] font-extrabold tracking-wider">USAR</span>
            </button>

            {/* 2. MINE / ATTACK BUTTON (Supports Tap & Hold) */}
            <button
              id="btn-mobile-mine"
              onTouchStart={(e) => {
                e.stopPropagation();
                onMineStart();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onMineEnd();
              }}
              onTouchCancel={(e) => {
                e.stopPropagation();
                onMineEnd();
              }}
              className={`w-18 h-18 rounded-2xl border-2 backdrop-blur-sm flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer ${
                settings.opacity === 0.35
                  ? 'bg-rose-950/40 border-rose-500/50 active:bg-rose-600/80'
                  : 'bg-rose-900/60 border-rose-400/80 active:bg-rose-600/90'
              } text-rose-100`}
            >
              <Pickaxe className="w-6 h-6 mb-0.5 text-rose-300" />
              <span className="text-[10px] font-extrabold tracking-wider">GOLPE</span>
            </button>
          </div>

          {/* Bottom row: Crouch/Sneak & Jump */}
          <div className="flex items-center gap-3">
            {/* 3. CROUCH / SNEAK TOGGLE */}
            {onCrouchToggle && (
              <button
                id="btn-mobile-crouch"
                onClick={() => onCrouchToggle(!isCrouching)}
                className={`w-14 h-14 rounded-2xl border-2 backdrop-blur-sm flex flex-col items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer ${
                  isCrouching
                    ? 'bg-indigo-600/85 border-indigo-300 text-white font-black'
                    : `${bgOpacityClass} text-slate-300 active:bg-slate-700`
                }`}
              >
                <ChevronsDown className="w-5 h-5" />
                <span className="text-[9px] font-bold">AGACHA</span>
              </button>
            )}

            {/* 4. JUMP / SWIM UP BUTTON */}
            <button
              id="btn-mobile-jump"
              onTouchStart={(e) => {
                e.stopPropagation();
                onJumpStart();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onJumpEnd();
              }}
              onTouchCancel={(e) => {
                e.stopPropagation();
                onJumpEnd();
              }}
              className={`w-16 h-16 rounded-2xl border-2 backdrop-blur-sm flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer ${
                settings.opacity === 0.35
                  ? 'bg-amber-950/40 border-amber-400/50 active:bg-amber-600/80'
                  : 'bg-amber-900/60 border-amber-300/80 active:bg-amber-500/90'
              } text-amber-100`}
            >
              <ArrowUp className="w-6 h-6 font-extrabold mb-0.5 text-amber-300" />
              <span className="text-[10px] font-extrabold tracking-wider">PULAR</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TOUCH CONTROLS CUSTOMIZATION MODAL                        */}
      {/* ======================================================== */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5 text-slate-100 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base text-slate-100">Controles de Celular</h2>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Button Size */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-300">Tamanho dos Botões</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Pequeno', scale: 0.8 },
                  { label: 'Normal', scale: 1.0 },
                  { label: 'Grande', scale: 1.2 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => updateSettings({ buttonScale: item.scale })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      settings.buttonScale === item.scale
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-300">Transparência dos Botões</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Leve (35%)', op: 0.35 },
                  { label: 'Média (55%)', op: 0.55 },
                  { label: 'Sólida (75%)', op: 0.75 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => updateSettings({ opacity: item.op })}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      settings.opacity === item.op
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Handedness Layout */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-300">Mão Dominante</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSettings({ layout: 'right-handed' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    settings.layout === 'right-handed'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Destro (Padrão)
                </button>
                <button
                  onClick={() => updateSettings({ layout: 'left-handed' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    settings.layout === 'left-handed'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Canhoto (Invertido)
                </button>
              </div>
            </div>

            {/* Sensitivity */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Sensibilidade da Câmera</span>
                <span className="text-amber-400">
                  {settings.sensitivity <= 0.003 ? 'Baixa' : settings.sensitivity <= 0.005 ? 'Média' : 'Alta'}
                </span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.009"
                step="0.001"
                value={settings.sensitivity}
                onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsConfigOpen(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl shadow-lg transition-all text-sm cursor-pointer mt-1"
            >
              Salvar e Voltar ao Jogo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
