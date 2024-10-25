import { HomeUI } from "./HomeUI";
import { HudUI } from "./HudUI";

function UI() {
  return (
    <div id='ui'>
      <HomeUI />
      <HudUI />
      {/* The 3D canvas covers the entire webpage and is managed separately */}
    </div>
  );
}

export default UI
