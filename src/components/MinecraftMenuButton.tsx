import React from 'react';
import { sound } from '../game/audio';

interface MinecraftMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const MinecraftMenuButton: React.FC<MinecraftMenuButtonProps> = ({
  children,
  fullWidth = true,
  className = '',
  onClick,
  onMouseEnter,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      sound.playClick();
      onClick?.(e);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      sound.playHover();
      onMouseEnter?.(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={disabled}
      className={`
        relative h-10 px-4 flex items-center justify-center
        font-pixel text-sm sm:text-base select-none transition-none
        border-2 border-black
        ${
          disabled
            ? 'bg-[#4c4c4c] text-[#8c8c8c] cursor-not-allowed shadow-[inset_2px_2px_0px_#707070,inset_-2px_-2px_0px_#2a2a2a]'
            : 'bg-[#737373] text-[#E0E0E0] cursor-pointer shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#373737] hover:bg-[#8585c0] hover:text-[#FFFFA0] hover:shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#24244b] active:bg-[#555555] active:shadow-[inset_2px_2px_0px_#222222,inset_-2px_-2px_0px_#a0a0a0] active:translate-y-[1px]'
        }
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        textShadow: disabled
          ? '2px 2px 0px #202020'
          : '2px 2px 0px #3F3F3F',
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 truncate">
        {children}
      </span>
    </button>
  );
};
