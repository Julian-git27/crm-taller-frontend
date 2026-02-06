// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // No autenticado, redirigir al login
        router.replace('/login');
      } else {
        // Ya autenticado, redirigir según rol
        if (user.rol === 'MECANICO') {
          router.replace('/mi-trabajo');
        } else if (user.rol === 'VENDEDOR') {
          router.replace('/dashboard');
        } else {
          // Rol desconocido, redirigir al login
          router.replace('/login');
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" />
      <div style={{ marginLeft: 16 }}>Redirigiendo...</div>
    </div>
  );
}