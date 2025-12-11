import { Typography, Button, Card, Row, Col, Space } from 'antd';
import { FileTextOutlined, PlusOutlined, FolderOutlined, BarChartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { getCurrentUser, getUserRole } from '@/lib/auth';

const { Title, Paragraph } = Typography;

export default async function HomePage() {
  const user = await getCurrentUser();
  const userRole = user ? await getUserRole(user.id) : null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={1}>Welcome back!</Title>
          <Paragraph type="secondary" style={{ fontSize: '16px' }}>
            {user?.email} • Role: {userRole || 'N/A'}
          </Paragraph>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                  0
                </Title>
                <Paragraph type="secondary">My Reports</Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <FolderOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                  0
                </Title>
                <Paragraph type="secondary">Projects</Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <BarChartOutlined style={{ fontSize: '32px', color: '#faad14' }} />
                <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                  0
                </Title>
                <Paragraph type="secondary">Completed</Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
                  0
                </Title>
                <Paragraph type="secondary">This Month</Paragraph>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <Space size="middle" wrap>
            <Link href="/reports/new">
              <Button type="primary" icon={<PlusOutlined />} size="large">
                New Report
              </Button>
            </Link>
            <Link href="/reports">
              <Button icon={<FileTextOutlined />} size="large">
                View All Reports
              </Button>
            </Link>
            <Link href="/admin">
              <Button icon={<FolderOutlined />} size="large">
                Admin Panel
              </Button>
            </Link>
          </Space>
        </Card>

        {/* Recent Reports */}
        <Card title="Recent Reports">
          <Paragraph type="secondary" style={{ textAlign: 'center', padding: '48px' }}>
            No recent reports. Create your first report to get started!
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
}
