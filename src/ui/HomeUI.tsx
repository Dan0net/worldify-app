// ui/HomeUI.tsx
import React, { useState } from "react";
import { LoginUI } from "./LoginUI";
import { SettingUI } from "./SettingsUI";
import { MenuStatus, useGameStore } from "../store/GameStore";

export const HomeUI: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { menuStatus } = useGameStore();

  const handleStart = (e) => {
    e.stopPropagation();
    useGameStore.setState({ menuStatus: MenuStatus.Playing });
  };

  const handleShowSettings = (isShowSettings: boolean): void => {
    // Implement pointer lock initiation
    setShowSettings(isShowSettings);
  };

  return (
    <div id="home-ui">
      <div id="blur"></div>
      <div id="home-ui-container">
        <div>
          {/* <p id="title">W<span>🌍</span>rldify 🤯</p> */}
          <div className="button-container">
            {!showSettings ? (
              <>
                <button
                  onClick={handleStart}
                  className="button"
                  id="start-button"
                >
                  W<span>🌍</span>rldify 🤯
                </button>
                <button
                  onClick={handleStart}
                  className="button"
                  id="settings-button"
                >
                  Settings
                </button>
                <LoginUI />
              </>
            ) : (
              <>
                <SettingUI />
                <button
                  onClick={() => handleShowSettings(false)}
                  className="back-button button"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
