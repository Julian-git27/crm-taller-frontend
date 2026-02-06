'use client';

import { ConfigProvider, theme } from 'antd';

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgBase: '#141414',
          colorBgContainer: '#1f1f1f',
          colorBorder: '#2a2a2a',
          colorText: '#e6e6e6',
          colorTextSecondary: '#9ca3af',
          borderRadius: 14,
        },
        components: {
          Card: {
            colorBgContainer: '#1f1f1f',
          },
          Table: {
            colorBgContainer: '#1f1f1f',
            headerBg: '#141414',
          },
          Modal: {
            contentBg: '#1f1f1f',
            headerBg: '#1f1f1f',
          },
          Input: {
            colorBgContainer: '#141414',
          },
          Select: {
            colorBgContainer: '#141414',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
