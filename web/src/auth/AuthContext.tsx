// src/auth/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { OktaAuth } from '@okta/okta-auth-js';

export const oktaAuth = new OktaAuth({
    issuer: process.env.REACT_APP_OKTA_ISSUER || 'https://dev-69669788.okta.com/oauth2/default',
    clientId: process.env.REACT_APP_OKTA_CLIENT_ID || '0oalk71pjg6D7yJt75d7',
    redirectUri: window.location.origin + '/login/callback',
    scopes: ['openid', 'profile', 'email'],
    pkce: true // PKCE flow for SPA security
});
  

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  oktaAuth: OktaAuth;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const authenticated = await oktaAuth.isAuthenticated();
    if (authenticated) {
      const user = await oktaAuth.getUser();
      setUser(user);
    }
    setIsAuthenticated(authenticated);
  };

  const login = async () => {
    await oktaAuth.signInWithRedirect();
  };

  const logout = async () => {
    await oktaAuth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, oktaAuth }}>
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