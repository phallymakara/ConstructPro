import type { ProjectStatus, ProjectTask } from '../models/types';

export const getStatusFallbackProgress = (status: ProjectStatus | string): number => {
  switch (status) {
    case 'Draft': return 5;
    case 'Quotation': return 15;
    case 'Approved': return 25;
    case 'Material Preparation': return 45;
    case 'Production': return 65;
    case 'Ready for Delivery': return 85;
    case 'Installation': return 95;
    case 'Completed': return 100;
    case 'Cancelled': return 0;
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
