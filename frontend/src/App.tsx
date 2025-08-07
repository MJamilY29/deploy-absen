import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import LoginPage from './LoginPage';
import AdminDashboard from './AdminDashboard';
import AuthRedirect from './AuthRedirect';
import MainApp from './MainApp'; // Import MainApp
import Layout from './Layout'; // Import Layout

// Keep User interface as it is used in App.tsx
interface User {
  id: string; // Changed from number
  username: string;
  role: 'admin' | 'staff';
  staffId?: string;
  name: string; // Changed from number
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const renderMainApp = () => {
    if (user && user.role === 'staff') {
      return <MainApp user={user} onLogout={handleLogout} />;
    }
    return null;
  };

  const renderAdminDashboard = () => {
    if (user && user.role === 'admin') {
      return <AdminDashboard onLogout={handleLogout} />;
    }
    return null;
  };

  return (
    <Router>
      <AuthRedirect user={user} />
      <Layout> {/* Wrap Routes with Layout */}
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/" element={renderMainApp()} />
          <Route path="/admin" element={renderAdminDashboard()} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
