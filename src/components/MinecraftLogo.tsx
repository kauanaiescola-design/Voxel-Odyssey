import React from 'react';

interface MinecraftLogoProps {
  className?: string;
}

export const MinecraftLogo: React.FC<MinecraftLogoProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none filter drop-shadow-[0_10px_0_#000000] ${className}`}>
      <svg
        viewBox="0 0 550 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[520px] h-auto overflow-visible"
        style={{ imageRendering: 'pixelated' }}
      >
        <defs>
          {/* Stone Face Linear Gradient */}
          <linearGradient id="stoneFace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DFDFDF" />
            <stop offset="35%" stopColor="#B4B4B4" />
            <stop offset="70%" stopColor="#8C8C8C" />
            <stop offset="100%" stopColor="#6C6C6C" />
          </linearGradient>

          {/* 3D Extrusion Gradient */}
          <linearGradient id="stoneExtrude" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A4A4A" />
            <stop offset="100%" stopColor="#2A2A2A" />
          </linearGradient>

          {/* Crack Color */}
          <linearGradient id="crackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#222222" />
            <stop offset="100%" stopColor="#111111" />
          </linearGradient>
        </defs>

        {/* Global Deep Shadow layer */}
        <g transform="translate(6, 12)" fill="#000000">
          {/* Shadow path across all letters */}
          {/* M */}
          <path d="M 10 15 H 32 L 40 40 L 48 15 H 70 V 85 H 52 V 42 L 44 65 H 36 L 28 42 V 85 H 10 Z" />
          {/* I */}
          <path d="M 75 15 H 105 V 32 H 96 V 68 H 105 V 85 H 75 V 68 H 84 V 32 H 75 Z" />
          {/* N */}
          <path d="M 110 15 H 128 L 146 55 V 15 H 164 V 85 H 146 L 128 45 V 85 H 110 Z" />
          {/* E */}
          <path d="M 170 15 H 218 V 32 H 188 V 42 H 210 V 58 H 188 V 68 H 218 V 85 H 170 Z" />
          {/* C */}
          <path d="M 224 15 H 272 V 32 H 242 V 68 H 272 V 85 H 224 Z" />
          {/* R */}
          <path d="M 278 15 H 318 C 328 15 332 23 332 36 C 332 46 324 53 314 55 L 334 85 H 314 L 296 58 H 296 V 85 H 278 Z" />
          {/* A */}
          <path d="M 338 15 H 362 L 382 85 H 364 L 358 64 H 342 L 336 85 H 318 Z" />
          {/* F */}
          <path d="M 388 15 H 436 V 32 H 406 V 42 H 428 V 58 H 406 V 85 H 388 Z" />
          {/* T */}
          <path d="M 440 15 H 492 V 32 H 474 V 85 H 456 V 32 H 440 Z" />
        </g>

        {/* 3D Extrusion Side Layer (Dark Stone) */}
        <g transform="translate(3, 6)" fill="url(#stoneExtrude)" stroke="#000000" strokeWidth="4" strokeLinejoin="miter">
          {/* M */}
          <path d="M 10 15 H 32 L 40 40 L 48 15 H 70 V 85 H 52 V 42 L 44 65 H 36 L 28 42 V 85 H 10 Z" />
          {/* I */}
          <path d="M 75 15 H 105 V 32 H 96 V 68 H 105 V 85 H 75 V 68 H 84 V 32 H 75 Z" />
          {/* N */}
          <path d="M 110 15 H 128 L 146 55 V 15 H 164 V 85 H 146 L 128 45 V 85 H 110 Z" />
          {/* E */}
          <path d="M 170 15 H 218 V 32 H 188 V 42 H 210 V 58 H 188 V 68 H 218 V 85 H 170 Z" />
          {/* C */}
          <path d="M 224 15 H 272 V 32 H 242 V 68 H 272 V 85 H 224 Z" />
          {/* R */}
          <path d="M 278 15 H 318 C 328 15 332 23 332 36 C 332 46 324 53 314 55 L 334 85 H 314 L 296 58 H 296 V 85 H 278 Z" />
          {/* A */}
          <path d="M 338 15 H 362 L 382 85 H 364 L 358 64 H 342 L 336 85 H 318 Z" />
          {/* F */}
          <path d="M 388 15 H 436 V 32 H 406 V 42 H 428 V 58 H 406 V 85 H 388 Z" />
          {/* T */}
          <path d="M 440 15 H 492 V 32 H 474 V 85 H 456 V 32 H 440 Z" />
        </g>

        {/* Front Stone Face with Black Pixel Outline */}
        <g fill="url(#stoneFace)" stroke="#000000" strokeWidth="4" strokeLinejoin="miter">
          {/* Letter M */}
          <path d="M 10 15 H 32 L 40 40 L 48 15 H 70 V 85 H 52 V 42 L 44 65 H 36 L 28 42 V 85 H 10 Z" />
          {/* Letter I */}
          <path d="M 75 15 H 105 V 32 H 96 V 68 H 105 V 85 H 75 V 68 H 84 V 32 H 75 Z" />
          {/* Letter N */}
          <path d="M 110 15 H 128 L 146 55 V 15 H 164 V 85 H 146 L 128 45 V 85 H 110 Z" />
          {/* Letter E */}
          <path d="M 170 15 H 218 V 32 H 188 V 42 H 210 V 58 H 188 V 68 H 218 V 85 H 170 Z" />
          {/* Letter C */}
          <path d="M 224 15 H 272 V 32 H 242 V 68 H 272 V 85 H 224 Z" />
          {/* Letter R */}
          <path d="M 278 15 H 318 C 328 15 332 23 332 36 C 332 46 324 53 314 55 L 334 85 H 314 L 296 58 H 296 V 85 H 278 Z" />
          <path d="M 296 30 H 312 C 316 30 317 33 317 36 C 317 40 316 43 312 43 H 296 Z" fill="#3A3A3A" stroke="#000000" strokeWidth="2" />
          {/* Letter A */}
          <path d="M 338 15 H 362 L 382 85 H 364 L 358 64 H 342 L 336 85 H 318 Z" />
          <polygon points="350,30 345,50 355,50" fill="#3A3A3A" stroke="#000000" strokeWidth="2" />
          {/* Letter F */}
          <path d="M 388 15 H 436 V 32 H 406 V 42 H 428 V 58 H 406 V 85 H 388 Z" />
          {/* Letter T */}
          <path d="M 440 15 H 492 V 32 H 474 V 85 H 456 V 32 H 440 Z" />
        </g>

        {/* Top Edge White Bevel Highlights (1-2px) */}
        <g stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="square" opacity="0.85">
          {/* M top */}
          <line x1="12" y1="16" x2="31" y2="16" />
          <line x1="49" y1="16" x2="68" y2="16" />
          <line x1="12" y1="16" x2="12" y2="83" />
          {/* I top */}
          <line x1="77" y1="16" x2="103" y2="16" />
          <line x1="85" y1="33" x2="85" y2="67" />
          {/* N top */}
          <line x1="112" y1="16" x2="127" y2="16" />
          <line x1="147" y1="16" x2="162" y2="16" />
          <line x1="112" y1="16" x2="112" y2="83" />
          {/* E top */}
          <line x1="172" y1="16" x2="216" y2="16" />
          <line x1="172" y1="16" x2="172" y2="83" />
          <line x1="189" y1="43" x2="209" y2="43" />
          {/* C top */}
          <line x1="226" y1="16" x2="270" y2="16" />
          <line x1="226" y1="16" x2="226" y2="83" />
          {/* R top */}
          <line x1="280" y1="16" x2="316" y2="16" />
          <line x1="280" y1="16" x2="280" y2="83" />
          {/* A top */}
          <line x1="340" y1="16" x2="360" y2="16" />
          {/* F top */}
          <line x1="390" y1="16" x2="434" y2="16" />
          <line x1="390" y1="16" x2="390" y2="83" />
          <line x1="407" y1="43" x2="427" y2="43" />
          {/* T top */}
          <line x1="442" y1="16" x2="490" y2="16" />
          <line x1="457" y1="33" x2="457" y2="83" />
        </g>

        {/* Iconic Stone Cracks across Letters */}
        <g stroke="url(#crackGradient)" strokeWidth="1.8" strokeLinecap="round" opacity="0.9">
          {/* M crack */}
          <path d="M 22 22 L 25 35 L 20 45 L 24 60" />
          <path d="M 58 45 L 63 55 L 59 70" />
          {/* I crack */}
          <path d="M 88 40 L 92 48 L 88 56" />
          {/* N crack */}
          <path d="M 118 30 L 122 42 L 117 58" />
          <path d="M 132 25 L 138 35 L 144 48" />
          {/* E crack */}
          <path d="M 180 25 L 183 38 L 177 50 L 182 65" />
          <path d="M 198 22 L 204 28" />
          {/* C crack */}
          <path d="M 235 25 L 238 40 L 232 55 L 236 72" />
          <path d="M 255 75 L 260 80" />
          {/* R crack */}
          <path d="M 288 28 L 292 40 L 287 55 L 291 70" />
          <path d="M 320 62 L 324 72 L 328 80" />
          {/* A crack */}
          <path d="M 334 35 L 340 45 L 345 55" />
          <path d="M 368 40 L 372 52 L 376 68" />
          {/* F crack */}
          <path d="M 398 28 L 401 42 L 396 60 L 400 75" />
          <path d="M 418 22 L 424 28" />
          {/* T crack */}
          <path d="M 462 20 L 466 26" />
          <path d="M 466 40 L 470 52 L 464 68 L 468 78" />
        </g>
      </svg>
    </div>
  );
};
