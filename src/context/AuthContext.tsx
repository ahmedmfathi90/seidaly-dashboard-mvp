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
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSeenLanding, setHasSeenLanding] = useState(false);

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
