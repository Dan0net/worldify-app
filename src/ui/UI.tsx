import { useGameStore, MenuStatus } from "../store/GameStore";
import { HomeUI } from "./HomeUI";
import { HudUI } from "./HudUI";
import { InventoryUI } from "./InventoryUI";

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
          return <InventoryUI />;
      }
    }
  };

  return <div id="ui">{getDisplay()}</div>;
}

export default UI;
