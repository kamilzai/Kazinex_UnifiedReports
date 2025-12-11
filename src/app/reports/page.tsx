import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function ReportsPage() {
  return (
    <div style={{ padding: '48px' }}>
      <Title level={2}>All Reports</Title>
      <Paragraph>Reports list will be displayed here.</Paragraph>
    </div>
  );
}
