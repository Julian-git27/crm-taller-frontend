// context/AuthContext.tsx - VERSIÓN CORREGIDA
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  rol: 'VENDEDOR' | 'MECANICO';
  mecanicoId: number | null;
  nombreMecanico: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Solo ejecutar en cliente
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // IMPORTANTE: Añadir datos extras de localStorage al usuario
          if (parsedUser.rol === 'MECANICO') {
            const mecanicoId = localStorage.getItem('mecanicoId');
            const nombreMecanico = localStorage.getItem('nombreMecanico');
            
            parsedUser.mecanicoId = mecanicoId ? Number(mecanicoId) : null;
            parsedUser.nombreMecanico = nombreMecanico;
          }
          
          setToken(storedToken);
          setUser(parsedUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.clear();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      const { access_token, user: userData } = response.data;
      
      // Asegurar que el objeto usuario tenga todos los campos
      const userWithDetails = { ...userData };
      
      if (userWithDetails.rol === 'MECANICO') {
        userWithDetails.mecanicoId = userData.mecanicoId || null;
        userWithDetails.nombreMecanico = userData.nombreMecanico || null;
        
        localStorage.setItem('mecanicoId', userWithDetails.mecanicoId?.toString() || '');
        localStorage.setItem('nombreMecanico', userWithDetails.nombreMecanico || '');
      } else {
        // Limpiar datos de mecánico si no lo es
        userWithDetails.mecanicoId = null;
        userWithDetails.nombreMecanico = null;
        localStorage.removeItem('mecanicoId');
        localStorage.removeItem('nombreMecanico');
      }
      
      // Guardar en localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userWithDetails));
      localStorage.setItem('rol', userWithDetails.rol);
      
      // Configurar axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Actualizar estado
      setToken(access_token);
      setUser(userWithDetails);
      
      // Redirigir según rol
      if (userWithDetails.rol === 'MECANICO') {
        router.push('/mi-trabajo');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Credenciales inválidas');
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};