import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  userName: string;
  setUserName: (name: string) => void;
  userAge: string;
  setUserAge: (age: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (val: boolean) => void;
  hasSeenLanding: boolean;
  setHasSeenLanding: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  userName: '',
  setUserName: () => {},
  userAge: '',
  setUserAge: () => {},
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  hasSeenLanding: false,
  setHasSeenLanding: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState(() => localStorage.getItem('seidaly_userName') || '');
  const [userAge, setUserAge] = useState(() => localStorage.getItem('seidaly_userAge') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('seidaly_isLoggedIn') === 'true');
  const [hasSeenLanding, setHasSeenLanding] = useState(() => localStorage.getItem('seidaly_hasSeenLanding') === 'true');

  // Sync state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('seidaly_userName', userName);
  }, [userName]);

  React.useEffect(() => {
    localStorage.setItem('seidaly_userAge', userAge);
  }, [userAge]);

  React.useEffect(() => {
    localStorage.setItem('seidaly_isLoggedIn', isLoggedIn.toString());
  }, [isLoggedIn]);

  React.useEffect(() => {
    localStorage.setItem('seidaly_hasSeenLanding', hasSeenLanding.toString());
  }, [hasSeenLanding]);

  return (
    <AuthContext.Provider value={{ 
      userName, setUserName, 
      userAge, setUserAge,
      isLoggedIn, setIsLoggedIn,
      hasSeenLanding, setHasSeenLanding
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
