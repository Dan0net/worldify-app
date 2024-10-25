// ui/HomeUI.tsx
import React, { useState } from 'react';
import { LoginUI } from './LoginUI';
import { SettingUI } from './SettingsUI';

export const HomeUI: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  const handleStart = () => {
    // Implement pointer lock initiation
  };

  const handleShowSettings = (isShowSettings: boolean): void => {
    // Implement pointer lock initiation
    setShowSettings(isShowSettings);
  };

  return (
    <div id="home-ui">
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