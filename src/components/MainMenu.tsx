/**
 * KavCraft / Minecraft Classic Main Menu Component
 * Faithful recreation of the classic Minecraft Java title screen:
 * - 3D live panorama background with subtle blur
 * - Iconic cracked stone MINECRAFT 3D logo
 * - Pulsing yellow angled splash text ("Undocumented!")
 * - Authentic beveled stone buttons (Singleplayer, Multiplayer, Minecraft Realms, Options, Quit, Globe)
 * - Version and copyright text in bottom corners
 */

import React, { useState, useEffect } from 'react';
import { Globe, UserCheck, LogOut, Wifi, Server, Check } from 'lucide-react';
import { MinecraftLogo } from './MinecraftLogo';
import { MinecraftMenuButton } from './MinecraftMenuButton';
import { sound } from '../game/audio';

interface MainMenuProps {
  isOpen: boolean;
  onPlay: () => void;
  onOpenCustomization: () => void;
  onOpenOptions: () => void;
  currentSkinData: string;
  isSlimModel: boolean;
}

const SPLASH_MESSAGES = [
  'Undocumented!',
  'Kavcraft Edition!',
  '100% Pure Pixels!',
  'Now with working Furnaces!',
  'Skin 64x64 support!',
  'Never dig straight down!',
  'Singleplayer rocks!',
  'Cuidado com as cavernas!',
  'Awesome voxels!',
  'Nostalgia pura!',
];

export const MainMenu: React.FC<MainMenuProps> = ({
  isOpen,
  onPlay,
  onOpenCustomization,
  onOpenOptions,
  currentSkinData,
  isSlimModel,
}) => {
  const [splashIndex, setSplashIndex] = useState<number>(0);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState<boolean>(false);
  const [showRealmsModal, setShowRealmsModal] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<'pt' | 'en'>('pt');

  // Change splash on click
  const handleSplashClick = () => {
    sound.playClick();
    setSplashIndex((prev) => (prev + 1) % SPLASH_MESSAGES.length);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 select-none overflow-hidden bg-black/25 backdrop-blur-[1.5px] pointer-events-auto">
      {/* Subtle vignette border gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      {/* Top Banner: Minecraft Cracked Stone Logo & Yellow Splash */}
      <div className="relative flex flex-col items-center mt-6 sm:mt-10 md:mt-12 z-10">
        <div className="relative">
          {/* Authentic 3D Stone Logo */}
          <MinecraftLogo className="w-[320px] sm:w-[440px] md:w-[500px]" />

          {/* Yellow Bouncing Angled Splash Text */}
          <button
            type="button"
            onClick={handleSplashClick}
            title="Clique para trocar o splash!"
            className="absolute -bottom-3 sm:-bottom-4 -right-4 sm:-right-8 md:-right-12 z-20 cursor-pointer transition-transform hover:scale-110 active:scale-95"
            style={{
              animation: 'minecraftSplash 1.2s infinite ease-in-out',
            }}
          >
            <span
              className="font-pixel font-bold text-xs sm:text-sm md:text-base whitespace-nowrap text-[#FFFF00]"
              style={{
                textShadow: '2px 2px 0px #3F3F00, 3px 3px 0px #000000',
              }}
            >
              {SPLASH_MESSAGES[splashIndex]}
            </span>
          </button>
        </div>
      </div>

      {/* Center: Classic Stone Action Buttons */}
      <div className="flex flex-col items-center w-full max-w-[400px] gap-2.5 my-auto z-10 px-4">
        {/* Row 1: Singleplayer */}
        <MinecraftMenuButton onClick={onPlay}>
          Singleplayer
        </MinecraftMenuButton>

        {/* Row 2: Multiplayer */}
        <MinecraftMenuButton onClick={() => setShowMultiplayerModal(true)}>
          Multiplayer
        </MinecraftMenuButton>

        {/* Row 3: Minecraft Realms */}
        <MinecraftMenuButton onClick={() => setShowRealmsModal(true)}>
          Minecraft Realms
        </MinecraftMenuButton>

        {/* Row 4: Split Row [ Globe Button ] [ Options... ] [ Quit Game ] */}
        <div className="grid grid-cols-[40px_1fr_1fr] gap-2 w-full">
          {/* Globe / Language Button */}
          <button
            type="button"
            title="Idioma / Language"
            onClick={() => setShowLanguageModal(true)}
            onMouseEnter={() => sound.playHover()}
            className="relative h-10 w-10 flex items-center justify-center font-pixel text-slate-200 border-2 border-black bg-[#737373] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#373737] hover:bg-[#8585c0] hover:text-[#FFFFA0] hover:shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#24244b] active:bg-[#555555] active:shadow-[inset_2px_2px_0px_#222222,inset_-2px_-2px_0px_#a0a0a0] active:translate-y-[1px] cursor-pointer"
          >
            <Globe className="w-5 h-5 drop-shadow-[1px_1px_0px_#000]" />
          </button>

          {/* Options... */}
          <MinecraftMenuButton onClick={onOpenOptions} fullWidth>
            Options...
          </MinecraftMenuButton>

          {/* Quit Game */}
          <MinecraftMenuButton onClick={() => setShowExitModal(true)} fullWidth>
            Quit Game
          </MinecraftMenuButton>
        </div>
      </div>

      {/* Bottom Corners: Version and Copyright */}
      <div className="w-full flex items-end justify-between z-10 text-[11px] font-pixel text-white px-2 select-none">
        {/* Bottom Left: Minecraft 1.10 */}
        <div
          className="flex flex-col text-left text-white/90"
          style={{ textShadow: '1px 1px 0px #000000, 2px 2px 0px #000000' }}
        >
          <span>Minecraft 1.10</span>
        </div>

        {/* Bottom Right: Copyright Mojang AB. Do not distribute! */}
        <div
          className="text-right text-white/90"
          style={{ textShadow: '1px 1px 0px #000000, 2px 2px 0px #000000' }}
        >
          <span>Copyright Mojang AB. Do not distribute!</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODALS */}
      {/* ------------------------------------------------------------------ */}

      {/* MULTIPLAYER MODAL */}
      {showMultiplayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#2c2c2c] border-2 border-black p-5 shadow-[inset_2px_2px_0px_#888,inset_-2px_-2px_0px_#111] flex flex-col gap-4 text-center">
            <h3
              className="font-pixel text-base sm:text-lg text-[#FFFFA0]"
              style={{ textShadow: '2px 2px 0px #3F3F20' }}
            >
              Jogar em Rede / Multiplayer
            </h3>

            {/* Server Item */}
            <div className="bg-[#1c1c1c] border-2 border-black p-3 text-left flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-pixel text-sm text-slate-100">Kavcraft World (Localhost)</h4>
                  <p className="font-pixel text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <Wifi className="w-3.5 h-3.5" /> Servidor Ativo • 1/20 Jogadores
                  </p>
                </div>
              </div>
              <span className="font-pixel text-xs text-slate-400">Ping: 1ms</span>
            </div>

            <p className="font-pixel text-xs text-slate-400 leading-relaxed">
              O seu mundo 3D voxel com biomas, animais e fornalhas está rodando localmente no navegador!
            </p>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <MinecraftMenuButton
                onClick={() => {
                  setShowMultiplayerModal(false);
                  onPlay();
                }}
              >
                Entrar no Servidor
              </MinecraftMenuButton>

              <MinecraftMenuButton onClick={() => setShowMultiplayerModal(false)}>
                Cancelar
              </MinecraftMenuButton>
            </div>
          </div>
        </div>
      )}

      {/* REALMS & SKINS MODAL */}
      {showRealmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#2c2c2c] border-2 border-black p-5 shadow-[inset_2px_2px_0px_#888,inset_-2px_-2px_0px_#111] flex flex-col gap-4 text-center">
            <h3
              className="font-pixel text-base sm:text-lg text-[#FFFFA0]"
              style={{ textShadow: '2px 2px 0px #3F3F20' }}
            >
              Minecraft Realms & Personagem
            </h3>

            {/* Skin Preview Card */}
            <div className="bg-[#1c1c1c] border-2 border-black p-3 flex items-center justify-between gap-3 shadow-inner text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={currentSkinData}
                    alt="Skin do Jogador"
                    className="w-12 h-12 object-none pixelated"
                    style={{ objectPosition: '-8px -8px' }}
                  />
                </div>
                <div>
                  <h4 className="font-pixel text-xs text-slate-400 uppercase">Skin Atual:</h4>
                  <span className="font-pixel text-sm text-yellow-300 font-bold">
                    {isSlimModel ? 'Modelo Slim (3px)' : 'Modelo Clássico (4px)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRealmsModal(false);
                  onOpenCustomization();
                }}
                className="font-pixel text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1.5 border border-yellow-200 cursor-pointer"
              >
                Mudar Skin
              </button>
            </div>

            <p className="font-pixel text-xs text-slate-400 leading-relaxed">
              Explore o mundo Kavcraft com suas skins personalizadas de 64x64 pixels, importação de PNGs e animações completas.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <MinecraftMenuButton
                onClick={() => {
                  setShowRealmsModal(false);
                  onPlay();
                }}
              >
                Jogar no Realm
              </MinecraftMenuButton>

              <MinecraftMenuButton onClick={() => setShowRealmsModal(false)}>
                Voltar
              </MinecraftMenuButton>
            </div>
          </div>
        </div>
      )}

      {/* LANGUAGE MODAL */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-[#2c2c2c] border-2 border-black p-5 shadow-[inset_2px_2px_0px_#888,inset_-2px_-2px_0px_#111] flex flex-col gap-3 text-center">
            <h3
              className="font-pixel text-base text-[#FFFFA0]"
              style={{ textShadow: '2px 2px 0px #3F3F20' }}
            >
              Idioma / Language
            </h3>

            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedLang('pt');
                }}
                className={`flex items-center justify-between p-2.5 font-pixel text-xs border border-black cursor-pointer ${
                  selectedLang === 'pt'
                    ? 'bg-slate-700 text-yellow-300 border-white'
                    : 'bg-[#1e1e1e] text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>Português (Brasil)</span>
                {selectedLang === 'pt' && <Check className="w-4 h-4 text-yellow-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedLang('en');
                }}
                className={`flex items-center justify-between p-2.5 font-pixel text-xs border border-black cursor-pointer ${
                  selectedLang === 'en'
                    ? 'bg-slate-700 text-yellow-300 border-white'
                    : 'bg-[#1e1e1e] text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>English (US)</span>
                {selectedLang === 'en' && <Check className="w-4 h-4 text-yellow-400" />}
              </button>
            </div>

            <div className="mt-3">
              <MinecraftMenuButton onClick={() => setShowLanguageModal(false)} fullWidth>
                Concluído
              </MinecraftMenuButton>
            </div>
          </div>
        </div>
      )}

      {/* QUIT GAME CONFIRMATION MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md bg-[#2c2c2c] border-2 border-black p-6 shadow-[inset_2px_2px_0px_#888,inset_-2px_-2px_0px_#111] flex flex-col items-center gap-4 text-center">
            <LogOut className="w-8 h-8 text-red-400" />
            <h3
              className="font-pixel text-base sm:text-lg text-[#FFFFA0]"
              style={{ textShadow: '2px 2px 0px #3F3F20' }}
            >
              Deseja Sair do Jogo?
            </h3>
            <p className="font-pixel text-xs text-slate-400 leading-relaxed">
              Seu progresso de mapa e itens do inventário ficam salvos no seu navegador. Deseja reiniciar a sessão?
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <MinecraftMenuButton onClick={() => setShowExitModal(false)}>
                Cancelar
              </MinecraftMenuButton>

              <MinecraftMenuButton
                onClick={() => {
                  window.location.reload();
                }}
              >
                Sair
              </MinecraftMenuButton>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for the Minecraft Splash Bounce animation */}
      <style>{`
        @keyframes minecraftSplash {
          0% {
            transform: rotate(-20deg) scale(1);
          }
          50% {
            transform: rotate(-20deg) scale(1.08);
          }
          100% {
            transform: rotate(-20deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
