import { useGameStore, MenuStatus } from "../store/GameStore";
import { HomeUI } from "./HomeUI";
import { HudUI } from "./HudUI";
import { InventoryUI } from "./InventoryUI";
import { MapUI } from "./MapUI";

function UI() {
  const { menuStatus } = useGameStore();
  const getDisplay = () => {
    {
      switch (menuStatus) {
        case MenuStatus.Home:
          return <HomeUI />;
        case MenuStatus.Playing:
          return <HudUI />;
        case MenuStatus.Inventory:
          return (
            <>
              <HudUI />
              <InventoryUI />
            </>
          );
        case MenuStatus.Map:
          return <MapUI />;
      }
    }
  };

  return <div id="ui">{getDisplay()}</div>;
}

export default UI;
