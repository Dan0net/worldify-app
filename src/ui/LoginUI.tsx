// ui/LoginUI.tsx
import React, { useState } from 'react';
import { useSessionStore } from '../store/SessionStore';
import { API } from '../api/API';

export const LoginUI: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const { setSession, unsetSession, isLoggedIn, userEmail } = useSessionStore();
  const [errorMessage, setErrorMessage] = useState('');

  const api = new API();

  const handleLogin = async () => {
    handleAuth(true)
  };

  const handleRegister = async () => {
    handleAuth(false)
  };

  const handleAuth = async (isLogin = true) => {
    setErrorMessage(''); // Clear previous errors
    try {
      const userData = await api.authenticateUser(emailInput, password, isLogin);
      setSession(userData);
      // Proceed to the next step in your app
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleLogout = () => {
    unsetSession();
    setEmailInput('');
    setPassword('');
  }

  return (
    <div id="login-ui">
      {!isLoggedIn ? (
        <>
        <form onSubmit={(e) => e.preventDefault()}>
          <input 
            value={emailInput} 
            onChange={(e) => setEmailInput(e.target.value)} 
            placeholder="Email" 
            type="Email"
            autoComplete="email" 
            required
            />
            <input 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            type="password" 
            autoComplete="password" 
            required
            />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleRegister}>Register</button>
          </form>
        </>
      ) : (
        <>
          <p>{userEmail}</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
};