/**
 * KavCraft - Character 3D Doll for Inventory Screen
 * Renders the player character model with their active skin, tracking mouse cursor and gentle idle animation.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { UserCheck, Sparkles, RotateCw } from 'lucide-react';
import { createCharacterRig, configureSkinTexture } from '../game/skins';

interface CharacterDollProps {
  skinDataUrl: string;
  isSlim: boolean;
  onOpenCustomizer?: () => void;
  className?: string;
}

export const CharacterDoll: React.FC<CharacterDollProps> = ({
  skinDataUrl,
  isSlim,
  onOpenCustomizer,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rigRef = useRef<ReturnType<typeof createCharacterRig> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Target look direction based on cursor
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [spinOffset, setSpinOffset] = useState<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const width = containerRef.current.clientWidth || 140;
    const height = containerRef.current.clientHeight || 180;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 0.85, 2.9);
    camera.lookAt(0, 0.82, 0);
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

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.9);
    dirLight.position.set(1.5, 3, 2.5);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-1.5, 1, -2);
    scene.add(fillLight);

    // Initial character rig
    const textureLoader = new THREE.TextureLoader();
    const initialTex = textureLoader.load(skinDataUrl, (loadedTex) => {
      configureSkinTexture(loadedTex);
      rigRef.current?.updateTexture(loadedTex, isSlim);
    });
    configureSkinTexture(initialTex);
    const rig = createCharacterRig(initialTex, isSlim);
    scene.add(rig.root);
    rigRef.current = rig;

    // Subtle dark circular shadow underneath
    const shadowGeo = new THREE.CircleGeometry(0.38, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x090d16, opacity: 0.6, transparent: true });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(0, -0.245, 0);
    scene.add(shadow);

    // Track mouse movement across the window to make doll look at cursor
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth * 0.4)));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight * 0.4)));

      mouseTargetRef.current = { x: normX, y: normY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    let clock = 0;
    let currentLookX = 0;
    let currentLookY = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      clock += 0.025;

      // Smooth interpolation towards mouse look target
      currentLookX += (mouseTargetRef.current.x - currentLookX) * 0.08;
      currentLookY += (mouseTargetRef.current.y - currentLookY) * 0.08;

      if (rigRef.current) {
        // Body slightly turns towards mouse, head turns more
        rigRef.current.root.rotation.y = currentLookX * 0.45 + spinOffset;
        rigRef.current.head.rotation.y = currentLookX * 0.35 + Math.sin(clock * 0.5) * 0.04;
        rigRef.current.head.rotation.x = currentLookY * 0.25;

        // Gentle breathing and natural arm stance
        rigRef.current.rightArm.rotation.x = Math.sin(clock * 0.8) * 0.04 - 0.05;
        rigRef.current.leftArm.rotation.x = -Math.sin(clock * 0.8) * 0.04 - 0.05;
        rigRef.current.rightArm.rotation.z = 0.05;
        rigRef.current.leftArm.rotation.z = -0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, [skinDataUrl, isSlim, spinOffset]);

  // Update texture whenever skinDataUrl or isSlim changes
  useEffect(() => {
    if (!rigRef.current || !skinDataUrl) return;

    const loader = new THREE.TextureLoader();
    loader.load(skinDataUrl, (newTex) => {
      configureSkinTexture(newTex);
      rigRef.current?.updateTexture(newTex, isSlim);
    });
  }, [skinDataUrl, isSlim]);

  const handleManualSpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpinOffset((prev) => prev + Math.PI * 0.5);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-between bg-slate-950/90 border-2 border-slate-700 p-2 shadow-inner select-none overflow-hidden ${className}`}
    >
      {/* Top Header Label */}
      <div className="w-full flex items-center justify-between text-[10px] font-pixel text-slate-400 border-b border-slate-800 pb-1 mb-1">
        <span className="flex items-center gap-1 text-yellow-400 font-bold uppercase tracking-wider">
          <UserCheck className="w-3 h-3 text-emerald-400" />
          Personagem
        </span>
        <button
          type="button"
          onClick={handleManualSpin}
          title="Girar 90°"
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      {/* 3D Character Canvas */}
      <div className="relative w-full h-40 sm:h-44 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      </div>

      {/* Bottom Info & Customizer Link */}
      <div className="w-full pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
        <span className="text-[9px] font-pixel text-slate-400 uppercase truncate">
          {isSlim ? 'Slim (3px)' : 'Normal (4px)'}
        </span>

        {onOpenCustomizer && (
          <button
            type="button"
            onClick={onOpenCustomizer}
            className="text-[9px] font-pixel text-yellow-400 hover:text-yellow-300 hover:underline flex items-center gap-1 cursor-pointer bg-slate-800/80 hover:bg-slate-700 px-1.5 py-0.5 border border-slate-600 rounded"
          >
            <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
            Trocar Skin
          </button>
        )}
      </div>
    </div>
  );
};
