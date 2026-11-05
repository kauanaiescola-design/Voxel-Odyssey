/**
 * KavCraft - Pause Menu & Death Screen
 */

import React from 'react';
import { Play, RotateCcw, Volume2, UserCheck, Sliders, LogOut, Home, HelpCircle } from 'lucide-react';
import { WorldSettings, PlayerStats } from '../types';
import { PixelButton } from './PixelButton';
import { sound } from '../game/audio';

interface MenuModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onReturnToMainMenu: () => void;
  onOpenCustomization: () => void;
  onOpenOptions: () => void;
  settings: WorldSettings;
  onUpdateSettings: (newSettings: WorldSettings) => void;
  stats: PlayerStats;
  onRespawn: () => void;
  isMobile?: boolean;
  onToggleMobile?: (val: boolean) => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onReturnToMainMenu,
  onOpenCustomization,
  onOpenOptions,
  settings,
  onUpdateSettings,
  stats,
  onRespawn,
  isMobile = false,
  onToggleMobile,
}) => {
  if (!isOpen && !stats.isDead) return null;

  // Death Screen
  if (stats.isDead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/85 backdrop-blur-md p-4 animate-in fade-in">
        <div className="bg-slate-900 border-4 border-red-700 p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-pixel text-3xl sm:text-4xl font-extrabold text-red-500 uppercase tracking-wider drop-shadow-[2px_2px_0px_#000]">
              VOCÊ MORREU!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-pixel">
              Pontuação conquistada: <span className="font-bold text-amber-400">{stats.score}</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <PixelButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={onRespawn}
            >
              <RotateCcw className="w-5 h-5" />
              Renascer
            </PixelButton>

            <PixelButton
              variant="secondary"
              size="md"
              fullWidth
              onClick={onReturnToMainMenu}
            >
              <Home className="w-4 h-4" />
              Menu Principal
            </PixelButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div
        id="pause-menu-card"
        className="bg-slate-900 border-4 border-slate-700 p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-5 text-slate-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Title */}
        <div className="flex flex-col items-center text-center gap-1 border-b-2 border-slate-800 pb-3">
          <h1 className="font-pixel text-2xl font-bold tracking-widest text-amber-400 drop-shadow-[2px_2px_0px_#000]">
            JOGO PAUSADO
          </h1>
          <p className="font-pixel text-xs text-slate-400">
            KavCraft - Edição Voxel
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <PixelButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={onResume}
            className="py-3.5"
          >
            <Play className="w-5 h-5 fill-current" />
            Retomar Partida
          </PixelButton>

          <PixelButton
            variant="secondary"
            size="md"
            fullWidth
            onClick={onOpenCustomization}
          >
            <UserCheck className="w-4 h-4 text-yellow-400" />
            Personalização de Skin
          </PixelButton>

          <PixelButton
            variant="secondary"
            size="md"
            fullWidth
            onClick={onOpenOptions}
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            Opções do Jogo
          </PixelButton>

          <PixelButton
            variant="danger"
            size="md"
            fullWidth
            onClick={onReturnToMainMenu}
          >
            <Home className="w-4 h-4 text-red-200" />
            Voltar ao Menu Principal
          </PixelButton>
        </div>

        {/* Quick Info & Controls */}
        <div className="bg-slate-950/70 border border-slate-800 p-3 flex flex-col gap-2 text-xs font-pixel text-slate-400">
          <div className="flex justify-between items-center text-slate-300">
            <span>Semente do Mundo:</span>
            <span className="font-mono text-amber-400">{settings.seed}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Modo:</span>
            <span className="uppercase text-emerald-400">{settings.gameMode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

