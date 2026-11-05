/**
 * KavCraft - Skin Customization Screen (Personalização)
 * Interactive 3D Character Rig, Preset Gallery, PNG Importer with auto Slim/Normal detection, and Save System.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Upload, Check, RotateCcw, ArrowLeft, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { PixelButton } from './PixelButton';
import { SKIN_PRESETS, analyzeSkinImage, createCharacterRig, configureSkinTexture, SkinPreset } from '../game/skins';
import { sound } from '../game/audio';

interface SkinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkinData: string;
  isSlimModel: boolean;
  onSaveSkin: (skinDataUrl: string, isSlim: boolean) => void;
}

export const SkinModal: React.FC<SkinModalProps> = ({
  isOpen,
  onClose,
  currentSkinData,
  isSlimModel,
  onSaveSkin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSkin, setSelectedSkin] = useState<string>(currentSkinData || SKIN_PRESETS[0].dataUrl);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('steve');
  const [isSlim, setIsSlim] = useState<boolean>(isSlimModel);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [rotationY, setRotationY] = useState<number>(0.2);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customSkinName, setCustomSkinName] = useState<string | null>(null);

  // Three.js 3D character viewport refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rigRef = useRef<ReturnType<typeof createCharacterRig> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastMouseXRef = useRef<number>(0);

  // Initialize 3D Character Preview Scene
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 420;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.9, 3.2);
    camera.lookAt(0, 0.85, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Lighting: full white ambient light to guarantee pure albedo without dark shadows
    const ambLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.9);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(-2, 2, -3);
    scene.add(backLight);

    // Initial character texture
    const textureLoader = new THREE.TextureLoader();
    const initialTex = textureLoader.load(selectedSkin, (loadedTex) => {
      configureSkinTexture(loadedTex);
      rigRef.current?.updateTexture(loadedTex, isSlim);
    });
    configureSkinTexture(initialTex);
    const rig = createCharacterRig(initialTex, isSlim);
    scene.add(rig.root);
    rigRef.current = rig;

    // Pedestal disk under character
    const pedGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.08, 16);
    const pedMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.set(0, -0.28, 0);
    scene.add(pedestal);

    // Render & Animation Loop
    let clock = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      clock += 0.03;

      if (rigRef.current) {
        // Idle breathing and subtle arm sway
        rigRef.current.root.rotation.y = rotationY;
        rigRef.current.rightArm.rotation.x = Math.sin(clock * 0.8) * 0.05;
        rigRef.current.leftArm.rotation.x = -Math.sin(clock * 0.8) * 0.05;
        rigRef.current.head.rotation.y = Math.sin(clock * 0.4) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, [isOpen]);

  // Update texture & model whenever skin or slim state changes
  useEffect(() => {
    if (!rigRef.current || !selectedSkin) return;

    const loader = new THREE.TextureLoader();
    loader.load(selectedSkin, (newTex) => {
      rigRef.current?.updateTexture(newTex, isSlim);
    });
  }, [selectedSkin, isSlim]);

  // Sync rotation to 3D rig
  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.root.rotation.y = rotationY;
    }
  }, [rotationY]);

  // Mouse / Touch Drag to Rotate Character
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastMouseXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    setRotationY((prev) => prev + deltaX * 0.015);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Select a preset skin
  const handleSelectPreset = (preset: SkinPreset) => {
    sound.playClick();
    setSelectedSkin(preset.dataUrl);
    setSelectedPresetId(preset.id);
    setIsSlim(preset.isSlim);
    setCustomSkinName(null);
    setStatusMessage(`Skin "${preset.name}" selecionada!`);
  };

  // Trigger file picker
  const handleImportClick = () => {
    sound.playClick();
    fileInputRef.current?.click();
  };

  // Handle uploaded PNG image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image/')) {
      setStatusMessage('Erro: Por favor selecione uma imagem PNG válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Normalize skin dimensions, ensure full RGBA base opacity, and remove solid-black overlay fills
        const analysis = analyzeSkinImage(img);
        const finalDataUrl = analysis.canvas.toDataURL('image/png');

        setSelectedSkin(finalDataUrl);
        setSelectedPresetId('custom');
        setIsSlim(analysis.isSlim);
        setCustomSkinName(file.name);

        // Immediately update 3D character rig with raw canvas texture to avoid re-decoding delays
        const directTex = new THREE.CanvasTexture(analysis.canvas);
        configureSkinTexture(directTex);
        rigRef.current?.updateTexture(directTex, analysis.isSlim);

        const formatDesc = analysis.isSlim ? 'Slim (3px)' : 'Clássico (4px)';
        const legacyDesc = analysis.isLegacy ? ' [Formato 64x32 convertido para 64x64]' : '';
        setStatusMessage(`Skin "${file.name}" importada com sucesso! Modelo: ${formatDesc}${legacyDesc}`);
        sound.playCraft();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be reloaded if needed
    e.target.value = '';
  };

  // Save current skin
  const handleSave = () => {
    sound.playCraft();
    onSaveSkin(selectedSkin, isSlim);
    setStatusMessage('Skin salva e aplicada ao jogador!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      {/* Container with classic stone texture styling */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border-4 border-slate-700 rounded-none shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b-4 border-slate-950">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="font-pixel text-lg sm:text-xl text-yellow-400 uppercase tracking-wider drop-shadow-[2px_2px_0px_#000]">
              Personalização de Skin
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

        {/* Content Body: 3D Preview (Left) + Presets & Import (Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Left Column: 3D Character Viewer */}
          <div className="md:col-span-5 flex flex-col items-center justify-between bg-slate-950/60 border-2 border-slate-700 p-4">
            <div className="w-full flex items-center justify-between text-xs font-pixel text-slate-400 mb-1">
              <span>VISUALIZADOR 3D</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <RotateCcw className="w-3 h-3 animate-spin" /> Arraste para girar
              </span>
            </div>

            {/* 3D Canvas */}
            <div
              className="relative w-full h-72 sm:h-80 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain" />

              {/* Reset rotation button */}
              <button
                onClick={() => setRotationY(0.2)}
                title="Redefinir rotação"
                className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Model Type Selector (Normal 4px vs Slim 3px) */}
            <div className="w-full mt-3 pt-3 border-t border-slate-800">
              <span className="block text-xs font-pixel text-slate-300 mb-2 text-center uppercase tracking-wide">
                Tipo de Modelo dos Braços:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsSlim(false);
                  }}
                  className={`py-2 px-3 text-xs font-pixel uppercase tracking-wide border-2 transition ${
                    !isSlim
                      ? 'bg-emerald-700 border-emerald-400 text-white font-bold shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Clássico (4px)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsSlim(true);
                  }}
                  className={`py-2 px-3 text-xs font-pixel uppercase tracking-wide border-2 transition ${
                    isSlim
                      ? 'bg-emerald-700 border-emerald-400 text-white font-bold shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Slim (3px)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Presets Gallery & Import Button */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            {/* Presets Gallery */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixel text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Skins Disponíveis
                </h3>
                <span className="text-xs text-slate-400 font-pixel">
                  {SKIN_PRESETS.length} modelos prontos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {SKIN_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex items-center gap-3 p-2.5 text-left border-2 transition ${
                        isSelected
                          ? 'bg-slate-800 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]'
                          : 'bg-slate-950/70 border-slate-700 hover:bg-slate-800/80 hover:border-slate-500'
                      }`}
                    >
                      {/* Skin 2D texture preview icon */}
                      <div className="w-10 h-10 bg-slate-900 border border-slate-600 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={preset.dataUrl}
                          alt={preset.name}
                          className="w-12 h-12 object-none pixelated"
                          style={{ objectPosition: '-8px -8px' }} // Focus on head face
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-pixel text-xs text-slate-100 font-bold truncate">
                            {preset.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                        </div>
                        <span className="block text-[11px] text-slate-400 truncate">
                          {preset.isSlim ? 'Braços Slim' : 'Braços Clássicos'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Import Section */}
            <div className="bg-slate-950/80 border-2 border-slate-700 p-4">
              <h3 className="font-pixel text-sm text-yellow-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Importar Skin do Computador / Celular
              </h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Carregue qualquer arquivo PNG de skin padrão de Minecraft (64x64 ou 64x32). O sistema identifica automaticamente o tamanho dos braços e converte para uso imediato!
              </p>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-3">
                <PixelButton
                  variant="primary"
                  size="md"
                  onClick={handleImportClick}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4" />
                  Importar Arquivo PNG
                </PixelButton>

                {customSkinName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-pixel rounded">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="truncate max-w-[140px]">{customSkinName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Feedback Message */}
            {statusMessage && (
              <div className="px-3 py-2 bg-slate-800/90 border border-emerald-500/40 text-emerald-300 text-xs font-pixel flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t-4 border-slate-800">
          <PixelButton
            variant="secondary"
            size="md"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </PixelButton>

          <PixelButton
            variant="success"
            size="lg"
            onClick={handleSave}
            className="px-8"
          >
            <Check className="w-5 h-5" />
            Salvar Skin
          </PixelButton>
        </div>
      </div>
    </div>
  );
};
