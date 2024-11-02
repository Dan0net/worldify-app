// ui/InventoryUI.tsx
import React, { useEffect, useState } from "react";
import { usePlayerStore } from "../store/PlayerStore";
import { MenuStatus, useGameStore } from "../store/GameStore";
import { BuildPresets } from "../builder/BuildPresets";
import { MatterialPallet } from "../material/MaterialPallet";

export const InventoryUI: React.FC = () => {
  const [pallet, setPallet] = useState([]);
  const { buildPreset, setBuildPreset } = usePlayerStore();
  const { buildMaterial, setBuildMaterial } = usePlayerStore();

  const handleClickOutside = (e) => {
    e.stopPropagation();
    useGameStore.setState({ menuStatus: MenuStatus.Playing });
  };

  const handleClickInside = (e) => {
    e.stopPropagation();
  };

  const handleClickShape = (e, shapeIndex) => {
    e.stopPropagation();
    setBuildPreset(shapeIndex);
  };

  const handleClickMaterial = (e, material) => {
    e.stopPropagation();
    setBuildMaterial(material)
  };

  useEffect(() => {
    MatterialPallet.getPallet().then((res) => {
      setPallet(res.materials);
    });
  }, []);

  return (
    <div id="inventory-ui" onMouseDown={handleClickOutside}>
      <div id="inventory-ui-container">
        <div className="inventory-window" onMouseDown={handleClickInside}>
          <div className="ui-title">Buildify</div>
          <div className="inventory-panel-container">
            <div className="inventory-panel">
              <div className="inventory-panel-title">Shape</div>
              <div className="inventory-panel-contents">
                {BuildPresets.map((buildConfig, index) => (
                  <div
                    className={"inventory-panel-item " + (buildPreset === index ? 'active' : '')}
                    key={buildConfig.name}
                    onMouseDown={(e) => handleClickShape(e, index)}
                  >
                    <p>{buildConfig.name}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="inventory-panel">
              <div className="inventory-panel-title">Material</div>
              <div className="inventory-panel-contents">
                {pallet.map((material) => (
                  <div
                    className={"inventory-panel-item " + (buildMaterial === material ? 'active' : '')}
                    key={material}
                    onMouseDown={(e) => handleClickMaterial(e, material)}
                  >
                    <p>{material}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="inventory-panel">
              <div className="inventory-panel-title">Config</div>
              <div className="inventory-panel-contents"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
