// ui/SettingUI.tsx
import React from 'react';
import { useSettingStore } from '../store/SettingStore';

export const SettingUI: React.FC = () => {
  const { viewDistance, setViewDistance } = useSettingStore();

  return (
    <div id="setting-ui">
      <label>
        View Distance:
        <input
          type="range"
          min="1"
          max="100"
          value={viewDistance}
          onChange={(e) => setViewDistance(Number(e.target.value))}
        />
      </label>
      {/* Additional settings */}
    </div>
  );
};