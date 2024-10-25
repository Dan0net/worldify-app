// ui/HomeUI.tsx
import React, { useState } from 'react';
import { LoginUI } from './LoginUI';
import { SettingUI } from './SettingsUI';
import { useGameStore } from '../store/GameStore';

export const HomeUI: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const {hasStarted, setHasStarted} = useGameStore();

  const handleStart = () => {
    console.log(hasStarted)
    setHasStarted(true);
  };

  const handleShowSettings = (isShowSettings: boolean): void => {
    // Implement pointer lock initiation
    setShowSettings(isShowSettings);
  };

  return (
    <div id="home-ui" hidden={hasStarted}>
      <div id='blur'></div>
      <div id='home-ui-container'>
      <div className='button-container'>
        {!showSettings ? 
          <>
            <button onClick={handleStart} className='button' id='continue-button'>Continue</button>
            <button onClick={handleStart} className='button' id='start-button'>Start</button>
            <button onClick={() => handleShowSettings(true)} className='button' id='settings-button'>Settings</button>
            <LoginUI />
            </>
          :
          <>
            <SettingUI />
            <button onClick={() => handleShowSettings(false)} className='back-button button'>Back</button>
          </>
        }
        </div>
      </div>
    </div>
  );
};