// ui/LoginUI.tsx
import React, { useState } from 'react';
import { useSessionStore } from '../store/SessionStore';
import { API } from '../api/API';

export const LoginUI: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { setJwtToken } = useSessionStore();
  const api = new API();

  const handleLogin = async () => {
    const token = await api.login(username, password);
    setJwtToken(token);
  };

  const handleRegister = async () => {
    const token = await api.register(username, password);
    setJwtToken(token);
  };

  return (
    <div id="login-ui">
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
    </div>
  );
};