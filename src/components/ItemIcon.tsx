import React from 'react';
import { InventoryItem } from '../types';
import { textureManager } from '../game/textures';

interface ItemIconProps {
  item: InventoryItem;
  className?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ item, className = 'w-7 h-7' }) => {
  const iconSrc = textureManager.getItemIconDataURL(item.id, item.blockId);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={item.name}
        className={`${className} object-contain pixelated pointer-events-none drop-shadow-sm select-none`}
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-md flex items-center justify-center shadow-inner`}
      style={{ backgroundColor: item.iconColor }}
    >
      <span className="text-[9px] font-bold text-slate-950 px-0.5 text-center leading-tight truncate">
        {item.name.substring(0, 3)}
      </span>
    </div>
  );
};
