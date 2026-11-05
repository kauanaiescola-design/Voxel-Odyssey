import React from 'react';
import { sound } from '../game/audio';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
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

  // Pixel button styling with classic beveled borders (highlight top/left, shadow bottom/right)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm sm:text-base',
    lg: 'px-6 py-3.5 text-base sm:text-lg font-bold',
  }[size];

  const variantClasses = {
    primary:
      'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white border-t-2 border-l-2 border-emerald-400 border-r-2 border-b-2 border-emerald-950 shadow-[0_4px_0_0_#064e3b]',
    secondary:
      'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 border-t-2 border-l-2 border-slate-400 border-r-2 border-b-2 border-slate-950 shadow-[0_4px_0_0_#0f172a]',
    success:
      'bg-lime-700 hover:bg-lime-600 active:bg-lime-800 text-white border-t-2 border-l-2 border-lime-400 border-r-2 border-b-2 border-lime-950 shadow-[0_4px_0_0_#1a2e05]',
    danger:
      'bg-red-800 hover:bg-red-700 active:bg-red-900 text-red-100 border-t-2 border-l-2 border-red-500 border-r-2 border-b-2 border-red-950 shadow-[0_4px_0_0_#450a0a]',
  }[variant];

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed filter grayscale shadow-none'
    : 'cursor-pointer active:translate-y-1 active:shadow-none hover:brightness-110';

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={disabled}
      className={`font-pixel uppercase tracking-wider transition-all duration-75 flex items-center justify-center gap-2 select-none ${sizeClasses} ${variantClasses} ${disabledClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      <span className="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)] flex items-center gap-2">
        {children}
      </span>
    </button>
  );
};
