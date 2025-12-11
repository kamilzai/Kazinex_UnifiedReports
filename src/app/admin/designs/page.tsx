import { Typography, Button, Card, Table, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, CopyOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import type { ReportDesign } from '@/types/database.types';

const { Title } = Typography;

export default async function AdminDesignsPage() {
  await requireAdmin();
  
  const supabase = await createClient();

  // Fetch all designs
  const { data: designs, error } = await supabase
    .from('report_designs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching designs:', error);
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ReportDesign) => (
        <Link href={`/admin/designs/${record.id}`}>
          <strong>{text}</strong>
        </Link>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: ReportDesign) => (
        <Space>
          <Link href={`/admin/designs/${record.id}/edit`}>
            <Button type="link" icon={<EditOutlined />} size="small">
              Edit
            </Button>
          </Link>
          <Link href={`/admin/designs/${record.id}/preview`}>
            <Button type="link" icon={<EyeOutlined />} size="small">
              Preview
            </Button>
          </Link>
          <Button type="link" icon={<CopyOutlined />} size="small">
            Clone
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Report Designs
        </Title>
        <Link href="/admin/designs/new">
          <Button type="primary" icon={<PlusOutlined />} size="large">
            New Design
          </Button>
        </Link>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={designs || []}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} designs`,
          }}
        />
      </Card>
    </div>
  );
}
