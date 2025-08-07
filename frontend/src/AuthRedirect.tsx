import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  staffId?: string;
}

interface AuthRedirectProps {
  user: User | null;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  return null; // This component doesn't render anything, it just handles redirection
};

export default AuthRedirect;
