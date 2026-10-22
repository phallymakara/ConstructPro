import type { ProjectStatus, ProjectTask } from '../models/types';

export const getStatusFallbackProgress = (status: ProjectStatus | string): number => {
  switch (status) {
    case 'Inquiry': return 0;
    case 'Discussion': return 5;
    case 'Draft': return 5;
    case 'Quotation': return 15;
    case 'Negotiation': return 20;
    case 'Accepted': return 25;
    case 'Approved': return 25;
    case 'Closed Won': return 100;
    case 'Closed Lost': return 0;
    case 'Starting': return 0;
    case 'In Progress':
    case 'Inprogress': return 35;
    case 'Overdue': return 50;
    case 'Material Preparation': return 45;
    case 'Production': return 65;
    case 'Ready for Delivery': return 85;
    case 'Installation': return 95;
    case 'Completed': return 100;
    case 'Cancelled':
    case 'Canceled': return 0;
    default: return 0;
  }
};

export const getProjectTasks = (projectId: number | string): ProjectTask[] => {
  try {
    const raw = localStorage.getItem(`project_tasks_${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const saveProjectTasks = (projectId: number | string, tasks: ProjectTask[]): void => {
  try {
    localStorage.setItem(`project_tasks_${projectId}`, JSON.stringify(tasks));
  } catch {}
};

export interface TaskProgressMetrics {
  percent: number;
  completedUnits: number;
  totalUnits: number;
  hasTasks: boolean;
}

/**
 * Calculates project progress by counting overall tasks and subtasks.
 * If tasks exist: counts completed subtasks / total subtasks (or 1 unit per task without subtasks).
 * If no tasks exist: falls back to the status selection mapping.
 */
export const calculateProjectTaskProgress = (
  tasks: ProjectTask[],
  fallbackStatus?: ProjectStatus | string
): TaskProgressMetrics => {
  if (!tasks || tasks.length === 0) {
    const fallback = fallbackStatus ? getStatusFallbackProgress(fallbackStatus) : 0;
    return {
      percent: fallback,
      completedUnits: 0,
      totalUnits: 0,
      hasTasks: false,
    };
  }

  let totalUnits = 0;
  let earnedUnits = 0;
  let fullyCompletedUnits = 0;

  for (const t of tasks) {
    if (t.subtasks && t.subtasks.length > 0) {
      totalUnits += t.subtasks.length;
      for (const st of t.subtasks) {
        const val = typeof st.progress === 'number'
          ? Math.max(0, Math.min(100, st.progress))
          : (st.completed ? 100 : 0);
        earnedUnits += (val / 100);
        if (val === 100) {
          fullyCompletedUnits += 1;
        }
      }
    } else {
      totalUnits += 1;
      if (t.status === 'Completed') {
        earnedUnits += 1;
        fullyCompletedUnits += 1;
      } else if (t.status === 'In Progress') {
        earnedUnits += 0.5;
      }
    }
  }

  const percent = totalUnits > 0 ? Math.round((earnedUnits / totalUnits) * 100) : 0;
  return {
    percent,
    completedUnits: fullyCompletedUnits,
    totalUnits,
    hasTasks: true,
  };
};

export const getProjectCalculatedProgress = (
  projectId: number | string,
  fallbackStatus?: ProjectStatus | string
): number => {
  const tasks = getProjectTasks(projectId);
  return calculateProjectTaskProgress(tasks, fallbackStatus).percent;
};

/**
 * Dynamic project status lifecycle:
 * 1. Cancelled / Canceled: When user explicitly clicks cancel project.
 * 2. Completed: When all tasks reach 100% completion (or 100% progress).
 * 3. Overdue: When current date is past the estimated end date (deadline_date) and project is not completed.
 * 4. In Progress: When user creates tasks or makes progress on any task.
 * 5. Starting: Default initial status when project is created (no tasks yet, not overdue, not cancelled).
 */
export const calculateDynamicProjectStatus = (
  project: {
    status?: ProjectStatus | string;
    deadline_date?: string | null;
    start_date?: string | null;
    id?: number | string;
  },
  tasks?: ProjectTask[]
): ProjectStatus => {
  const currentStatus = project?.status;
  if (currentStatus === 'Cancelled' || currentStatus === 'Canceled') {
    return 'Cancelled';
  }

  const projectTasks = tasks !== undefined
    ? tasks
    : (project?.id ? getProjectTasks(project.id) : []);

  const metrics = calculateProjectTaskProgress(projectTasks, currentStatus);

  // If completed (100% tasks done or progress === 100)
  if (metrics.percent === 100 || (metrics.hasTasks && metrics.percent === 100)) {
    return 'Completed';
  }

  // Check if overdue: deadline_date is in the past
  if (project?.deadline_date) {
    const rawStr = String(project.deadline_date).trim();
    const match = rawStr.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (match[0] < todayStr) {
        return 'Overdue';
      }
    }
  }

  // Check if tasks created or progress made
  if (projectTasks && projectTasks.length > 0) {
    return 'In Progress';
  }
  if (metrics.hasTasks && metrics.percent > 0) {
    return 'In Progress';
  }

  // Preserve explicit sales or operational status if set
  const PRESERVE_STATUSES = [
    'Inquiry',
    'Discussion',
    'Quotation',
    'Negotiation',
    'Accepted',
    'Closed Won',
    'Closed Lost',
    'Draft',
    'Approved',
    'Material Preparation',
    'Production',
    'Ready for Delivery',
    'Installation',
  ];
  if (currentStatus && PRESERVE_STATUSES.includes(currentStatus)) {
    return currentStatus as ProjectStatus;
  }

  return 'Starting';
};

