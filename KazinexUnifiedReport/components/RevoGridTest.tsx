import * as React from 'react';

interface TestGridProps {
  width?: number;
  height?: number;
}

interface TestRow {
  id: number;
  name: string;
  value: string;
  description?: string;
}

/**
 * RevoGrid Test Component
 * 
 * Purpose: Validate RevoGrid integration and features for Day 1 research
 * 
 * Note: Using simplified version for initial testing. 
 * RevoGrid React wrapper has ESM module issues with PCF Webpack config.
 * Will test core functionality first, then integrate proper React wrapper.
 * 
 * Features to Test:
 * - Basic rendering
 * - Data display
 * - React integration
 * - PCF lifecycle
 */
export const RevoGridTest: React.FC<TestGridProps> = ({ 
  width = 800, 
  height = 600 
}) => {
  // Test data - start simple
  const rows: TestRow[] = React.useMemo(() => {
    const data: TestRow[] = [];
    for (let i = 1; i <= 100; i++) {
      data.push({
        id: i,
        name: `Test Row ${i}`,
        value: `Value ${i}`,
        description: `This is a test description for row ${i}`
      });
    }
    return data;
  }, []);

  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
          ✅ Kazinex Unified Report - Day 1 Research Phase
        </h2>
        <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
          <strong>Status:</strong> PCF Control successfully initialized with React!
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#0078d4' }}>
          Setup Complete ✅
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>RevoGrid Packages:</strong> v4.19.4 installed</li>
          <li><strong>React Integration:</strong> Working with createRoot</li>
          <li><strong>PCF Lifecycle:</strong> init() and updateView() configured</li>
          <li><strong>TypeScript:</strong> Compiling successfully</li>
          <li><strong>Test Data:</strong> {rows.length} rows generated</li>
        </ul>
      </div>

      <div style={{ 
        backgroundColor: '#fff3cd',
        padding: '15px',
        borderRadius: '8px',
        borderLeft: '4px solid #ffc107',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
          🔧 Next Steps for Day 1 Research
        </h4>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Configure Webpack to support RevoGrid ESM modules</li>
          <li>Integrate RevoGrid React wrapper properly</li>
          <li>Test basic rendering and column configuration</li>
          <li>Validate Excel copy/paste functionality</li>
          <li>Test keyboard navigation</li>
          <li>Performance benchmarking with 1000+ rows</li>
        </ol>
      </div>

      <div style={{ 
        backgroundColor: '#e3f2fd',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
          📊 Sample Data Preview (First 10 rows)
        </h4>
        <table style={{ 
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#1976d2', color: 'white' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Value</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row) => (
              <tr key={row.id}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.id}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.name}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.value}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ 
          marginTop: '10px', 
          fontSize: '11px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Showing 10 of {rows.length} test rows
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#d4edda',
        padding: '15px',
        borderRadius: '8px',
        borderLeft: '4px solid #28a745'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>
          ✅ Milestone Achieved
        </h4>
        <p style={{ margin: 0, lineHeight: '1.6', color: '#155724' }}>
          <strong>PCF Control with React is live!</strong><br />
          The foundation is solid. Ready to integrate RevoGrid web components 
          and begin feature validation testing.
        </p>
      </div>
    </div>
  );
};
