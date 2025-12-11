import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { getCurrentUser } from '@/lib/auth';
import AppLayout from '@/components/layout/AppLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kazinex Unified Reports',
  description: 'Enterprise reporting platform for Kazinex',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1890ff',
                borderRadius: 6,
              },
            }}
          >
            {user ? <AppLayout user={user}>{children}</AppLayout> : children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
