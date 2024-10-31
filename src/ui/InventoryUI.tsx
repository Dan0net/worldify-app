// ui/InventoryUI.tsx
import React from "react";
import { usePlayerStore } from "../store/PlayerStore";
import { MenuStatus, useGameStore } from "../store/GameStore";

export const InventoryUI: React.FC = () => {
  const handleClickOutside = (e) => {
    e.stopPropagation();
    useGameStore.setState({ menuStatus: MenuStatus.Playing });
    console.log('a')
  }

  const handleClickInside = (e) => {
    e.stopPropagation();
    console.log('b')
  }

  return (
    (
      <div id="inventory-ui" onMouseDown={handleClickOutside}>
        <div id="inventory-ui-container">
          <div className="inventory-window" onMouseDown={handleClickInside}>
            {/* Inventory items */}
            <button>Preset 1</button>
            <button>Preset 2</button>
            {/* Additional inventory controls */}
          </div>
        </div>
      </div>
    )
  );
};
