/**
 * ProjectSelector Component
 * 
 * Step 1 of copy dialog - Project selection
 * Features:
 * - Radio button list of projects
 * - Shows project name and slice count
 * - Empty state if no projects found
 * - Loading state
 */

import * as React from 'react';

export interface ProjectSelectorProps {
  projects: Array<{
    projectId: string;
    projectCode?: string;
    projectName?: string;
    sliceCount: number;
  }>;
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  isLoading: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  onProjectSelect,
  isLoading
}) => {
  
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📁</div>
          <div style={styles.emptyTitle}>No Projects Found</div>
          <div style={styles.emptyMessage}>
            No projects with compatible report slices were found.
            <br />
            Check your access permissions or try a different report design.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Select a Project</h3>
        <p style={styles.subtitle}>
          Choose the project containing the slice you want to copy from
        </p>
      </div>
      
      <div style={styles.list}>
        {projects.map((project) => {
          const isSelected = selectedProject === project.projectId;
          const displayName = project.projectName || project.projectCode || 'Unnamed Project';
          
          return (
            <div
              key={project.projectId}
              style={{
                ...styles.projectItem,
                ...(isSelected ? styles.projectItemSelected : {})
              }}
              onClick={() => onProjectSelect(project.projectId)}
            >
              <div style={styles.radioContainer}>
                <div style={{
                  ...styles.radio,
                  ...(isSelected ? styles.radioSelected : {})
                }}>
                  {isSelected && <div style={styles.radioDot} />}
                </div>
              </div>
              
              <div style={styles.projectInfo}>
                <div style={styles.projectName}>{displayName}</div>
                <div style={styles.sliceCount}>
                  {project.sliceCount} {project.sliceCount === 1 ? 'slice' : 'slices'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 300
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#605e5c',
    fontSize: 14
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 40
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 8
  },
  emptyMessage: {
    fontSize: 13,
    color: '#605e5c',
    textAlign: 'center',
    lineHeight: 1.5
  },
  header: {
    marginBottom: 16
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 4
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#605e5c'
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid #edebe9',
    borderRadius: 4
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #edebe9',
    transition: 'background-color 0.1s'
  },
  projectItemSelected: {
    backgroundColor: '#f3f2f1'
  },
  radioContainer: {
    marginRight: 12
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '2px solid #605e5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.1s'
  },
  radioSelected: {
    borderColor: '#0078d4'
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#0078d4'
  },
  projectInfo: {
    flex: 1
  },
  projectName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 2
  },
  sliceCount: {
    fontSize: 12,
    color: '#605e5c'
  }
};
