import { Typography, Card, Row, Col, Space, Button } from 'antd';
import {
  FileTextOutlined,
  AppstoreOutlined,
  UserOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const { Title, Paragraph } = Typography;

export default async function AdminPage() {
  await requireAdmin();

  const supabase = await createClient();

  // Fetch counts
  const [designsCount, projectsCount, usersCount] = await Promise.all([
    supabase.from('report_designs').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('user_roles').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div>
      <Title level={2}>Admin Dashboard</Title>
      <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
        Manage report designs, users, and system settings
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                {designsCount.count || 0}
              </Title>
              <Paragraph type="secondary">Report Designs</Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <AppstoreOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                {projectsCount.count || 0}
              </Title>
              <Paragraph type="secondary">Projects</Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: '32px', color: '#faad14' }} />
              <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                {usersCount.count || 0}
              </Title>
              <Paragraph type="secondary">Users</Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <BarChartOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
              <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                0
              </Title>
              <Paragraph type="secondary">Active Reports</Paragraph>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Quick Actions">
        <Space size="middle" wrap>
          <Link href="/admin/designs">
            <Button type="primary" icon={<FileTextOutlined />} size="large">
              Manage Designs
            </Button>
          </Link>
          <Link href="/admin/designs/new">
            <Button icon={<FileTextOutlined />} size="large">
              Create New Design
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button icon={<UserOutlined />} size="large">
              Manage Users
            </Button>
          </Link>
        </Space>
      </Card>
    </div>
  );
}
