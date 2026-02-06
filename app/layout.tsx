// app/layout.tsx
import 'antd/dist/reset.css'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';
import AntdProvider from './AntdProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Taller Mecánico',
  description: 'Sistema de gestión de taller mecánico',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <AntdProvider>
          {children}
          </AntdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}