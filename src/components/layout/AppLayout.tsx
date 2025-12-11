'use client';

import { Layout, Menu, Button, Dropdown, Avatar, Space } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const { Header, Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
  user?: any;
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link href="/">Home</Link>,
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: <Link href="/reports">Reports</Link>,
    },
    {
      key: '/projects',
      icon: <FolderOutlined />,
      label: <Link href="/projects">Projects</Link>,
    },
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: <Link href="/admin">Admin</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#001529',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            Kazinex Reports
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none' }}
          />
        </div>

        {user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ color: 'white', height: '64px' }}>
              <Space>
                <Avatar icon={<UserOutlined />} />
                {user.email}
              </Space>
            </Button>
          </Dropdown>
        )}
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>{children}</div>
      </Content>
    </Layout>
  );
}
