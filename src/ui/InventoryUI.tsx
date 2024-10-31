// ui/InventoryUI.tsx
import React from 'react';
import { usePlayerStore } from '../store/PlayerStore';
import { useGameStore } from '../store/GameStore';

export const InventoryUI: React.FC = () => {
  const { buildPreset, setBuildPreset } = usePlayerStore();
  const { isInventoryVisible } = useGameStore();

  return (
    isInventoryVisible && <div id="inventory-ui">
      {/* Inventory items */}
      <button onClick={() => setBuildPreset('preset1')}>Preset 1</button>
      <button onClick={() => setBuildPreset('preset2')}>Preset 2</button>
      {/* Additional inventory controls */}
    </div>
  );
};