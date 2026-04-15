import React from 'react';
import { useAuthStore } from './store/authStore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const { token } = useAuthStore();

  return (
    <div className="min-h-screen font-sans">
      {!token ? <Login /> : <Dashboard />}
    </div>
  );
}
