/**
 * KavCraft - Main Application Component
 * Connects Three.js 3D Voxel Engine with Nostalgic Main Menu, 3D Skin Customization, Options, React HUD, and Controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { MenuModal } from './components/MenuModal';
import { MainMenu } from './components/MainMenu';
import { SkinModal } from './components/SkinModal';
import { OptionsMenu } from './components/OptionsMenu';
import { MobileControls } from './components/MobileControls';
import { InventoryItem, PlayerStats, WorldSettings } from './types';
import { SKIN_PRESETS } from './game/skins';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Device detection
  const [isMobile, setIsMobile] = useState(false);

  // Player Skin State (persisted in localStorage)
  const [currentSkin, setCurrentSkin] = useState<string>(() => {
    return localStorage.getItem('kavcraft_skin_data') || SKIN_PRESETS[0].dataUrl;
  });
  const [isSlimModel, setIsSlimModel] = useState<boolean>(() => {
    return localStorage.getItem('kavcraft_skin_is_slim') === 'true';
  });

  // Top-level Navigation Screens
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);
  const [isSkinModalOpen, setIsSkinModalOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  // World Settings
  const [settings, setSettings] = useState<WorldSettings>({
    seed: Math.floor(Math.random() * 999999) + 1000,
    renderDistance: 3,
    soundEnabled: true,
    gameMode: 'survival',
    fov: 75,
  });

  // Player Stats
  const [stats, setStats] = useState<PlayerStats>({
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    oxygen: 20,
    maxOxygen: 20,
    isDead: false,
    score: 0,
  });

  // Inventory & Selection
  const [inventory, setInventory] = useState<(InventoryItem | null)[]>(new Array(36).fill(null));
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // Interaction State
  const [targetBlock, setTargetBlock] = useState<string | null>(null);
  const [miningProgress, setMiningProgress] = useState<number>(0);
  const [timeString, setTimeString] = useState<string>('06:00');
  const [isNight, setIsNight] = useState<boolean>(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 30, z: 0, biome: 'plains' });

  // In-Game Modals
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [station, setStation] = useState<'none' | 'workbench' | 'furnace' | 'chest'>('none');
  const [chestData, setChestData] = useState<{ x: number; y: number; z: number; items: { itemId: string; count: number }[] } | undefined>(undefined);
  
  // Furnace Station Data (persists across modal openings)
  const [furnaceInput, setFurnaceInput] = useState<InventoryItem | null>(null);
  const [furnaceFuel, setFurnaceFuel] = useState<InventoryItem | null>(null);
  const [furnaceOutput, setFurnaceOutput] = useState<InventoryItem | null>(null);

  const [isCrouching, setIsCrouching] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  // Check touch device
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(hasTouch);
    };
    checkMobile();
  }, []);

  // Initialize Game Engine
  const initEngine = useCallback((curSettings: WorldSettings) => {
    if (!containerRef.current) return;

    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    const engine = new GameEngine(containerRef.current, curSettings, {
      onStatsChange: (newStats) => setStats(newStats),
      onInventoryChange: (newInv) => setInventory(newInv),
      onHotbarSelect: (slot) => setSelectedSlot(slot),
      onOpenStation: (st, cData) => {
        setStation(st);
        setChestData(cData);
        setIsInventoryOpen(true);
      },
      onTargetBlockChange: (name) => setTargetBlock(name),
      onMiningProgressChange: (prog) => setMiningProgress(prog),
      onTimeChange: (timeStr, night) => {
        setTimeString(timeStr);
        setIsNight(night);
      },
      onPosChange: (x, y, z, biome) => setPlayerPos({ x, y, z, biome }),
    });

    // Start in cinematic menu panorama if main menu is open
    if (isMainMenuOpen) {
      engine.setMenuMode(true);
    }

    // Apply active skin to player hand
    if (currentSkin) {
      engine.setPlayerSkin(currentSkin, isSlimModel);
    }

    engineRef.current = engine;
  }, [isMainMenuOpen, currentSkin, isSlimModel]);

  useEffect(() => {
    initEngine(settings);

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [initEngine]);

  // Global Keyboard Shortcuts (E for Inventory, Escape for Pause / Menus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMainMenuOpen) {
        if (e.code === 'Escape') {
          if (isSkinModalOpen) setIsSkinModalOpen(false);
          else if (isOptionsMenuOpen) setIsOptionsMenuOpen(false);
        }
        return;
      }

      if (e.code === 'KeyE') {
        if (isInventoryOpen) {
          setIsInventoryOpen(false);
          setStation('none');
          if (!isMobile) engineRef.current?.requestLock();
        } else if (!isPauseOpen && !stats.isDead && !isSkinModalOpen && !isOptionsMenuOpen) {
          engineRef.current?.exitLock();
          setStation('none');
          setIsInventoryOpen(true);
        }
      } else if (e.code === 'Escape') {
        if (isSkinModalOpen) {
          setIsSkinModalOpen(false);
        } else if (isOptionsMenuOpen) {
          setIsOptionsMenuOpen(false);
        } else if (isInventoryOpen) {
          setIsInventoryOpen(false);
          setStation('none');
        } else {
          setIsPauseOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMainMenuOpen, isSkinModalOpen, isOptionsMenuOpen, isInventoryOpen, isPauseOpen, stats.isDead, isMobile]);

  // Play Game button from Main Menu
  const handlePlayGame = () => {
    setIsMainMenuOpen(false);
    setIsPauseOpen(false);
    setIsInventoryOpen(false);
    if (engineRef.current) {
      engineRef.current.setMenuMode(false);
      if (!isMobile) {
        engineRef.current.requestLock();
      }
    }
  };

  // Return to Main Menu from Pause or Death screen
  const handleReturnToMainMenu = () => {
    setIsPauseOpen(false);
    setIsInventoryOpen(false);
    setIsSkinModalOpen(false);
    setIsOptionsMenuOpen(false);
    setIsMainMenuOpen(true);
    if (engineRef.current) {
      engineRef.current.setMenuMode(true);
    }
  };

  // Slot Selection
  const handleSelectSlot = (slot: number) => {
    setSelectedSlot(slot);
    engineRef.current?.setSelectedSlot(slot);
  };

  // Inventory Update
  const handleUpdateInventory = (newInv: (InventoryItem | null)[]) => {
    setInventory(newInv);
    if (engineRef.current) {
      engineRef.current.inventory = newInv;
      engineRef.current.setSelectedSlot(selectedSlot);
    }
  };

  // Close Inventory
  const handleCloseInventory = () => {
    setIsInventoryOpen(false);
    setStation('none');
    if (!isMobile && !isPauseOpen && !isMainMenuOpen) {
      engineRef.current?.requestLock();
    }
  };

  // Resume Game from Pause
  const handleResume = () => {
    setIsPauseOpen(false);
    if (!isMobile) {
      engineRef.current?.requestLock();
    }
  };

  // Restart / New Game
  const handleRestart = () => {
    const newSettings: WorldSettings = {
      ...settings,
      seed: Math.floor(Math.random() * 999999) + 1000,
    };
    setSettings(newSettings);
    setIsPauseOpen(false);
    setIsInventoryOpen(false);
    initEngine(newSettings);
  };

  // Respawn after death
  const handleRespawn = () => {
    engineRef.current?.respawn();
    if (!isMobile) {
      engineRef.current?.requestLock();
    }
  };

  // Settings update
  const handleUpdateSettings = (newSettings: WorldSettings) => {
    setSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.settings = newSettings;
    }
  };

  // Save new skin
  const handleSaveSkin = (newSkinData: string, isSlim: boolean) => {
    setCurrentSkin(newSkinData);
    setIsSlimModel(isSlim);
    try {
      localStorage.setItem('kavcraft_skin_data', newSkinData);
      localStorage.setItem('kavcraft_skin_is_slim', String(isSlim));
    } catch {
      // Storage quota or disabled
    }
    if (engineRef.current) {
      engineRef.current.setPlayerSkin(newSkinData, isSlim);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Main Menu Screen (KavCraft nostalgic title screen) */}
      <MainMenu
        isOpen={isMainMenuOpen}
        onPlay={handlePlayGame}
        onOpenCustomization={() => setIsSkinModalOpen(true)}
        onOpenOptions={() => setIsOptionsMenuOpen(true)}
        currentSkinData={currentSkin}
        isSlimModel={isSlimModel}
      />

      {/* Main In-Game HUD (Only shown during active gameplay) */}
      {!isMainMenuOpen && (
        <HUD
          stats={stats}
          inventory={inventory}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          targetBlock={targetBlock}
          miningProgress={miningProgress}
          timeString={timeString}
          isNight={isNight}
          playerPos={playerPos}
          onOpenInventory={() => {
            engineRef.current?.exitLock();
            setStation('none');
            setIsInventoryOpen(true);
          }}
          onOpenPause={() => {
            engineRef.current?.exitLock();
            setIsPauseOpen(true);
          }}
          isMobile={isMobile}
        />
      )}

      {/* Mobile Virtual Controls */}
      {isMobile && !isMainMenuOpen && !isInventoryOpen && !isPauseOpen && (
        <MobileControls
          onMoveChange={(move) => {
            if (engineRef.current) engineRef.current.moveInput.copy(move);
          }}
          onJumpStart={() => {
            if (engineRef.current) engineRef.current.isJumping = true;
          }}
          onJumpEnd={() => {
            if (engineRef.current) engineRef.current.isJumping = false;
          }}
          onCrouchToggle={(crouch) => {
            if (engineRef.current) engineRef.current.isCrouching = crouch;
            setIsCrouching(crouch);
          }}
          onSprintToggle={(sprint) => {
            if (engineRef.current) engineRef.current.isSprinting = sprint;
            setIsSprinting(sprint);
          }}
          isCrouching={isCrouching}
          isSprinting={isSprinting}
          onMineStart={() => {
            if (engineRef.current) {
              engineRef.current.isMining = true;
              engineRef.current.swingHand();
            }
          }}
          onMineEnd={() => {
            if (engineRef.current) {
              engineRef.current.isMining = false;
              engineRef.current.miningProgress = 0;
              setMiningProgress(0);
            }
          }}
          onPlaceClick={() => {
            engineRef.current?.handleRightClick();
          }}
          onOpenInventory={() => {
            setStation('none');
            setIsInventoryOpen(true);
          }}
          onLookDelta={(dx, dy, sens) => {
            if (engineRef.current) {
              engineRef.current.yaw -= dx * sens;
              engineRef.current.pitch -= dy * sens;
              engineRef.current.pitch = Math.max(
                -Math.PI / 2 + 0.01,
                Math.min(Math.PI / 2 - 0.01, engineRef.current.pitch)
              );
            }
          }}
        />
      )}

      {/* Inventory & Crafting Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={handleCloseInventory}
        inventory={inventory}
        onUpdateInventory={handleUpdateInventory}
        station={station}
        chestData={chestData}
        currentSkin={currentSkin}
        isSlimModel={isSlimModel}
        onOpenSkinModal={() => {
          setIsInventoryOpen(false);
          setIsSkinModalOpen(true);
        }}
        furnaceInput={furnaceInput}
        furnaceFuel={furnaceFuel}
        furnaceOutput={furnaceOutput}
        onUpdateFurnaceInput={setFurnaceInput}
        onUpdateFurnaceFuel={setFurnaceFuel}
        onUpdateFurnaceOutput={setFurnaceOutput}
      />

      {/* Pause & Settings Menu / Death Screen */}
      <MenuModal
        isOpen={isPauseOpen}
        onResume={handleResume}
        onRestart={handleRestart}
        onReturnToMainMenu={handleReturnToMainMenu}
        onOpenCustomization={() => setIsSkinModalOpen(true)}
        onOpenOptions={() => setIsOptionsMenuOpen(true)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        stats={stats}
        onRespawn={handleRespawn}
        isMobile={isMobile}
        onToggleMobile={setIsMobile}
      />

      {/* Skin Customization Modal (Personalização) */}
      <SkinModal
        isOpen={isSkinModalOpen}
        onClose={() => setIsSkinModalOpen(false)}
        currentSkinData={currentSkin}
        isSlimModel={isSlimModel}
        onSaveSkin={handleSaveSkin}
      />

      {/* Options & Settings Modal (Opções) */}
      <OptionsMenu
        isOpen={isOptionsMenuOpen}
        onClose={() => setIsOptionsMenuOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        isMobile={isMobile}
        onToggleMobile={setIsMobile}
        onResetWorld={handleRestart}
      />
    </div>
  );
}
