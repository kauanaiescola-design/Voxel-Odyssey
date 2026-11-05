/**
 * KavCraft - Options & Settings Screen (Opções)
 * Nostalgic settings modal for Audio, Graphics, FOV, Game Mode, and World Reset.
 */

import React from 'react';
import { Volume2, VolumeX, Eye, Compass, Smartphone, RotateCcw, ArrowLeft, Check, Sliders } from 'lucide-react';
import { PixelButton } from './PixelButton';
import { WorldSettings } from '../types';
import { sound } from '../game/audio';

interface OptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WorldSettings;
  onUpdateSettings: (newSettings: WorldSettings) => void;
  isMobile: boolean;
  onToggleMobile?: (val: boolean) => void;
  onResetWorld?: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isMobile,
  onToggleMobile,
  onResetWorld,
}) => {
  if (!isOpen) return null;

  const currentVol = Math.round(sound.getVolume() * 100);

  const handleVolumeChange = (newVal: number) => {
    const vol = newVal / 100;
    sound.setVolume(vol);
    onUpdateSettings({
      ...settings,
      soundEnabled: vol > 0,
    });
  };

  const handleRenderDistanceChange = (rd: number) => {
    sound.playClick();
    onUpdateSettings({
      ...settings,
      renderDistance: rd,
    });
  };

  const handleFovChange = (newFov: number) => {
    onUpdateSettings({
      ...settings,
      fov: newFov,
    });
  };

  const handleGameModeToggle = () => {
    sound.playClick();
    onUpdateSettings({
      ...settings,
      gameMode: settings.gameMode === 'survival' ? 'creative' : 'survival',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border-4 border-slate-700 rounded-none shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b-4 border-slate-950">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-yellow-400" />
            <h2 className="font-pixel text-lg sm:text-xl text-yellow-400 uppercase tracking-wider drop-shadow-[2px_2px_0px_#000]">
              Opções do Jogo
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white font-pixel text-xl px-2 py-1 hover:bg-slate-700/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Audio Volume Slider */}
          <div className="bg-slate-950/60 border-2 border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                {currentVol > 0 ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                Volume dos Efeitos Sonoros: {currentVol}%
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  handleVolumeChange(currentVol > 0 ? 0 : 50);
                }}
                className="text-[11px] font-pixel text-yellow-400 hover:underline"
              >
                {currentVol > 0 ? 'Mutar' : 'Ativar'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentVol}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Render Distance */}
          <div className="bg-slate-950/60 border-2 border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Distância de Renderização: {settings.renderDistance} Chunks
              </span>
              <span className="text-[11px] font-pixel text-slate-400">
                {settings.renderDistance <= 2 ? 'Rápido' : settings.renderDistance === 3 ? 'Padrão' : 'Detalhado'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => handleRenderDistanceChange(dist)}
                  className={`py-2 font-pixel text-xs border-2 uppercase transition ${
                    settings.renderDistance === dist
                      ? 'bg-emerald-700 border-emerald-400 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {dist} Chunks
                </button>
              ))}
            </div>
          </div>

          {/* Field of View (FOV) */}
          <div className="bg-slate-950/60 border-2 border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                Campo de Visão (FOV): {settings.fov || 75}°
              </span>
              <span className="text-[11px] font-pixel text-slate-400">
                {(settings.fov || 75) === 75 ? 'Normal' : (settings.fov || 75) > 85 ? 'Quake Pro' : 'Estreito'}
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              value={settings.fov || 75}
              onChange={(e) => handleFovChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Game Mode Toggle */}
          <div className="bg-slate-950/60 border-2 border-slate-700 p-4 flex items-center justify-between">
            <div>
              <span className="font-pixel text-xs text-slate-200 uppercase tracking-wider block">
                Modo de Jogo Atual:
              </span>
              <span className="text-[11px] text-slate-400">
                {settings.gameMode === 'survival'
                  ? 'Sobrevivência: Vida, fome e coleta'
                  : 'Criativo: Sem danos, voo e blocos livres'}
              </span>
            </div>
            <PixelButton
              variant={settings.gameMode === 'survival' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleGameModeToggle}
            >
              {settings.gameMode === 'survival' ? 'Sobrevivência' : 'Criativo'}
            </PixelButton>
          </div>

          {/* Mobile touch controls toggle */}
          {onToggleMobile && (
            <div className="bg-slate-950/60 border-2 border-slate-700 p-4 flex items-center justify-between">
              <div>
                <span className="font-pixel text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-yellow-400" />
                  Controles de Toque na Tela:
                </span>
                <span className="text-[11px] text-slate-400">
                  Exibe joystick e botões virtuais na tela
                </span>
              </div>
              <PixelButton
                variant={isMobile ? 'success' : 'secondary'}
                size="sm"
                onClick={() => {
                  sound.playClick();
                  onToggleMobile(!isMobile);
                }}
              >
                {isMobile ? 'Ativado' : 'Desativado'}
              </PixelButton>
            </div>
          )}

          {/* Reset World */}
          {onResetWorld && (
            <div className="bg-red-950/30 border-2 border-red-900/60 p-4 flex items-center justify-between">
              <div>
                <span className="font-pixel text-xs text-red-300 uppercase tracking-wider block">
                  Reiniciar Mundo Voxel
                </span>
                <span className="text-[11px] text-red-400/80">
                  Gera uma nova semente de terreno procedural
                </span>
              </div>
              <PixelButton
                variant="danger"
                size="sm"
                onClick={() => {
                  if (window.confirm('Deseja realmente gerar um novo mundo? Seu progresso atual será resetado.')) {
                    sound.playClick();
                    onResetWorld();
                    onClose();
                  }
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Novo Mundo
              </PixelButton>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-950 border-t-4 border-slate-800">
          <PixelButton
            variant="primary"
            size="md"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
          >
            <Check className="w-4 h-4" />
            Concluído
          </PixelButton>
        </div>
      </div>
    </div>
  );
};
