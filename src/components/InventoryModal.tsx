/**
 * Voxel Realms - Inventory, Crafting, Furnace & Chest Modal
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, Hammer, Flame, Box, Swords, Wrench, Layers, Sparkles } from 'lucide-react';
import { InventoryItem, CraftingRecipe } from '../types';
import { CRAFTING_RECIPES, SMELTING_RECIPES, SMELTING_FUELS } from '../game/recipes';
import { ITEM_CATALOG, createItem } from '../game/items';
import { sound } from '../game/audio';
import { ItemIcon } from './ItemIcon';
import { CharacterDoll } from './CharacterDoll';
import { SKIN_PRESETS } from '../game/skins';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: (InventoryItem | null)[];
  onUpdateInventory: (newInv: (InventoryItem | null)[]) => void;
  station: 'none' | 'workbench' | 'furnace' | 'chest';
  chestData?: { x: number; y: number; z: number; items: { itemId: string; count: number }[] };
  currentSkin?: string;
  isSlimModel?: boolean;
  onOpenSkinModal?: () => void;
  furnaceInput?: InventoryItem | null;
  furnaceFuel?: InventoryItem | null;
  furnaceOutput?: InventoryItem | null;
  onUpdateFurnaceInput?: (item: InventoryItem | null) => void;
  onUpdateFurnaceFuel?: (item: InventoryItem | null) => void;
  onUpdateFurnaceOutput?: (item: InventoryItem | null) => void;
}

type DragPayload =
  | { source: 'inv'; index: number }
  | { source: 'furnace'; slot: 'input' | 'fuel' | 'output' };

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateInventory,
  station,
  chestData,
  currentSkin,
  isSlimModel = false,
  onOpenSkinModal,
  furnaceInput: propFurnaceInput,
  furnaceFuel: propFurnaceFuel,
  furnaceOutput: propFurnaceOutput,
  onUpdateFurnaceInput,
  onUpdateFurnaceFuel,
  onUpdateFurnaceOutput,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [category, setCategory] = useState<'all' | 'tools' | 'weapons' | 'blocks' | 'armor'>('all');
  const [currentStation, setCurrentStation] = useState<'none' | 'workbench' | 'furnace' | 'chest'>(station);

  // Fallback internal furnace state if not provided externally
  const [internalFurnaceInput, setInternalFurnaceInput] = useState<InventoryItem | null>(null);
  const [internalFurnaceFuel, setInternalFurnaceFuel] = useState<InventoryItem | null>(null);
  const [internalFurnaceOutput, setInternalFurnaceOutput] = useState<InventoryItem | null>(null);

  const furnaceInput = propFurnaceInput !== undefined ? propFurnaceInput : internalFurnaceInput;
  const furnaceFuel = propFurnaceFuel !== undefined ? propFurnaceFuel : internalFurnaceFuel;
  const furnaceOutput = propFurnaceOutput !== undefined ? propFurnaceOutput : internalFurnaceOutput;

  const setFurnaceInput = (item: InventoryItem | null) => {
    if (onUpdateFurnaceInput) onUpdateFurnaceInput(item);
    else setInternalFurnaceInput(item);
  };
  const setFurnaceFuel = (item: InventoryItem | null) => {
    if (onUpdateFurnaceFuel) onUpdateFurnaceFuel(item);
    else setInternalFurnaceFuel(item);
  };
  const setFurnaceOutput = (item: InventoryItem | null) => {
    if (onUpdateFurnaceOutput) onUpdateFurnaceOutput(item);
    else setInternalFurnaceOutput(item);
  };

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DragPayload | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Smelting animation state
  const [isSmelting, setIsSmelting] = useState(false);
  const [smeltProgress, setSmeltProgress] = useState(0);

  // Sync active station with prop
  useEffect(() => {
    setCurrentStation(station);
  }, [station]);

  // Smelting recipe validation
  const matchingRecipe = furnaceInput ? SMELTING_RECIPES.find(r => r.input === furnaceInput.id) : null;
  const isSmeltable = (itemId: string): boolean => {
    return SMELTING_RECIPES.some(r => r.input === itemId);
  };
  const isFuel = (itemId: string): boolean => {
    return itemId in SMELTING_FUELS || itemId === 'coal';
  };

  const canSmelt = Boolean(
    matchingRecipe &&
    furnaceFuel &&
    isFuel(furnaceFuel.id) &&
    (!furnaceOutput || (furnaceOutput.id === matchingRecipe.output && furnaceOutput.count < furnaceOutput.maxStack))
  );

  // Cooking progress timer (1.5 seconds per smelt)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isSmelting && canSmelt) {
      timer = setInterval(() => {
        setSmeltProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 10;
        });
      }, 150);
    } else if (!canSmelt && isSmelting) {
      setIsSmelting(false);
      setSmeltProgress(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSmelting, canSmelt]);

  // Finalize smelt when reaching 100%
  useEffect(() => {
    if (smeltProgress >= 100 && isSmelting && matchingRecipe && furnaceInput && furnaceFuel) {
      const nextInput = furnaceInput.count > 1 ? { ...furnaceInput, count: furnaceInput.count - 1 } : null;
      const nextFuel = furnaceFuel.count > 1 ? { ...furnaceFuel, count: furnaceFuel.count - 1 } : null;
      const nextOutput = furnaceOutput
        ? { ...furnaceOutput, count: furnaceOutput.count + 1 }
        : createItem(matchingRecipe.output, 1);

      setFurnaceInput(nextInput);
      setFurnaceFuel(nextFuel);
      setFurnaceOutput(nextOutput);
      sound.playCraft();

      setIsSmelting(false);
      setSmeltProgress(0);
    }
  }, [smeltProgress, isSmelting, matchingRecipe, furnaceInput, furnaceFuel, furnaceOutput]);

  if (!isOpen) return null;

  // Selected item information
  const activeItem = selectedSlot !== null ? inventory[selectedSlot] : null;

  // Helper: safely add item to inventory with conservation of counts
  const addItemToInventory = (
    itemToAdd: InventoryItem,
    currentInv: (InventoryItem | null)[]
  ): { remaining: InventoryItem | null; updatedInv: (InventoryItem | null)[] } => {
    const newInv = currentInv.map(slot => (slot ? { ...slot } : null));
    let remainingCount = itemToAdd.count;

    // 1. Stack into existing slots with same id
    for (let i = 0; i < newInv.length; i++) {
      const slot = newInv[i];
      if (slot && slot.id === itemToAdd.id && slot.count < slot.maxStack) {
        const space = slot.maxStack - slot.count;
        const move = Math.min(space, remainingCount);
        slot.count += move;
        remainingCount -= move;
        if (remainingCount <= 0) {
          return { remaining: null, updatedInv: newInv };
        }
      }
    }

    // 2. Put into first empty slot
    for (let i = 0; i < newInv.length; i++) {
      if (!newInv[i]) {
        const move = Math.min(itemToAdd.maxStack, remainingCount);
        newInv[i] = { ...itemToAdd, count: move };
        remainingCount -= move;
        if (remainingCount <= 0) {
          return { remaining: null, updatedInv: newInv };
        }
      }
    }

    return {
      remaining: remainingCount > 0 ? { ...itemToAdd, count: remainingCount } : null,
      updatedInv: newInv,
    };
  };

  // Helper to parse drag event data safely
  const getDragData = (e: React.DragEvent): DragPayload | null => {
    if (draggedItem) return draggedItem;
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return null;
  };

  // ----------------------------------------------------
  // FURNACE INTERACTIONS: CLICK & DRAG
  // ----------------------------------------------------

  // Click on Furnace Input Slot
  const handleFurnaceInputClick = () => {
    // If an inventory slot is selected, deposit/stack into furnace input
    if (selectedSlot !== null) {
      const selectedItem = inventory[selectedSlot];
      if (!selectedItem) {
        // If empty slot was selected and furnace input has items, transfer to inventory
        if (furnaceInput) {
          const newInv = inventory.map(s => (s ? { ...s } : null));
          newInv[selectedSlot] = { ...furnaceInput };
          setFurnaceInput(null);
          setSelectedSlot(null);
          onUpdateInventory(newInv);
          sound.playPlaceBlock();
        }
        return;
      }

      // Check: must be smeltable
      if (!isSmeltable(selectedItem.id)) {
        return; // Only accept items that can be smelted
      }

      const newInv = inventory.map(s => (s ? { ...s } : null));

      if (!furnaceInput) {
        // Place whole stack in empty furnace input
        setFurnaceInput({ ...selectedItem });
        newInv[selectedSlot] = null;
        setSelectedSlot(null);
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else if (furnaceInput.id === selectedItem.id) {
        // Stack same item
        const space = furnaceInput.maxStack - furnaceInput.count;
        if (space <= 0) return;
        const toMove = Math.min(space, selectedItem.count);
        setFurnaceInput({ ...furnaceInput, count: furnaceInput.count + toMove });
        const remaining = selectedItem.count - toMove;
        if (remaining <= 0) {
          newInv[selectedSlot] = null;
          setSelectedSlot(null);
        } else {
          newInv[selectedSlot] = { ...selectedItem, count: remaining };
        }
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else {
        // Swap different smeltable item
        newInv[selectedSlot] = { ...furnaceInput };
        setFurnaceInput({ ...selectedItem });
        setSelectedSlot(null);
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      }
      return;
    }

    // If no inventory slot is selected, transfer furnace input back to inventory
    if (furnaceInput) {
      const { remaining, updatedInv } = addItemToInventory(furnaceInput, inventory);
      setFurnaceInput(remaining);
      onUpdateInventory(updatedInv);
      sound.playPlaceBlock();
    }
  };

  // Drop onto Furnace Input Slot
  const handleFurnaceInputDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);

    const data = getDragData(e);
    if (!data) return;

    if (data.source === 'inv') {
      const sourceItem = inventory[data.index];
      if (!sourceItem) return;

      if (!isSmeltable(sourceItem.id)) return;

      const newInv = inventory.map(s => (s ? { ...s } : null));

      if (!furnaceInput) {
        setFurnaceInput({ ...sourceItem });
        newInv[data.index] = null;
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else if (furnaceInput.id === sourceItem.id) {
        const space = furnaceInput.maxStack - furnaceInput.count;
        if (space <= 0) return;
        const toMove = Math.min(space, sourceItem.count);
        setFurnaceInput({ ...furnaceInput, count: furnaceInput.count + toMove });
        const rem = sourceItem.count - toMove;
        newInv[data.index] = rem > 0 ? { ...sourceItem, count: rem } : null;
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else {
        newInv[data.index] = { ...furnaceInput };
        setFurnaceInput({ ...sourceItem });
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      }
    }
    setDraggedItem(null);
  };

  // Click on Furnace Fuel Slot
  const handleFurnaceFuelClick = () => {
    if (selectedSlot !== null) {
      const selectedItem = inventory[selectedSlot];
      if (!selectedItem) {
        if (furnaceFuel) {
          const newInv = inventory.map(s => (s ? { ...s } : null));
          newInv[selectedSlot] = { ...furnaceFuel };
          setFurnaceFuel(null);
          setSelectedSlot(null);
          onUpdateInventory(newInv);
          sound.playPlaceBlock();
        }
        return;
      }

      if (!isFuel(selectedItem.id)) {
        return; // Only accept fuel
      }

      const newInv = inventory.map(s => (s ? { ...s } : null));

      if (!furnaceFuel) {
        setFurnaceFuel({ ...selectedItem });
        newInv[selectedSlot] = null;
        setSelectedSlot(null);
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else if (furnaceFuel.id === selectedItem.id) {
        const space = furnaceFuel.maxStack - furnaceFuel.count;
        if (space <= 0) return;
        const toMove = Math.min(space, selectedItem.count);
        setFurnaceFuel({ ...furnaceFuel, count: furnaceFuel.count + toMove });
        const remaining = selectedItem.count - toMove;
        if (remaining <= 0) {
          newInv[selectedSlot] = null;
          setSelectedSlot(null);
        } else {
          newInv[selectedSlot] = { ...selectedItem, count: remaining };
        }
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else {
        newInv[selectedSlot] = { ...furnaceFuel };
        setFurnaceFuel({ ...selectedItem });
        setSelectedSlot(null);
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      }
      return;
    }

    // Transfer back to inventory
    if (furnaceFuel) {
      const { remaining, updatedInv } = addItemToInventory(furnaceFuel, inventory);
      setFurnaceFuel(remaining);
      onUpdateInventory(updatedInv);
      sound.playPlaceBlock();
    }
  };

  // Drop onto Furnace Fuel Slot
  const handleFurnaceFuelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);

    const data = getDragData(e);
    if (!data) return;

    if (data.source === 'inv') {
      const sourceItem = inventory[data.index];
      if (!sourceItem) return;

      if (!isFuel(sourceItem.id)) return;

      const newInv = inventory.map(s => (s ? { ...s } : null));

      if (!furnaceFuel) {
        setFurnaceFuel({ ...sourceItem });
        newInv[data.index] = null;
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else if (furnaceFuel.id === sourceItem.id) {
        const space = furnaceFuel.maxStack - furnaceFuel.count;
        if (space <= 0) return;
        const toMove = Math.min(space, sourceItem.count);
        setFurnaceFuel({ ...furnaceFuel, count: furnaceFuel.count + toMove });
        const rem = sourceItem.count - toMove;
        newInv[data.index] = rem > 0 ? { ...sourceItem, count: rem } : null;
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else {
        newInv[data.index] = { ...furnaceFuel };
        setFurnaceFuel({ ...sourceItem });
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      }
    }
    setDraggedItem(null);
  };

  // Click on Furnace Output Slot (Collect smelted items to inventory)
  const handleFurnaceOutputClick = () => {
    if (!furnaceOutput) return;

    const { remaining, updatedInv } = addItemToInventory(furnaceOutput, inventory);
    setFurnaceOutput(remaining);
    onUpdateInventory(updatedInv);
    sound.playCraft();
  };

  // Smelt button click
  const handleSmelt = () => {
    if (!canSmelt || isSmelting) return;
    setSmeltProgress(0);
    setIsSmelting(true);
  };

  // ----------------------------------------------------
  // INVENTORY SLOT INTERACTIONS
  // ----------------------------------------------------

  // Handle slot clicking (move item or select)
  const handleSlotClick = (index: number) => {
    if (selectedSlot === null) {
      if (inventory[index]) {
        setSelectedSlot(index);
      }
    } else {
      if (selectedSlot === index) {
        setSelectedSlot(null);
        return;
      }

      // Swap or Stack items
      const newInv = inventory.map(s => (s ? { ...s } : null));
      const source = newInv[selectedSlot];
      const target = newInv[index];

      if (source && target && source.id === target.id && target.count < target.maxStack) {
        // Stack together
        const space = target.maxStack - target.count;
        const toMove = Math.min(space, source.count);
        target.count += toMove;
        source.count -= toMove;
        if (source.count <= 0) {
          newInv[selectedSlot] = null;
        }
      } else {
        // Swap slots
        newInv[index] = source;
        newInv[selectedSlot] = target;
      }

      onUpdateInventory(newInv);
      setSelectedSlot(null);
      sound.playPlaceBlock();
    }
  };

  // Drop onto an Inventory Slot
  const handleInventorySlotDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverTarget(null);

    const data = getDragData(e);
    if (!data) return;

    if (data.source === 'furnace') {
      let itemToMove: InventoryItem | null = null;
      if (data.slot === 'input') itemToMove = furnaceInput;
      else if (data.slot === 'fuel') itemToMove = furnaceFuel;
      else if (data.slot === 'output') itemToMove = furnaceOutput;

      if (!itemToMove) return;

      const newInv = inventory.map(s => (s ? { ...s } : null));
      const targetItem = newInv[targetIndex];

      if (!targetItem) {
        // Place into empty slot
        newInv[targetIndex] = { ...itemToMove };
        if (data.slot === 'input') setFurnaceInput(null);
        else if (data.slot === 'fuel') setFurnaceFuel(null);
        else if (data.slot === 'output') setFurnaceOutput(null);
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else if (targetItem.id === itemToMove.id && targetItem.count < targetItem.maxStack) {
        // Stack
        const space = targetItem.maxStack - targetItem.count;
        const toMove = Math.min(space, itemToMove.count);
        targetItem.count += toMove;
        const rem = itemToMove.count - toMove;
        const updated = rem > 0 ? { ...itemToMove, count: rem } : null;

        if (data.slot === 'input') setFurnaceInput(updated);
        else if (data.slot === 'fuel') setFurnaceFuel(updated);
        else if (data.slot === 'output') setFurnaceOutput(updated);
        onUpdateInventory(newInv);
        sound.playPlaceBlock();
      } else {
        // Swap if valid, or add to first free slot
        if (data.slot === 'input' && isSmeltable(targetItem.id)) {
          newInv[targetIndex] = { ...itemToMove };
          setFurnaceInput({ ...targetItem });
          onUpdateInventory(newInv);
          sound.playPlaceBlock();
        } else if (data.slot === 'fuel' && isFuel(targetItem.id)) {
          newInv[targetIndex] = { ...itemToMove };
          setFurnaceFuel({ ...targetItem });
          onUpdateInventory(newInv);
          sound.playPlaceBlock();
        } else {
          // Output slot cannot receive items, or invalid swap target: put into first available slot
          const { remaining, updatedInv } = addItemToInventory(itemToMove, inventory);
          if (data.slot === 'input') setFurnaceInput(remaining);
          else if (data.slot === 'fuel') setFurnaceFuel(remaining);
          else if (data.slot === 'output') setFurnaceOutput(remaining);
          onUpdateInventory(updatedInv);
          sound.playPlaceBlock();
        }
      }
    } else if (data.source === 'inv') {
      if (data.index === targetIndex) return;

      const newInv = inventory.map(s => (s ? { ...s } : null));
      const source = newInv[data.index];
      const target = newInv[targetIndex];

      if (!source) return;

      if (target && target.id === source.id && target.count < target.maxStack) {
        const space = target.maxStack - target.count;
        const toMove = Math.min(space, source.count);
        target.count += toMove;
        source.count -= toMove;
        if (source.count <= 0) newInv[data.index] = null;
      } else {
        newInv[targetIndex] = source;
        newInv[data.index] = target;
      }

      onUpdateInventory(newInv);
      sound.playPlaceBlock();
    }

    setDraggedItem(null);
  };

  // Check if player has required ingredients for recipe
  const canCraftRecipe = (recipe: CraftingRecipe): boolean => {
    if (recipe.requiresWorkbench && currentStation !== 'workbench') return false;

    if (recipe.ingredients) {
      for (const req of recipe.ingredients) {
        let totalCount = 0;
        for (const slot of inventory) {
          if (slot && slot.id === req.id) {
            totalCount += slot.count;
          }
        }
        if (totalCount < req.count) return false;
      }
      return true;
    }
    return false;
  };

  // Craft item from recipe
  const craftRecipe = (recipe: CraftingRecipe) => {
    if (!canCraftRecipe(recipe)) return;

    const newInv = inventory.map(s => (s ? { ...s } : null));

    // Deduct ingredients
    if (recipe.ingredients) {
      for (const req of recipe.ingredients) {
        let remaining = req.count;
        for (let i = 0; i < newInv.length; i++) {
          const slot = newInv[i];
          if (slot && slot.id === req.id) {
            const take = Math.min(remaining, slot.count);
            slot.count -= take;
            remaining -= take;
            if (slot.count <= 0) newInv[i] = null;
            if (remaining <= 0) break;
          }
        }
      }
    }

    // Add result to inventory
    const resultItem = createItem(recipe.resultId, recipe.resultCount);
    if (resultItem) {
      const { updatedInv } = addItemToInventory(resultItem, newInv);
      onUpdateInventory(updatedInv);
      sound.playCraft();
    }
  };

  // Filter recipes
  const availableRecipes = CRAFTING_RECIPES.filter(r => {
    if (currentStation !== 'workbench' && r.requiresWorkbench) return false;
    if (category === 'all') return true;
    return r.category === category;
  });

  // Drag over target helper
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div
        id="inventory-modal"
        className="relative bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-4xl p-6 shadow-2xl flex flex-col gap-6 text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {currentStation === 'workbench' && <Hammer className="w-6 h-6 text-amber-400" />}
            {currentStation === 'furnace' && <Flame className="w-6 h-6 text-orange-500" />}
            {currentStation === 'chest' && <Box className="w-6 h-6 text-yellow-600" />}
            {currentStation === 'none' && <Layers className="w-6 h-6 text-blue-400" />}

            <h2 className="text-xl font-bold tracking-tight">
              {currentStation === 'workbench' && 'Bancada de Criação (3x3)'}
              {currentStation === 'furnace' && 'Fornalha de Fundição'}
              {currentStation === 'chest' && 'Baú de Recursos'}
              {currentStation === 'none' && 'Mochila & Criação Rápida'}
            </h2>
          </div>

          {/* Station Quick Tabs & Close Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCurrentStation('none')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  currentStation === 'none' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mochila
              </button>
              <button
                type="button"
                onClick={() => setCurrentStation('workbench')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  currentStation === 'workbench' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hammer className="w-3 h-3" /> Bancada
              </button>
              <button
                type="button"
                onClick={() => setCurrentStation('furnace')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  currentStation === 'furnace' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3" /> Fornalha
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Station Specific Top Content: FURNACE INTERFACE */}
        {currentStation === 'furnace' && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-center gap-8 shadow-inner select-none">
            {/* Input Ore */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Minério / Alimento</span>
              <button
                type="button"
                id="furnace-input-slot"
                title={
                  furnaceInput
                    ? `${furnaceInput.name} (x${furnaceInput.count}) - Clique ou arraste para retirar`
                    : 'Arraste ou clique com minério fundível selecionado'
                }
                onClick={handleFurnaceInputClick}
                draggable={Boolean(furnaceInput)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'furnace', slot: 'input' }));
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedItem({ source: 'furnace', slot: 'input' });
                }}
                onDragEnd={() => {
                  setDraggedItem(null);
                  setDragOverTarget(null);
                }}
                onDragOver={(e) => handleDragOver(e, 'furnace-input')}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={handleFurnaceInputDrop}
                className={`relative w-14 h-14 bg-slate-900 border rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  dragOverTarget === 'furnace-input'
                    ? 'border-emerald-400 bg-emerald-950/40 scale-105 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                    : furnaceInput
                    ? 'border-slate-600 hover:border-amber-400 hover:scale-105'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                {furnaceInput ? (
                  <>
                    <ItemIcon item={furnaceInput} className="w-9 h-9" />
                    {furnaceInput.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-white font-mono drop-shadow">
                        {furnaceInput.count}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">Vazio</span>
                )}
              </button>
            </div>

            {/* Flame Cook Button with Progress Indicator */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                id="furnace-cook-btn"
                onClick={handleSmelt}
                disabled={!canSmelt || isSmelting}
                className={`relative overflow-hidden font-bold px-4 py-2.5 rounded-xl shadow cursor-pointer text-xs flex items-center gap-1.5 transition-all ${
                  isSmelting
                    ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : canSmelt
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)] active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSmelting && (
                  <div
                    className="absolute inset-0 bg-orange-500/50 transition-all duration-100 ease-linear"
                    style={{ width: `${smeltProgress}%` }}
                  />
                )}
                <Flame className={`w-4 h-4 relative z-10 ${isSmelting ? 'animate-bounce text-yellow-300' : ''}`} />
                <span className="relative z-10 font-pixel text-xs">
                  {isSmelting ? `Fundindo... ${Math.round(smeltProgress)}%` : 'Fundir'}
                </span>
              </button>
            </div>

            {/* Fuel */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Combustível</span>
              <button
                type="button"
                id="furnace-fuel-slot"
                title={
                  furnaceFuel
                    ? `${furnaceFuel.name} (x${furnaceFuel.count}) - Clique ou arraste para retirar`
                    : 'Arraste ou clique com combustível selecionado'
                }
                onClick={handleFurnaceFuelClick}
                draggable={Boolean(furnaceFuel)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'furnace', slot: 'fuel' }));
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedItem({ source: 'furnace', slot: 'fuel' });
                }}
                onDragEnd={() => {
                  setDraggedItem(null);
                  setDragOverTarget(null);
                }}
                onDragOver={(e) => handleDragOver(e, 'furnace-fuel')}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={handleFurnaceFuelDrop}
                className={`relative w-14 h-14 bg-slate-900 border rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  dragOverTarget === 'furnace-fuel'
                    ? 'border-emerald-400 bg-emerald-950/40 scale-105 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                    : furnaceFuel
                    ? 'border-slate-600 hover:border-amber-400 hover:scale-105'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                {furnaceFuel ? (
                  <>
                    <ItemIcon item={furnaceFuel} className="w-9 h-9" />
                    {furnaceFuel.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-white font-mono drop-shadow">
                        {furnaceFuel.count}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">Carvão</span>
                )}
              </button>
            </div>

            {/* Output Bar */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Resultado</span>
              <button
                type="button"
                id="furnace-output-slot"
                title={
                  furnaceOutput
                    ? `${furnaceOutput.name} (x${furnaceOutput.count}) - Clique para transferir ao inventário`
                    : 'Slot de saída do produto fundido'
                }
                onClick={handleFurnaceOutputClick}
                draggable={Boolean(furnaceOutput)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'furnace', slot: 'output' }));
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedItem({ source: 'furnace', slot: 'output' });
                }}
                onDragEnd={() => {
                  setDraggedItem(null);
                  setDragOverTarget(null);
                }}
                className={`relative w-14 h-14 bg-slate-900 border-2 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none ${
                  furnaceOutput
                    ? 'border-emerald-400 hover:border-emerald-300 hover:scale-105 shadow-[0_0_14px_rgba(52,211,153,0.35)]'
                    : 'border-emerald-500/50 hover:border-emerald-500'
                }`}
              >
                {furnaceOutput ? (
                  <>
                    <ItemIcon item={furnaceOutput} className="w-9 h-9" />
                    {furnaceOutput.count > 1 && (
                      <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-white font-mono drop-shadow">
                        {furnaceOutput.count}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">Pronto</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Grid & Crafting recipes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Player Inventory (36 slots) */}
          <div className="flex flex-col gap-3">
            {/* Player Character & Equipment preview (Classic Minecraft Doll) */}
            <div className="flex items-center gap-3 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <CharacterDoll
                skinDataUrl={currentSkin || SKIN_PRESETS[0].dataUrl}
                isSlim={isSlimModel}
                onOpenCustomizer={onOpenSkinModal}
                className="w-32 h-44 rounded-xl border border-slate-700/80 shrink-0"
              />

              <div className="flex-1 flex flex-col justify-between h-44 py-0.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-pixel font-bold text-yellow-400 uppercase tracking-wider">
                      Personagem
                    </span>
                    <span className="text-[10px] font-pixel text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {isSlimModel ? 'Slim (3px)' : 'Normal (4px)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Sua skin ativa acompanha seu olhar e reflete na sua mão em 1ª pessoa.
                  </p>
                </div>

                {/* Armor / Gear Slots */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  <div className="flex flex-col items-center justify-center p-1 bg-slate-950 rounded-lg border border-slate-800" title="Capacete">
                    <Shield className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="text-[8px] font-pixel text-slate-400">Elmo</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1 bg-slate-950 rounded-lg border border-slate-800" title="Peitoral">
                    <Shield className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="text-[8px] font-pixel text-slate-400">Peito</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1 bg-slate-950 rounded-lg border border-slate-800" title="Calças">
                    <Shield className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="text-[8px] font-pixel text-slate-400">Calça</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-1 bg-slate-950 rounded-lg border border-slate-800" title="Botas">
                    <Shield className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="text-[8px] font-pixel text-slate-400">Botas</span>
                  </div>
                </div>

                {onOpenSkinModal && (
                  <button
                    type="button"
                    onClick={onOpenSkinModal}
                    className="w-full text-center py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/40 text-yellow-300 font-pixel text-[10px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                    Mudar Skin / Importar PNG
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-300">
              Inventário do Jogador (Mochila)
            </h3>

            {/* 27 main backpack slots (slots 9 to 35) */}
            <div className="grid grid-cols-9 gap-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              {Array.from({ length: 27 }, (_, idx) => {
                const slotIndex = idx + 9;
                const item = inventory[slotIndex];
                const isSelected = selectedSlot === slotIndex;
                const isDragOver = dragOverTarget === `inv-${slotIndex}`;

                return (
                  <button
                    key={slotIndex}
                    id={`inv-slot-${slotIndex}`}
                    type="button"
                    onClick={() => handleSlotClick(slotIndex)}
                    draggable={Boolean(item)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'inv', index: slotIndex }));
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedItem({ source: 'inv', index: slotIndex });
                    }}
                    onDragEnd={() => {
                      setDraggedItem(null);
                      setDragOverTarget(null);
                    }}
                    onDragOver={(e) => handleDragOver(e, `inv-${slotIndex}`)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(e) => handleInventorySlotDrop(e, slotIndex)}
                    className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/25 border-2 border-amber-400 scale-105'
                        : isDragOver
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 scale-105 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                        : 'bg-slate-900/90 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {item && (
                      <ItemIcon item={item} className="w-6 h-6 sm:w-7 sm:h-7" />
                    )}
                    {item && item.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white font-mono">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hotbar Row (slots 0 to 8) */}
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs font-semibold text-amber-400">Barra de Acesso Rápido (Hotbar)</span>
              <div className="grid grid-cols-9 gap-1.5 bg-slate-950/80 p-3 rounded-2xl border-2 border-slate-700/80">
                {Array.from({ length: 9 }, (_, slotIndex) => {
                  const item = inventory[slotIndex];
                  const isSelected = selectedSlot === slotIndex;
                  const isDragOver = dragOverTarget === `inv-${slotIndex}`;

                  return (
                    <button
                      key={slotIndex}
                      id={`inv-hotbar-slot-${slotIndex}`}
                      type="button"
                      onClick={() => handleSlotClick(slotIndex)}
                      draggable={Boolean(item)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'inv', index: slotIndex }));
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedItem({ source: 'inv', index: slotIndex });
                      }}
                      onDragEnd={() => {
                        setDraggedItem(null);
                        setDragOverTarget(null);
                      }}
                      onDragOver={(e) => handleDragOver(e, `inv-${slotIndex}`)}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleInventorySlotDrop(e, slotIndex)}
                      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/25 border-2 border-amber-400 scale-105'
                          : isDragOver
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 scale-105 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                          : 'bg-slate-900/90 border border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {item && (
                        <ItemIcon item={item} className="w-6 h-6 sm:w-7 sm:h-7" />
                      )}
                      {item && item.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white font-mono">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item Details Card */}
            {activeItem && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2">
                  <ItemIcon item={activeItem} className="w-6 h-6" />
                  <span className="font-bold text-sm text-slate-100">{activeItem.name}</span>
                  <span className="text-xs text-slate-400 font-mono">x{activeItem.count}</span>
                </div>
                <p className="text-xs text-slate-300">{activeItem.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  {activeItem.attackDamage && <span>Dano: +{activeItem.attackDamage}</span>}
                  {activeItem.miningSpeed && <span>Velocidade: {activeItem.miningSpeed}x</span>}
                  {activeItem.armorDefense && <span>Defesa: +{activeItem.armorDefense}</span>}
                  {activeItem.foodValue && <span>Nutrição: +{activeItem.foodValue}</span>}
                  {activeItem.durability && <span>Durabilidade: {activeItem.durability}/{activeItem.maxDurability}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Recipe Book & Quick Crafting */}
          <div className="flex flex-col gap-3">
            {/* Category tabs */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${category === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Tudo
              </button>
              <button
                type="button"
                onClick={() => setCategory('tools')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${category === 'tools' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Wrench className="w-3.5 h-3.5" /> Ferramentas
              </button>
              <button
                type="button"
                onClick={() => setCategory('weapons')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${category === 'weapons' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Swords className="w-3.5 h-3.5" /> Armas
              </button>
              <button
                type="button"
                onClick={() => setCategory('armor')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${category === 'armor' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Shield className="w-3.5 h-3.5" /> Armadura
              </button>
              <button
                type="button"
                onClick={() => setCategory('blocks')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${category === 'blocks' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Box className="w-3.5 h-3.5" /> Blocos
              </button>
            </div>

            {/* Recipes List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
              {availableRecipes.map(recipe => {
                const result = ITEM_CATALOG[recipe.resultId];
                if (!result) return null;
                const canCraft = canCraftRecipe(recipe);

                return (
                  <div
                    key={recipe.id}
                    id={`recipe-${recipe.id}`}
                    className={`bg-slate-950/70 border rounded-2xl p-3 flex items-center justify-between gap-3 transition-colors ${
                      canCraft
                        ? 'border-slate-700 hover:border-amber-400/60'
                        : 'border-slate-800 opacity-60'
                    }`}
                  >
                    {/* Item icon & name */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow">
                        <ItemIcon item={result} className="w-7 h-7" />
                        {recipe.resultCount > 1 && (
                          <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white font-mono drop-shadow">
                            {recipe.resultCount}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs sm:text-sm text-slate-100">
                          {result.name}
                        </span>
                        {/* Required materials */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {recipe.ingredients?.map((ing, idx) => {
                            const ingItem = ITEM_CATALOG[ing.id];
                            return (
                              <span key={idx}>
                                {ing.count}x {ingItem?.name || ing.id}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Craft button */}
                    <button
                      type="button"
                      onClick={() => craftRecipe(recipe)}
                      disabled={!canCraft}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        canCraft
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Fabricar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
