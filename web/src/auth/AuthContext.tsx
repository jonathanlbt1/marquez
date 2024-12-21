// src/auth/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { OktaAuth } from '@okta/okta-auth-js';

export const oktaAuth = new OktaAuth({
    issuer: 'https://dev-69669788.okta.com/oauth2/default',
    clientId: '0oalk71pjg6D7yJt75d7',
    redirectUri: 'http://localhost:3000/login/callback',
    scopes: ['openid', 'profile', 'email'],
    pkce: true, 
    tokenManager: {
      storage: 'localStorage'
    }
});

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  oktaAuth: OktaAuth;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Add this
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      const authenticated = await oktaAuth.isAuthenticated();
      if (authenticated) {
        const user = await oktaAuth.getUser();
        setUser(user);
      }
      setIsAuthenticated(authenticated);
      console.log('Auth state:', { authenticated, user }); // Debug log
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    console.log('Starting login redirect...');
    try {
      await oktaAuth.signInWithRedirect();
      console.log('Redirect initiated');
    } catch (error) {
      console.error('Login redirect failed:', error);
    }
  };

  const logout = async () => {
    await oktaAuth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, oktaAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};