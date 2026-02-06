'use client';

import { ConfigProvider, theme } from 'antd';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#e10600', // rojo Motoroom
          colorBgBase: '#0f0f0f',
          colorBgContainer: '#1f1f1f',
          colorText: '#ffffff',
          colorBorder: '#2a2a2a',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
