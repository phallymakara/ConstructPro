import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Pencil,
  MoreHorizontal,
  CheckSquare,
  Download,
  Eye
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Project, ProjectTask, ProjectSubTask } from '../../models/types';
import {
  calculateProjectTaskProgress,
  getProjectTasks,
  saveProjectTasks,
  calculateDynamicProjectStatus
} from '../../utils/taskProgress';
import {
  generateProjectExportBody,
  exportProjectToPDF,
  exportProjectToWord,
  generateScheduleExportBody,
  exportScheduleToPDF,
  exportScheduleToWord,
  viewDocumentInNewTab
} from '../../utils/exportTemplate';

interface ProjectDoc {
  id: number;
  name: string;
  document_type?: string;
  uploaded_by?: string;
  category?: string;
  file_name?: string;
  uploaded_at: string;
  is_default?: boolean;
}

interface AssignedPersonnel {
  id: string;
  name: string;
  role: string;
  scope: string;
}

interface AssignedMaterialRequirement {
  id: string | number;
  material_name: string;
  material_code?: string;
  material_unit?: string;
  required_qty: number;
  allocated_qty?: number;
  wastage_percent?: number;
  available_stock?: number;
  unit_cost?: number;
  status: string;
}

const calculateDurationDays = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '-';
  try {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return '-';
    const diffDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
  } catch {
    return '-';
  }
};

const formatShortDocType = (type?: string, id?: number): string => {
  if (id === 1) return 'Specification';
  if (id === 2) return 'Schedule';
  if (!type) return 'General';
  const lower = type.toLowerCase();
  if (lower.includes('schedule') || lower.includes('timeline')) return 'Schedule';
  if (lower.includes('spec') || lower.includes('resource') || lower.includes('material')) return 'Specification';
  if (lower.includes('contract') || lower.includes('agreement')) return 'Contract';
  if (lower.includes('drawing') || lower.includes('blueprint')) return 'Drawing';
  if (lower.includes('quotation') || lower.includes('proposal')) return 'Quotation';
  if (lower.includes('photo') || lower.includes('survey')) return 'Photo';
  if (lower.includes('report') || lower.includes('evaluation')) return 'Report';
  if (lower.includes('general')) return 'General';
  return type;
};

export const ProjectWorkflowView: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = Number(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'resource' | 'tasks' | 'document'>('summary');
  const [resourceSubTab, setResourceSubTab] = useState<'personnel' | 'materials'>('personnel');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Tasks tab state
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskNameInput, setTaskNameInput] = useState<string>('');
  const [taskDescInput, setTaskDescInput] = useState<string>('');
  const [taskStartDateInput, setTaskStartDateInput] = useState<string>('');
  const [taskEndDateInput, setTaskEndDateInput] = useState<string>('');
  const [taskFormError, setTaskFormError] = useState<string>('');
  const [taskDateErrors, setTaskDateErrors] = useState<{ start?: string; end?: string }>({});

  // Subtask Add Modal state
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState<boolean>(false);
  const [addSubtaskTargetTaskId, setAddSubtaskTargetTaskId] = useState<string | null>(null);
  const [subtaskTitleInput, setSubtaskTitleInput] = useState<string>('');
  const [subtaskDescInput, setSubtaskDescInput] = useState<string>('');
  const [subtaskStartDateInput, setSubtaskStartDateInput] = useState<string>('');
  const [subtaskEstEndDateInput, setSubtaskEstEndDateInput] = useState<string>('');
  const [addSubtaskFormError, setAddSubtaskFormError] = useState<string>('');
  const [addSubtaskDateErrors, setAddSubtaskDateErrors] = useState<{ start?: string; end?: string }>({});

  // Subtask Edit Modal state
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState<boolean>(false);
  const [editingSubtaskData, setEditingSubtaskData] = useState<{
    taskId: string;
    subtaskId: string;
    title: string;
    progress: number;
    start_date?: string;
    est_end_date?: string;
    description?: string;
  } | null>(null);
  const [subtaskFormError, setSubtaskFormError] = useState<string>('');
  const [editSubtaskDateErrors, setEditSubtaskDateErrors] = useState<{ start?: string; end?: string }>({});

  // Resource tab state: Work & Personnel
  const [isAssignPersonnelModalOpen, setIsAssignPersonnelModalOpen] = useState<boolean>(false);
  const [editingPersonnelId, setEditingPersonnelId] = useState<string | null>(null);
  const [personnelNameInput, setPersonnelNameInput] = useState('');
  const [personnelRoleInput, setPersonnelRoleInput] = useState('Project Manager');
  const [personnelScopeInput, setPersonnelScopeInput] = useState('');
  const [personnelList, setPersonnelList] = useState<AssignedPersonnel[]>([]);

  // Resource tab state: Material Allocation (Manual Entry)
  const [isAssignMaterialModalOpen, setIsAssignMaterialModalOpen] = useState<boolean>(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | number | null>(null);
  const [materialNameInput, setMaterialNameInput] = useState<string>('');
  const [materialQtyInput, setMaterialQtyInput] = useState<string>('');
  const [materialStatusInput, setMaterialStatusInput] = useState<string>('Ready');
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});
  const [materialsList, setMaterialsList] = useState<AssignedMaterialRequirement[]>([]);

  // Dropdown menu state for horizontal three-dot menu on Personnel & Materials
  const [openMenuPersonnelId, setOpenMenuPersonnelId] = useState<string | number | null>(null);
  const [openMenuMaterialId, setOpenMenuMaterialId] = useState<string | number | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuPersonnelId(null);
      setOpenMenuMaterialId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Document tab state
  const [projectDocuments, setProjectDocuments] = useState<ProjectDoc[]>([]);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', document_type: 'General', file_name: '' });
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.erp-export-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Payment modal state
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: '',
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState<Record<string, string>>({});

  const fetchProjectData = useCallback(async () => {
    if (!projectId || isNaN(projectId)) {
      setErrorMessage('Invalid project ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const projData = await api.get<Project>(`/projects/${projectId}`);
      setProject(projData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Synchronize assigned personnel from storage or project record
  useEffect(() => {
    if (!project) return;
    try {
      const saved = localStorage.getItem(`project_personnel_${project.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPersonnelList(parsed);
          return;
        }
      }
    } catch {}

    const list: AssignedPersonnel[] = [];
    if (project.assigned_manager && project.assigned_manager !== 'Not assigned') {
      list.push({
        id: 'manager',
        name: project.assigned_manager,
        role: 'Project Manager',
        scope: 'Project coordination, technical specifications & site liaison',
      });
    }
    if (project.architect && project.architect !== 'Not assigned') {
      list.push({
        id: 'architect',
        name: project.architect,
        role: 'Architecture',
        scope: 'Architectural specifications & opening dimensions',
      });
    }
    if (project.worker && project.worker !== 'Not assigned') {
      const splitWorkers = project.worker.split(',').map(w => w.trim()).filter(Boolean);
      splitWorkers.forEach((wName, idx) => {
        list.push({
          id: `worker_${idx}_${Date.now()}`,
          name: wName,
          role: 'Worker',
          scope: 'Aluminum fabrication, frame assembly, cutting & on-site glazing',
        });
      });
    }
    if (project.sales_person && project.sales_person !== 'Not assigned') {
      list.push({
        id: 'salesperson',
        name: project.sales_person,
        role: 'Salesperson',
        scope: 'Client communications & commercial representation',
      });
    }
    if (project.site_supervisor && project.site_supervisor !== 'Not assigned') {
      list.push({
        id: 'supervisor',
        name: project.site_supervisor,
        role: 'Site Supervisor',
        scope: 'Site safety inspection, installation quality & crew oversight',
      });
    }
    setPersonnelList(list);
  }, [project?.id, project?.assigned_manager, project?.architect, project?.worker, project?.sales_person, project?.site_supervisor]);

  // Synchronize assigned materials from storage or project record
  useEffect(() => {
    if (!project) return;
    try {
      const saved = localStorage.getItem(`project_materials_${project.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMaterialsList(parsed);
          return;
        }
      }
    } catch {}

    if (project.material_requirements && project.material_requirements.length > 0) {
      setMaterialsList(project.material_requirements);
    } else {
      setMaterialsList([]);
    }
  }, [project?.id, project?.material_requirements]);

  // Synchronize documents from storage or initialize default documents
  useEffect(() => {
    if (!project) return;
    const defaultDoc1: ProjectDoc = {
      id: 1,
      name: 'Project Specification & Resource Allocation',
      document_type: 'Specification',
      uploaded_by: 'Default',
      file_name: 'project_specification_report.pdf',
      uploaded_at: 'Default',
      is_default: true,
    };
    const defaultDoc2: ProjectDoc = {
      id: 2,
      name: 'Project Schedule & Milestone Timeline',
      document_type: 'Schedule',
      uploaded_by: 'Default',
      file_name: 'project_schedule_timeline.pdf',
      uploaded_at: 'Default',
      is_default: true,
    };

    try {
      const saved = localStorage.getItem(`project_documents_${project.id}`);
      if (saved) {
        const parsed: ProjectDoc[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map(d => {
            if (d.id === 1) return { ...d, ...defaultDoc1, document_type: 'Specification' };
            if (d.id === 2) return { ...d, ...defaultDoc2, document_type: 'Schedule' };
            return { ...d, document_type: formatShortDocType(d.document_type, d.id) };
          });
          const has1 = updated.some(d => d.id === 1);
          const has2 = updated.some(d => d.id === 2);
          const merged = [
            ...(has1 ? [] : [defaultDoc1]),
            ...(has2 ? [] : [defaultDoc2]),
            ...updated,
          ];
          setProjectDocuments(merged);
          localStorage.setItem(`project_documents_${project.id}`, JSON.stringify(merged));
          return;
        }
      }
    } catch {}

    const defaultDocs: ProjectDoc[] = [defaultDoc1, defaultDoc2];
    setProjectDocuments(defaultDocs);
    try {
      localStorage.setItem(`project_documents_${project.id}`, JSON.stringify(defaultDocs));
    } catch {}
  }, [project?.id, project?.start_date]);

  // Synchronize tasks from storage
  useEffect(() => {
    if (!project) return;
    const projectTasks = getProjectTasks(project.id);
    const defaultStart = project.actual_start_date || project.start_date || new Date().toISOString().split('T')[0];
    const defaultEnd = project.actual_end_date || project.deadline_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    let tasksToUse = projectTasks;
    if (tasksToUse.length === 0) {
      tasksToUse = [
        {
          id: 'task-1',
          name: 'ការងារកាត់ដែកគ្រោង',
          status: 'Todo',
          start_date: defaultStart,
          end_date: defaultEnd,
          est_end_date: defaultEnd,
          subtasks: [
            {
              id: 'subtask-1-1',
              title: 'ដែកឆ្អឹង',
              progress: 0,
              completed: false,
              start_date: defaultStart,
              est_end_date: defaultEnd,
            },
            {
              id: 'subtask-1-2',
              title: 'ដែកគ្រោង',
              progress: 0,
              completed: false,
              start_date: defaultStart,
              est_end_date: defaultEnd,
            },
            {
              id: 'subtask-1-3',
              title: 'គ្រឿងក្រោម',
              progress: 0,
              completed: false,
              start_date: defaultStart,
              est_end_date: defaultEnd,
            },
            {
              id: 'subtask-1-4',
              title: 'តម្លើងដែក',
              progress: 0,
              completed: false,
              start_date: defaultStart,
              est_end_date: defaultEnd,
            },
          ],
        },
      ];
    }

    const normalized = tasksToUse.map(t => {
      const taskStart = t.start_date || defaultStart;
      const taskEnd = t.est_end_date || t.end_date || defaultEnd;
      return {
        ...t,
        start_date: taskStart,
        end_date: taskEnd,
        est_end_date: taskEnd,
        subtasks: (t.subtasks || []).map(st => ({
          ...st,
          progress: typeof st.progress === 'number' ? st.progress : (st.completed ? 100 : 0),
          completed: typeof st.progress === 'number' ? st.progress === 100 : !!st.completed,
          start_date: st.start_date || taskStart,
          est_end_date: st.est_end_date || taskEnd,
        })),
      };
    });
    setTasks(normalized);
    saveProjectTasks(project.id, normalized);
  }, [project?.id, project?.start_date, project?.deadline_date, project?.actual_start_date, project?.actual_end_date]);

  const handleUpdateTasks = async (newTasks: ProjectTask[]) => {
    setTasks(newTasks);
    if (project) {
      saveProjectTasks(project.id, newTasks);
      const nextStatus = calculateDynamicProjectStatus(project, newTasks);
      if (project.status !== nextStatus && project.status !== 'Cancelled') {
        try {
          await api.put(`/projects/${project.id}`, { status: nextStatus });
          setProject(prev => prev ? { ...prev, status: nextStatus } : prev);
        } catch {
          // Keep local state responsive
        }
      }
    }
  };

  const handleOpenCreateTask = () => {
    const defaultStart = project?.actual_start_date || project?.start_date || new Date().toISOString().split('T')[0];
    const defaultEnd = project?.actual_end_date || project?.deadline_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setEditingTaskId(null);
    setTaskNameInput('');
    setTaskDescInput('');
    setTaskStartDateInput(defaultStart);
    setTaskEndDateInput(defaultEnd);
    setTaskFormError('');
    setTaskDateErrors({});
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setTaskNameInput(task.name);
    setTaskDescInput(task.description || '');
    setTaskStartDateInput(task.start_date || '');
    setTaskEndDateInput(task.est_end_date || task.end_date || '');
    setTaskFormError('');
    setTaskDateErrors({});
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = taskNameInput.trim();
    const errors: { start?: string; end?: string } = {};

    if (!taskStartDateInput || !taskStartDateInput.trim()) {
      errors.start = 'Start date is required';
    }
    if (!taskEndDateInput || !taskEndDateInput.trim()) {
      errors.end = 'Est. end date is required';
    } else if (taskStartDateInput && taskEndDateInput < taskStartDateInput) {
      errors.end = 'Cannot be earlier than start date';
    }

    if (!trimmed || errors.start || errors.end) {
      if (!trimmed) setTaskFormError('Task name is required.');
      setTaskDateErrors(errors);
      return;
    }
    setTaskFormError('');
    setTaskDateErrors({});

    let updatedTasks: ProjectTask[];
    if (editingTaskId) {
      updatedTasks = tasks.map(t =>
        t.id === editingTaskId
          ? {
              ...t,
              name: trimmed,
              description: taskDescInput.trim() || undefined,
              start_date: taskStartDateInput || undefined,
              end_date: taskEndDateInput || undefined,
              est_end_date: taskEndDateInput || undefined,
            }
          : t
      );
    } else {
      const newTask: ProjectTask = {
        id: Date.now().toString(),
        name: trimmed,
        description: taskDescInput.trim() || undefined,
        status: 'Todo',
        subtasks: [],
        start_date: taskStartDateInput || undefined,
        end_date: taskEndDateInput || undefined,
        est_end_date: taskEndDateInput || undefined,
        created_at: new Date().toISOString(),
      };
      updatedTasks = [...tasks, newTask];
    }
    handleUpdateTasks(updatedTasks);
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    handleUpdateTasks(updated);
  };

  const validateSubtaskDates = (
    startDate: string | undefined,
    endDate: string | undefined,
    parentStartDate: string | undefined,
    parentEndDate: string | undefined
  ): { start?: string; end?: string } => {
    const errors: { start?: string; end?: string } = {};

    if (!startDate || !startDate.trim()) {
      errors.start = 'Start date is required';
    } else if (parentStartDate && startDate < parentStartDate) {
      errors.start = `Cannot be earlier than main task start (${parentStartDate})`;
    } else if (parentEndDate && startDate > parentEndDate) {
      errors.start = `Cannot be later than main task end (${parentEndDate})`;
    }

    if (!endDate || !endDate.trim()) {
      errors.end = 'Est. end date is required';
    } else if (parentEndDate && endDate > parentEndDate) {
      errors.end = `Cannot be later than main task end (${parentEndDate})`;
    } else if (parentStartDate && endDate < parentStartDate) {
      errors.end = `Cannot be earlier than main task start (${parentStartDate})`;
    } else if (startDate && endDate && endDate < startDate) {
      errors.end = 'Cannot be earlier than start date';
    }

    return errors;
  };

  const handleOpenAddSubtask = (taskId: string) => {
    const parentTask = tasks.find(t => t.id === taskId);
    const defaultStart = parentTask?.start_date || project?.actual_start_date || project?.start_date || new Date().toISOString().split('T')[0];
    const defaultEnd = parentTask?.est_end_date || parentTask?.end_date || project?.actual_end_date || project?.deadline_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    setAddSubtaskTargetTaskId(taskId);
    setSubtaskTitleInput('');
    setSubtaskDescInput('');
    setSubtaskStartDateInput(defaultStart);
    setSubtaskEstEndDateInput(defaultEnd);
    setAddSubtaskFormError('');
    setAddSubtaskDateErrors({});
    setIsAddSubtaskModalOpen(true);
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubtaskTargetTaskId) return;
    const title = subtaskTitleInput.trim();
    if (!title) {
      setAddSubtaskFormError('Subtask name is required.');
      return;
    }
    setAddSubtaskFormError('');

    const parentTask = tasks.find(t => t.id === addSubtaskTargetTaskId);
    const parentStart = parentTask?.start_date;
    const parentEnd = parentTask?.est_end_date || parentTask?.end_date;

    const dateErrors = validateSubtaskDates(subtaskStartDateInput, subtaskEstEndDateInput, parentStart, parentEnd);
    if (Object.keys(dateErrors).length > 0) {
      setAddSubtaskDateErrors(dateErrors);
      return;
    }
    setAddSubtaskDateErrors({});

    const newSubtask: ProjectSubTask = {
      id: Date.now().toString(),
      title,
      description: subtaskDescInput.trim() || undefined,
      start_date: subtaskStartDateInput || undefined,
      est_end_date: subtaskEstEndDateInput || undefined,
      progress: 0,
      completed: false,
    };

    const updated = tasks.map(t => {
      if (t.id !== addSubtaskTargetTaskId) return t;
      const updatedSubtasks = [...(t.subtasks || []), newSubtask];
      const sum = updatedSubtasks.reduce((acc, curr) => {
        const val = typeof curr.progress === 'number' ? curr.progress : (curr.completed ? 100 : 0);
        return acc + val;
      }, 0);
      const avg = Math.round(sum / updatedSubtasks.length);
      let newStatus: 'Todo' | 'In Progress' | 'Completed' = 'Todo';
      if (avg === 100) newStatus = 'Completed';
      else if (avg > 0) newStatus = 'In Progress';
      else newStatus = 'Todo';
      return { ...t, subtasks: updatedSubtasks, status: newStatus };
    });

    handleUpdateTasks(updated);
    setIsAddSubtaskModalOpen(false);
    setAddSubtaskTargetTaskId(null);
  };

  const handleOpenEditSubtask = (taskId: string, subtask: ProjectSubTask) => {
    const parentTask = tasks.find(t => t.id === taskId);
    const prog = typeof subtask.progress === 'number'
      ? subtask.progress
      : (subtask.completed ? 100 : 0);
    setEditingSubtaskData({
      taskId,
      subtaskId: subtask.id,
      title: subtask.title,
      progress: prog,
      start_date: subtask.start_date || parentTask?.start_date || '',
      est_end_date: subtask.est_end_date || parentTask?.est_end_date || parentTask?.end_date || '',
      description: subtask.description || '',
    });
    setSubtaskFormError('');
    setEditSubtaskDateErrors({});
    setIsSubtaskModalOpen(true);
  };

  const handleSaveSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubtaskData) return;
    const trimmed = editingSubtaskData.title.trim();
    if (!trimmed) {
      setSubtaskFormError('Subtask name is required.');
      return;
    }
    setSubtaskFormError('');

    const parentTask = tasks.find(t => t.id === editingSubtaskData.taskId);
    const parentStart = parentTask?.start_date;
    const parentEnd = parentTask?.est_end_date || parentTask?.end_date;

    const dateErrors = validateSubtaskDates(
      editingSubtaskData.start_date,
      editingSubtaskData.est_end_date,
      parentStart,
      parentEnd
    );
    if (Object.keys(dateErrors).length > 0) {
      setEditSubtaskDateErrors(dateErrors);
      return;
    }
    setEditSubtaskDateErrors({});

    const clampedProgress = Math.max(0, Math.min(100, Math.round(Number(editingSubtaskData.progress) || 0)));

    const updated = tasks.map(t => {
      if (t.id !== editingSubtaskData.taskId) return t;
      const updatedSubtasks = (t.subtasks || []).map(st =>
        st.id === editingSubtaskData.subtaskId
          ? {
              ...st,
              title: trimmed,
              progress: clampedProgress,
              completed: clampedProgress === 100,
              start_date: editingSubtaskData.start_date || undefined,
              est_end_date: editingSubtaskData.est_end_date || undefined,
              description: editingSubtaskData.description?.trim() || undefined,
            }
          : st
      );
      const total = updatedSubtasks.length;
      let newStatus: 'Todo' | 'In Progress' | 'Completed' = 'Todo';
      if (total > 0) {
        const sum = updatedSubtasks.reduce((acc, curr) => {
          const val = typeof curr.progress === 'number' ? curr.progress : (curr.completed ? 100 : 0);
          return acc + val;
        }, 0);
        const avg = Math.round(sum / total);
        if (avg === 100) newStatus = 'Completed';
        else if (avg > 0) newStatus = 'In Progress';
        else newStatus = 'Todo';
      }
      return { ...t, subtasks: updatedSubtasks, status: newStatus };
    });

    handleUpdateTasks(updated);
    setIsSubtaskModalOpen(false);
    setEditingSubtaskData(null);
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      const updatedSubtasks = (t.subtasks || []).filter(st => st.id !== subtaskId);
      const total = updatedSubtasks.length;
      let newStatus = t.status;
      if (total > 0) {
        const sum = updatedSubtasks.reduce((acc, curr) => {
          const val = typeof curr.progress === 'number' ? curr.progress : (curr.completed ? 100 : 0);
          return acc + val;
        }, 0);
        const avg = Math.round(sum / total);
        if (avg === 100) newStatus = 'Completed';
        else if (avg > 0) newStatus = 'In Progress';
        else newStatus = 'Todo';
      }
      return { ...t, subtasks: updatedSubtasks, status: newStatus };
    });
    handleUpdateTasks(updated);
  };


  // Tab 2: Personnel Handlers
  const handleOpenAssignPersonnel = (person?: AssignedPersonnel) => {
    if (person) {
      setEditingPersonnelId(person.id);
      setPersonnelNameInput(person.name);
      setPersonnelRoleInput(person.role);
      setPersonnelScopeInput(person.scope);
    } else {
      setEditingPersonnelId(null);
      setPersonnelNameInput('');
      setPersonnelRoleInput('Project Manager');
      setPersonnelScopeInput('');
    }
    setIsAssignPersonnelModalOpen(true);
  };

  const handleAssignPersonnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const trimmedName = personnelNameInput.trim();
    if (!trimmedName) return;
    const trimmedScope = personnelScopeInput.trim() || 'General project coordination & execution';

    let updatedList: AssignedPersonnel[];
    if (editingPersonnelId) {
      updatedList = personnelList.map(p =>
        p.id === editingPersonnelId
          ? { ...p, name: trimmedName, role: personnelRoleInput, scope: trimmedScope }
          : p
      );
    } else {
      const newItem: AssignedPersonnel = {
        id: Date.now().toString(),
        name: trimmedName,
        role: personnelRoleInput,
        scope: trimmedScope,
      };
      updatedList = [...personnelList, newItem];
    }

    setPersonnelList(updatedList);
    try {
      localStorage.setItem(`project_personnel_${project.id}`, JSON.stringify(updatedList));
    } catch {}

    const manager = updatedList.find(p => p.role.includes('Engineer') || p.role.includes('Manage'));
    const architect = updatedList.find(p => p.role.includes('Architect') || p.role.includes('Designer') || p.role.includes('Architecture'));
    const workers = updatedList
      .filter(p => p.role.includes('Worker') || p.role.includes('Crew'))
      .map(p => p.name.trim())
      .filter(Boolean);
    const salesperson = updatedList.find(p => p.role.includes('Sales') || p.role.includes('Salesperson'));
    const supervisor = updatedList.find(p => p.role.includes('Supervisor'));

    setActionLoading(true);
    try {
      const updated = await api.put<Project>(`/projects/${project.id}`, {
        assigned_manager: manager ? manager.name : null,
        architect: architect ? architect.name : null,
        worker: workers.length > 0 ? workers.join(', ') : null,
        sales_person: salesperson ? salesperson.name : null,
        site_supervisor: supervisor ? supervisor.name : null,
      });
      setProject(updated);
      setIsAssignPersonnelModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update assigned personnel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePersonnel = async (personId: string) => {
    if (!project) return;
    const updatedList = personnelList.filter(p => p.id !== personId);
    setPersonnelList(updatedList);
    try {
      localStorage.setItem(`project_personnel_${project.id}`, JSON.stringify(updatedList));
    } catch {}

    const manager = updatedList.find(p => p.role.includes('Engineer') || p.role.includes('Manage'));
    const architect = updatedList.find(p => p.role.includes('Architect') || p.role.includes('Designer') || p.role.includes('Architecture'));
    const workers = updatedList
      .filter(p => p.role.includes('Worker') || p.role.includes('Crew'))
      .map(p => p.name.trim())
      .filter(Boolean);
    const salesperson = updatedList.find(p => p.role.includes('Sales') || p.role.includes('Salesperson'));
    const supervisor = updatedList.find(p => p.role.includes('Supervisor'));

    setActionLoading(true);
    try {
      const updated = await api.put<Project>(`/projects/${project.id}`, {
        assigned_manager: manager ? manager.name : null,
        architect: architect ? architect.name : null,
        worker: workers.length > 0 ? workers.join(', ') : null,
        sales_person: salesperson ? salesperson.name : null,
        site_supervisor: supervisor ? supervisor.name : null,
      });
      setProject(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove personnel');
    } finally {
      setActionLoading(false);
    }
  };

  // Tab 2: Material Handlers (Manual Input)
  const handleOpenAssignMaterial = (item?: AssignedMaterialRequirement) => {
    if (item) {
      setEditingMaterialId(item.id);
      setMaterialNameInput(item.material_name);
      setMaterialQtyInput(String(item.required_qty));
      setMaterialStatusInput(item.status || 'Ready');
    } else {
      setEditingMaterialId(null);
      setMaterialNameInput('');
      setMaterialQtyInput('');
      setMaterialStatusInput('Ready');
    }
    setMaterialErrors({});
    setIsAssignMaterialModalOpen(true);
  };

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const trimmedName = materialNameInput.trim();
    const qty = parseFloat(materialQtyInput);

    const errors: Record<string, string> = {};
    if (!trimmedName) {
      errors.name = 'Please enter a material name.';
    }
    if (isNaN(qty) || qty <= 0) {
      errors.qty = 'Please enter a valid required quantity greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
      setMaterialErrors(errors);
      return;
    }

    setMaterialErrors({});
    let updated: AssignedMaterialRequirement[];

    if (editingMaterialId) {
      updated = materialsList.map(m =>
        String(m.id) === String(editingMaterialId)
          ? { ...m, material_name: trimmedName, required_qty: qty, status: m.status || 'Ready' }
          : m
      );
    } else {
      const newRequirement: AssignedMaterialRequirement = {
        id: Date.now().toString(),
        material_name: trimmedName,
        required_qty: qty,
        status: 'Ready',
      };
      updated = [...materialsList, newRequirement];
    }

    setMaterialsList(updated);
    try {
      localStorage.setItem(`project_materials_${project.id}`, JSON.stringify(updated));
    } catch {}

    setProject(prev => prev ? { ...prev, material_requirements: updated as any } : null);
    setIsAssignMaterialModalOpen(false);
    setEditingMaterialId(null);
    setMaterialNameInput('');
    setMaterialQtyInput('');
    setMaterialStatusInput('Ready');
  };

  const handleRemoveMaterialFromProject = async (reqId: number | string) => {
    if (!project) return;
    const updated = materialsList.filter(m => String(m.id) !== String(reqId));
    setMaterialsList(updated);
    try {
      localStorage.setItem(`project_materials_${project.id}`, JSON.stringify(updated));
    } catch {}
    setProject(prev => prev ? { ...prev, material_requirements: updated as any } : null);

    // If it was a backend requirement with numeric ID, try removing on backend gracefully
    if (typeof reqId === 'number' && reqId < 1000000000) {
      try {
        await api.delete(`/projects/${project.id}/materials/${reqId}`);
      } catch {}
    }
  };

  // Tab 4: Document Handlers
  const handleUploadDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name.trim()) return;
    const docItem: ProjectDoc = {
      id: Date.now(),
      name: newDoc.name.trim(),
      document_type: formatShortDocType(newDoc.document_type || 'General'),
      uploaded_by: 'Admin',
      file_name: newDoc.file_name || `${newDoc.name.trim().toLowerCase().replace(/\s+/g, '_')}.pdf`,
      uploaded_at: new Date().toLocaleDateString(),
    };
    const updated = [...projectDocuments, docItem];
    setProjectDocuments(updated);
    if (project) {
      try {
        localStorage.setItem(`project_documents_${project.id}`, JSON.stringify(updated));
      } catch {}
    }
    setNewDoc({ name: '', document_type: 'General', file_name: '' });
    setIsUploadDocModalOpen(false);
  };

  const handleDeleteDoc = (id: number) => {
    const docToDelete = projectDocuments.find(d => d.id === id);
    if (id === 1 || id === 2 || docToDelete?.is_default) return;
    const updated = projectDocuments.filter(d => d.id !== id);
    setProjectDocuments(updated);
    if (project) {
      try {
        localStorage.setItem(`project_documents_${project.id}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const customerDisplayName = project?.customer?.name || (project as any)?.customer_name || 'Valued Customer';

  const handleViewProjectDoc = (doc: ProjectDoc) => {
    setOpenActionMenuId(null);
    if (!project) return;

    if (doc.id === 1) {
      const htmlBody = generateProjectExportBody(
        project,
        customerDisplayName,
        personnelList,
        materialsList
      );
      viewDocumentInNewTab(
        `${project.project_name || 'Project'} - Project Specification & Resource Allocation`,
        htmlBody
      );
    } else if (doc.id === 2) {
      const htmlBody = generateScheduleExportBody(
        project,
        customerDisplayName,
        tasks
      );
      viewDocumentInNewTab(
        `${project.project_name || 'Project'} - Project Schedule & Milestone Timeline`,
        htmlBody
      );
    } else {
      const customContent = `
        <div style="padding: 40px 20px; text-align: center; color: #475569;">
          <h2 style="font-size: 18px; color: #0f172a; margin-bottom: 8px;">${doc.name}</h2>
          <p style="font-size: 13px; color: #64748b; margin: 4px 0;">File: ${doc.file_name || `${doc.name}.pdf`}</p>
          <p style="font-size: 12px; color: #94a3b8; margin: 4px 0;">Uploaded Date: ${doc.uploaded_at || 'Default'}</p>
          <p style="font-size: 12px; color: #94a3b8; margin: 4px 0;">Project: ${project.project_name}</p>
        </div>
      `;
      viewDocumentInNewTab(doc.name, customContent);
    }
  };

  const handleExportDefaultDoc = (docId: number, format: 'pdf' | 'word') => {
    if (!project) return;
    if (docId === 1) {
      if (format === 'pdf') {
        exportProjectToPDF(project, customerDisplayName, personnelList, materialsList);
      } else {
        exportProjectToWord(project, customerDisplayName, personnelList, materialsList);
      }
    } else if (docId === 2) {
      if (format === 'pdf') {
        exportScheduleToPDF(project, customerDisplayName, tasks);
      } else {
        exportScheduleToWord(project, customerDisplayName, tasks);
      }
    }
  };

  const handleDownloadProjectDoc = (doc: ProjectDoc) => {
    const blob = new Blob([`Document Name: ${doc.name}\nProject: ${project?.project_name || 'ConstructPro Project'}\nUploaded Date: ${doc.uploaded_at}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name || `${doc.name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Payment Recording Handler
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (newPayment.amount <= 0) {
      setPaymentFormErrors({ amount: 'Payment amount must be greater than 0' });
      return;
    }

    setPaymentFormErrors({});
    setActionLoading(true);
    try {
      await api.post(`/projects/${project.id}/payments`, {
        amount: Number(newPayment.amount),
        payment_date: newPayment.payment_date ? new Date(newPayment.payment_date).toISOString() : new Date().toISOString(),
        payment_method: newPayment.payment_method || 'Bank Transfer',
        reference_number: newPayment.reference_number.trim() || undefined,
        notes: newPayment.notes.trim() || undefined,
      });
      setIsRecordPaymentModalOpen(false);
      setNewPayment({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
        reference_number: '',
        notes: '',
      });
      await fetchProjectData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="erp-content">
        <div className="erp-empty-state">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="erp-content">
        <div className="erp-empty-state">
          <p>{errorMessage || 'Project not found.'}</p>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate({ to: '/projects' })}
          >
            <ArrowLeft size={14} />
            <span>Return to Projects</span>
          </button>
        </div>
      </div>
    );
  }

  const durationText = calculateDurationDays(
    project.actual_start_date || project.start_date,
    project.actual_end_date || project.deadline_date
  );
  const tasksProgress = calculateProjectTaskProgress(tasks, project.status);
  const completionPercent = tasksProgress.percent;



  // Group 3: Financial Calculations
  const contractAmount = project.contract_amount || 0;
  const payments = project.payments || [];
  const recordedPaymentsTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const customerPaid = payments.length > 0 ? recordedPaymentsTotal : (project.customer_paid || 0);
  const outstandingBalance = Math.max(0, contractAmount - customerPaid);
  const serviceCost = project.service_cost || 0;

  // Material cost calculated from requirements if not explicitly overridden
  const materialReqCost = (project.material_requirements || []).reduce((sum, r) => {
    return sum + (r.required_qty * (r.unit_cost || 0));
  }, 0);
  const materialCost = project.material_cost || materialReqCost;
  const laborCost = project.labor_cost || 0;
  const otherExpenses = project.other_expenses || 0;

  // Total Project Cost = Material Cost + Labor Cost + Service Cost + Other Expenses
  const totalCostComponents = materialCost + laborCost + serviceCost + otherExpenses;
  const totalProjectCost = totalCostComponents > 0
    ? totalCostComponents
    : (project.actual_cost || project.estimated_cost || 0);

  // Estimated Profit = Contract Amount - Total Project Cost
  const estimatedProfit = contractAmount - totalProjectCost;

  // Payment Status = Unpaid, Partially Paid, Paid
  const paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' =
    (contractAmount > 0 && customerPaid >= contractAmount)
      ? 'Paid'
      : customerPaid > 0
      ? 'Partially Paid'
      : 'Unpaid';

  return (
    <div className="erp-content">
      {/* Top Navigation & Clean Underline Tabs */}
      <div
        className="erp-underline-tabs"
        style={{
          borderRadius: 'var(--erp-radius-card) var(--erp-radius-card) 0 0',
          border: '1px solid var(--erp-border)',
          borderBottom: '1px solid var(--erp-border)',
          gap: '12px',
        }}
      >
        <button
          className="erp-btn erp-btn-secondary erp-btn-sm"
          style={{ height: '28px', padding: '0 10px', fontSize: '12px', gap: '5px' }}
          onClick={() => navigate({ to: '/projects' })}
          title="Back to all projects"
        >
          <ArrowLeft size={13} />
          <span>Back to Projects</span>
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--erp-border)', margin: '0 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <LayoutDashboard size={14} />
            <span>Summary</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'resource' ? 'active' : ''}`}
            onClick={() => setActiveTab('resource')}
          >
            <Users size={14} />
            <span>Resource</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={14} />
            <span>Tasks</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'document' ? 'active' : ''}`}
            onClick={() => setActiveTab('document')}
          >
            <FileText size={14} />
            <span>Document</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12.5px', padding: '2px 0' }}>
          {errorMessage}
        </div>
      )}

      {/* Workspace Canvas Container */}
      <div
        className="erp-table-container"
        style={{
          borderTop: 'none',
          borderRadius: '0 0 var(--erp-radius-card) var(--erp-radius-card)',
          padding: activeTab === 'resource' ? '0' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: activeTab === 'resource' ? '0' : '12px'
        }}
      >
        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="project-summary-grid">
            {/* Left Column: General Information & Financial Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. General Information Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>General Information</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Name:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.project_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Number / ID:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.project_number || `PRJ-${String(project.id).padStart(4, '0')}`}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Customer:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400, color: project.customer ? 'var(--erp-primary)' : 'var(--erp-text-main)' }}>
                    {project.customer?.name || 'Walk-in / Direct Client'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Type:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.project_type || 'Window & Door Installation'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Status:</span>
                  <div style={{ textAlign: 'left' }}>
                    <StatusBadge status={calculateDynamicProjectStatus(project, tasks)} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Site Location:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.location || 'Not Specified'}</span>
                </div>

                {/* Stakeholders Section within General Information */}
                <div style={{ borderTop: '1px solid var(--erp-border)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Stakeholders</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Manager:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.assigned_manager || personnelList.find(p => p.role.includes('Engineer') || p.role.includes('Manage'))?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Architect:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.architect || personnelList.find(p => p.role.includes('Architect') || p.role.includes('Designer') || p.role.includes('Architecture'))?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Workers:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {(() => {
                      const workerNames = personnelList
                        .filter(p => p.role.includes('Worker') || p.role.includes('Crew'))
                        .map(p => p.name.trim())
                        .filter(Boolean);
                      if (workerNames.length > 0) return workerNames.join(', ');
                      return project.worker || '-';
                    })()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Salesperson:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.sales_person || personnelList.find(p => p.role.includes('Sales'))?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Site Supervisor:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.site_supervisor || personnelList.find(p => p.role.includes('Supervisor'))?.name || '-'}
                  </span>
                </div>
              </div>

              {/* 2. Financial Information Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Financial Information</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Contract Amount:</span>
                  <span style={{ color: 'var(--erp-primary)', textAlign: 'left', fontWeight: 400 }}>
                    ${contractAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Customer Paid:</span>
                  <span style={{ color: '#059669', textAlign: 'left', fontWeight: 400 }}>
                    ${customerPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Outstanding Balance:</span>
                  <span style={{ color: outstandingBalance > 0 ? 'var(--erp-text-main)' : 'var(--erp-text-muted)', textAlign: 'left', fontWeight: 400 }}>
                    ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Service Cost:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    ${serviceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Total Project Cost:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    ${totalProjectCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Estimated Profit:</span>
                  <span style={{ color: estimatedProfit >= 0 ? '#059669' : 'var(--erp-text-error)', textAlign: 'left', fontWeight: 400 }}>
                    ${estimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Payment Status:</span>
                  <div style={{ textAlign: 'left' }}>
                    <span className={`erp-badge ${
                      paymentStatus === 'Paid'
                        ? 'erp-badge-emerald'
                        : paymentStatus === 'Partially Paid'
                        ? 'erp-badge-amber'
                        : 'erp-badge-rose'
                    }`} style={{ fontWeight: 400 }}>
                      {paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Customer Info & Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 3. Customer Info Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Customer Info</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Contact Person:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.customer?.contact_person || project.customer_representative || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Customer Address:</span>
                  <span style={{ textAlign: 'left', wordBreak: 'break-word', flex: 1, fontWeight: 400 }}>
                    {project.customer?.address || 'Not Recorded'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Telephone:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.customer?.phone || 'No phone recorded'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Email:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.customer?.email || 'No email recorded'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Preferred Contact Method:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.customer?.preferred_contact_method || project.preferred_contact_method || 'Phone'}
                  </span>
                </div>
              </div>

              {/* 4. Schedule Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Schedule</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Start Date:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Estimated End Date:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.deadline_date ? new Date(project.deadline_date).toLocaleDateString() : '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Actual End Date:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString() : '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Duration:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{durationText}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14.5px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Completion Percentage:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--erp-border)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${completionPercent}%`, height: '100%', backgroundColor: 'var(--erp-primary)' }} />
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 400 }}>{completionPercent}%</span>
                    {tasksProgress.hasTasks && (
                      <span style={{ fontSize: '12.5px', color: 'var(--erp-text-muted)' }}>
                        ({tasksProgress.completedUnits}/{tasksProgress.totalUnits} completed)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESOURCE */}
        {activeTab === 'resource' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: '360px' }}>
            {/* Sub-tab Toolbar: Selection on Left, Action on Right */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--erp-border)',
                padding: '6px 16px',
                backgroundColor: 'var(--erp-surface)',
              }}
            >
              <div
                className="erp-underline-tabs"
                style={{
                  borderBottom: 'none',
                  background: 'transparent',
                  padding: 0,
                  gap: '16px',
                  margin: 0,
                }}
              >
                <button
                  type="button"
                  className={`erp-underline-tab ${resourceSubTab === 'personnel' ? 'active' : ''}`}
                  onClick={() => setResourceSubTab('personnel')}
                  style={{ padding: '6px 4px' }}
                >
                  <span>Work & Personnel</span>
                </button>
                <button
                  type="button"
                  className={`erp-underline-tab ${resourceSubTab === 'materials' ? 'active' : ''}`}
                  onClick={() => setResourceSubTab('materials')}
                  style={{ padding: '6px 4px' }}
                >
                  <span>Project Materials</span>
                </button>
              </div>

              <div>
                {resourceSubTab === 'personnel' ? (
                  <button
                    type="button"
                    className="erp-btn erp-btn-primary erp-btn-sm"
                    onClick={() => handleOpenAssignPersonnel()}
                  >
                    <UserCheck size={14} />
                    <span>Assign Worker</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="erp-btn erp-btn-primary erp-btn-sm"
                    onClick={() => handleOpenAssignMaterial()}
                  >
                    <Plus size={14} />
                    <span>Assign Material</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tab 1: Work & Personnel (Full Width & Height Table) */}
            {resourceSubTab === 'personnel' && (
              personnelList.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    minHeight: '320px',
                    gap: '12px',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--erp-text-muted)' }}>
                    No personnel assigned to this project yet.
                  </span>
                  <button
                    type="button"
                    className="erp-btn erp-btn-secondary erp-btn-sm"
                    onClick={() => handleOpenAssignPersonnel()}
                  >
                    <UserCheck size={14} />
                    <span>Assign Worker</span>
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', flex: 1 }}>
                  <table className="erp-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>Name</th>
                        <th style={{ width: '25%' }}>Role</th>
                        <th style={{ width: '35%' }}>Scope</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personnelList.map(person => (
                        <tr key={person.id}>
                          <td style={{ fontWeight: 500, fontSize: '14.5px', color: 'var(--erp-text-main)' }}>
                            {person.name}
                          </td>
                          <td style={{ fontWeight: 400, fontSize: '14.5px', color: 'var(--erp-text-main)' }}>
                            {person.role}
                          </td>
                          <td style={{ color: 'var(--erp-text-muted)', fontSize: '14.5px' }}>
                            {person.scope}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="erp-dropdown-container">
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuMaterialId(null);
                                  setOpenMenuPersonnelId(openMenuPersonnelId === person.id ? null : person.id);
                                }}
                                title="Actions"
                                aria-label="Actions"
                              >
                                <MoreHorizontal size={15} />
                              </button>
                              {openMenuPersonnelId === person.id && (
                                <div className="erp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="erp-dropdown-item"
                                    onClick={() => {
                                      setOpenMenuPersonnelId(null);
                                      handleOpenAssignPersonnel(person);
                                    }}
                                  >
                                    <Pencil size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <div className="erp-dropdown-divider" />
                                  <button
                                    type="button"
                                    className="erp-dropdown-item danger"
                                    onClick={() => {
                                      setOpenMenuPersonnelId(null);
                                      handleRemovePersonnel(person.id);
                                    }}
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Sub-tab 2: Project Materials (Full Width & Height Table) */}
            {resourceSubTab === 'materials' && (
              materialsList.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    minHeight: '320px',
                    gap: '12px',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--erp-text-muted)' }}>
                    No materials assigned to this project yet.
                  </span>
                  <button
                    type="button"
                    className="erp-btn erp-btn-secondary erp-btn-sm"
                    onClick={() => handleOpenAssignMaterial()}
                  >
                    <Plus size={14} />
                    <span>Assign Material</span>
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', flex: 1 }}>
                  <table className="erp-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialsList.map(req => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 400, fontSize: '14.5px' }}>{req.material_name}</td>
                          <td style={{ fontSize: '14px' }}>{req.required_qty}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="erp-dropdown-container">
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuPersonnelId(null);
                                  setOpenMenuMaterialId(openMenuMaterialId === req.id ? null : req.id);
                                }}
                                title="Actions"
                                aria-label="Actions"
                              >
                                <MoreHorizontal size={15} />
                              </button>
                              {openMenuMaterialId === req.id && (
                                <div className="erp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="erp-dropdown-item"
                                    onClick={() => {
                                      setOpenMenuMaterialId(null);
                                      handleOpenAssignMaterial(req);
                                    }}
                                  >
                                    <Pencil size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <div className="erp-dropdown-divider" />
                                  <button
                                    type="button"
                                    className="erp-dropdown-item danger"
                                    onClick={() => {
                                      setOpenMenuMaterialId(null);
                                      handleRemoveMaterialFromProject(req.id);
                                    }}
                                    disabled={actionLoading}
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 3: TASKS */}
        {activeTab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--erp-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                  Project Tasks & Milestones
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '90px', height: '6px', backgroundColor: 'var(--erp-border)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${tasksProgress.percent}%`,
                        height: '100%',
                        backgroundColor: tasksProgress.percent === 100 ? '#059669' : 'var(--erp-primary)',
                        transition: 'width 0.25s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--erp-text-main)' }}>
                    {tasksProgress.percent}%
                  </span>
                  {tasksProgress.hasTasks && (
                    <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                      ({tasksProgress.completedUnits}/{tasksProgress.totalUnits} items completed)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="erp-btn erp-btn-primary erp-btn-sm"
                  onClick={handleOpenCreateTask}
                >
                  <Plus size={14} />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Task Cards List */}
            {tasks.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '260px',
                  gap: '12px',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--erp-text-muted)' }}>
                  No tasks created for this project yet.
                </span>
                <button
                  type="button"
                  className="erp-btn erp-btn-primary erp-btn-sm"
                  onClick={handleOpenCreateTask}
                >
                  <Plus size={14} />
                  <span>Create First Task</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.map((task, taskIdx) => {
                  const subtasks = task.subtasks || [];
                  const totalCount = subtasks.length;
                  let taskPercent = 0;
                  if (totalCount > 0) {
                    const sum = subtasks.reduce((acc, st) => {
                      const val = typeof st.progress === 'number'
                        ? st.progress
                        : (st.completed ? 100 : 0);
                      return acc + val;
                    }, 0);
                    taskPercent = Math.round(sum / totalCount);
                  } else {
                    taskPercent = task.status === 'Completed' ? 100 : (task.status === 'In Progress' ? 50 : 0);
                  }

                  return (
                    <div
                      key={task.id}
                      style={{
                        border: '1px solid var(--erp-border)',
                        borderRadius: 'var(--erp-radius-card)',
                        backgroundColor: 'var(--erp-surface)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Task Header Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: subtasks.length > 0 ? '1px solid var(--erp-border)' : 'none',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--erp-text-main)' }}>
                            {taskIdx + 1}. {task.name}
                          </span>
                          {task.description && (
                            <span style={{ fontSize: '13.5px', color: 'var(--erp-text-muted)' }}>
                              • {task.description}
                            </span>
                          )}
                          {(task.start_date || task.est_end_date || task.end_date) && (
                            <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)', whiteSpace: 'nowrap' }}>
                              {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'Start'} – {(task.est_end_date || task.end_date) ? new Date(task.est_end_date || task.end_date!).toLocaleDateString() : 'Est. End'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Mini Task Progress Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '70px', height: '6px', backgroundColor: 'var(--erp-border)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${taskPercent}%`,
                                  height: '100%',
                                  backgroundColor: taskPercent === 100 ? '#059669' : 'var(--erp-primary)',
                                  transition: 'width 0.2s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '32px', textAlign: 'right', color: 'var(--erp-text-main)' }}>
                              {taskPercent}%
                            </span>
                          </div>

                          {/* Status Badge (read-only) */}
                          <span
                            className={`erp-badge ${
                              task.status === 'Completed'
                                ? 'erp-badge-emerald'
                                : task.status === 'In Progress'
                                ? 'erp-badge-blue'
                                : 'erp-badge-secondary'
                            }`}
                            style={{
                              border: '1px solid var(--erp-border)',
                              padding: '2px 8px',
                              fontSize: '12px',
                              userSelect: 'none',
                            }}
                          >
                            {task.status}
                          </span>

                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ padding: '3px 6px' }}
                            onClick={() => handleOpenEditTask(task)}
                            title="Edit task name and dates"
                          >
                            <Pencil size={12} />
                          </button>

                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ borderColor: 'var(--erp-border-error)', color: 'var(--erp-text-error)', padding: '3px 6px' }}
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete task"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Subtasks Section with Column Layout */}
                      <div style={{ padding: '8px 14px 10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {subtasks.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px', overflowX: 'auto' }}>
                            {/* Table Column Headers */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: 'var(--erp-text-muted)',
                                borderBottom: '1px solid var(--erp-border)',
                                gap: '12px',
                                minWidth: '720px',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: '160px' }}>Subtask</div>
                              <div style={{ width: '115px', textAlign: 'left' }}>Start Date</div>
                              <div style={{ width: '115px', textAlign: 'left' }}>Est. End Date</div>
                              <div style={{ flex: 1, minWidth: '150px', textAlign: 'left' }}>Description (Optional)</div>
                              <div style={{ width: '130px', textAlign: 'right', paddingRight: '8px' }}>Progress</div>
                              <div style={{ width: '56px', textAlign: 'right' }}>Actions</div>
                            </div>

                            {/* Subtask Rows */}
                            {subtasks.map((subtask, subtaskIdx) => {
                              const prog = typeof subtask.progress === 'number'
                                ? subtask.progress
                                : (subtask.completed ? 100 : 0);
                              const isComplete = prog === 100;

                              return (
                                <div
                                  key={subtask.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px 8px',
                                    borderRadius: 'var(--erp-radius-sm, 6px)',
                                    gap: '12px',
                                    borderBottom: subtaskIdx < subtasks.length - 1 ? '1px solid var(--erp-border)' : 'none',
                                    minWidth: '720px',
                                  }}
                                >
                                  {/* Subtask Name */}
                                  <div style={{ flex: 1, minWidth: '160px' }}>
                                    <span
                                      style={{
                                        fontSize: '14.5px',
                                        color: isComplete ? 'var(--erp-text-muted)' : 'var(--erp-text-main)',
                                        fontWeight: 400,
                                      }}
                                    >
                                      <strong style={{ fontWeight: 600, color: 'var(--erp-text-main)', marginRight: '6px' }}>
                                        {taskIdx + 1}.{subtaskIdx + 1}
                                      </strong>
                                      {subtask.title}
                                    </span>
                                  </div>

                                  {/* Start Date Column */}
                                  <div style={{ width: '115px', fontSize: '14px', color: 'var(--erp-text-muted)', whiteSpace: 'nowrap' }}>
                                    {subtask.start_date ? new Date(subtask.start_date).toLocaleDateString() : '—'}
                                  </div>

                                  {/* Est. End Date Column */}
                                  <div style={{ width: '115px', fontSize: '14px', color: 'var(--erp-text-muted)', whiteSpace: 'nowrap' }}>
                                    {subtask.est_end_date ? new Date(subtask.est_end_date).toLocaleDateString() : '—'}
                                  </div>

                                  {/* Description (Optional) Column */}
                                  <div
                                    style={{
                                      flex: 1,
                                      minWidth: '150px',
                                      fontSize: '14px',
                                      color: 'var(--erp-text-muted)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={subtask.description || ''}
                                  >
                                    {subtask.description || '—'}
                                  </div>

                                  {/* Progress Column */}
                                  <div style={{ width: '130px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                    <div
                                      style={{
                                        width: '80px',
                                        height: '6px',
                                        backgroundColor: 'var(--erp-border)',
                                        borderRadius: '999px',
                                        overflow: 'hidden',
                                      }}
                                      title={`Progress: ${prog}%`}
                                    >
                                      <div
                                        style={{
                                          width: `${prog}%`,
                                          height: '100%',
                                          backgroundColor: isComplete ? '#059669' : 'var(--erp-primary)',
                                          transition: 'width 0.2s ease',
                                        }}
                                      />
                                    </div>

                                    <span
                                      style={{
                                        fontSize: '12.5px',
                                        fontWeight: 500,
                                        width: '36px',
                                        textAlign: 'right',
                                        color: isComplete ? '#059669' : 'var(--erp-text-main)',
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {prog}%
                                    </span>
                                  </div>

                                  {/* Actions Column */}
                                  <div style={{ width: '56px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                                    <button
                                      type="button"
                                      className="erp-btn erp-btn-secondary erp-btn-sm"
                                      style={{
                                        border: 'none',
                                        padding: '2px 4px',
                                        color: 'var(--erp-text-muted)',
                                        background: 'transparent',
                                      }}
                                      onClick={() => handleOpenEditSubtask(task.id, subtask)}
                                      title="Edit subtask"
                                      aria-label="Edit subtask"
                                    >
                                      <Pencil size={12} />
                                    </button>

                                    <button
                                      type="button"
                                      className="erp-btn erp-btn-secondary erp-btn-sm"
                                      style={{
                                        border: 'none',
                                        padding: '2px 4px',
                                        color: 'var(--erp-text-muted)',
                                        background: 'transparent',
                                      }}
                                      onClick={() => handleDeleteSubtask(task.id, subtask.id)}
                                      title="Remove subtask"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Subtask Button: Opens Modal */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{
                              height: '26px',
                              padding: '0 8px',
                              fontSize: '11.5px',
                              gap: '4px',
                              border: '1px solid var(--erp-border)',
                            }}
                            onClick={() => handleOpenAddSubtask(task.id)}
                            title="Add subtask"
                          >
                            <Plus size={12} />
                            <span>Add Subtask</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENT */}
        {activeTab === 'document' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                className="erp-btn erp-btn-primary erp-btn-sm"
                onClick={() => setIsUploadDocModalOpen(true)}
              >
                <Plus size={14} />
                <span>Upload Document</span>
              </button>
            </div>

            {projectDocuments.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px',
                  border: '1px dashed var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  color: 'var(--erp-text-muted)',
                  fontSize: '13px',
                }}
              >
                No documents found for this project.
              </div>
            ) : (
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Document Type</th>
                    <th>Uploaded By</th>
                    <th>Uploaded Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDocuments.map(doc => {
                    const isDefault = doc.id === 1 || doc.id === 2 || doc.is_default;
                    const docType = formatShortDocType(doc.document_type, doc.id);
                    const isSchedule = docType.toLowerCase().includes('schedule');
                    const isResource = docType.toLowerCase().includes('resource') || docType.toLowerCase().includes('specification') || docType.toLowerCase().includes('material');

                    return (
                      <tr key={doc.id}>
                        <td>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => handleViewProjectDoc(doc)}
                            title={`View ${doc.name}`}
                          >
                            <FileText size={15} style={{ color: 'var(--erp-text-muted)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 400 }}>{doc.name}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`erp-badge ${isSchedule ? 'erp-badge-emerald' : isResource ? 'erp-badge-purple' : 'erp-badge-blue'}`}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {docType}
                          </span>
                        </td>
                        <td>{isDefault ? 'Default' : (doc.uploaded_by || 'Admin')}</td>
                        <td>{isDefault ? 'Default' : doc.uploaded_at}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{ position: 'relative', display: 'inline-block' }}
                            className="erp-export-menu-container"
                          >
                            <button
                              type="button"
                              className="erp-btn erp-btn-secondary erp-btn-sm"
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                fontSize: '12px',
                                gap: '4px',
                                border: '1px solid var(--erp-border)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === doc.id ? null : doc.id);
                              }}
                              title="Actions"
                              aria-label="Actions"
                            >
                              <MoreHorizontal size={14} />
                            </button>

                            {openActionMenuId === doc.id && (
                              <div className="erp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={() => handleViewProjectDoc(doc)}
                                >
                                  <Eye size={13} style={{ color: 'var(--erp-primary)' }} />
                                  <span>View</span>
                                </button>

                                {isDefault ? (
                                  <>
                                    <button
                                      type="button"
                                      className="erp-dropdown-item"
                                      onClick={() => {
                                        handleExportDefaultDoc(doc.id, 'pdf');
                                        setOpenActionMenuId(null);
                                      }}
                                    >
                                      <FileText size={13} style={{ color: '#ef4444' }} />
                                      <span>Export PDF</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="erp-dropdown-item"
                                      onClick={() => {
                                        handleExportDefaultDoc(doc.id, 'word');
                                        setOpenActionMenuId(null);
                                      }}
                                    >
                                      <FileText size={13} style={{ color: '#2563eb' }} />
                                      <span>Export Word</span>
                                    </button>

                                    <div className="erp-dropdown-divider" />

                                    <button
                                      type="button"
                                      className="erp-dropdown-item"
                                      disabled
                                      style={{ opacity: 0.45, cursor: 'not-allowed', color: 'var(--erp-text-muted)' }}
                                      title="Default documents cannot be deleted"
                                    >
                                      <Trash2 size={13} />
                                      <span>Delete</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="erp-dropdown-item"
                                      onClick={() => {
                                        handleDownloadProjectDoc(doc);
                                        setOpenActionMenuId(null);
                                      }}
                                    >
                                      <Download size={13} />
                                      <span>Download File</span>
                                    </button>

                                    <div className="erp-dropdown-divider" />

                                    <button
                                      type="button"
                                      className="erp-dropdown-item"
                                      style={{ color: 'var(--erp-text-error)' }}
                                      onClick={() => {
                                        handleDeleteDoc(doc.id);
                                        setOpenActionMenuId(null);
                                      }}
                                    >
                                      <Trash2 size={13} />
                                      <span>Delete</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>


      {/* Modal 1: Assign Personnel */}
      <Modal
        isOpen={isAssignPersonnelModalOpen}
        onClose={() => setIsAssignPersonnelModalOpen(false)}
        title={editingPersonnelId ? "Edit Personnel Assignment" : "Assign Work & Personnel"}
        maxWidth="480px"
      >
        <form onSubmit={handleAssignPersonnelSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Name <span style={{ color: 'var(--erp-text-error)' }}>*</span></label>
              <input
                type="text"
                required
                placeholder="Enter person or team name"
                className="erp-input"
                value={personnelNameInput}
                onChange={e => setPersonnelNameInput(e.target.value)}
              />
            </div>
            <div className="erp-form-group">
              <label className="erp-form-label">Role <span style={{ color: 'var(--erp-text-error)' }}>*</span></label>
              <select
                className="erp-input"
                value={personnelRoleInput}
                onChange={e => setPersonnelRoleInput(e.target.value)}
              >
                <option value="Project Manager">Project Manager</option>
                <option value="Architecture">Architecture</option>
                <option value="Worker">Worker</option>
              </select>
            </div>
            <div className="erp-form-group">
              <label className="erp-form-label">Scope</label>
              <input
                type="text"
                placeholder="Enter assignment scope"
                className="erp-input"
                value={personnelScopeInput}
                onChange={e => setPersonnelScopeInput(e.target.value)}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsAssignPersonnelModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : (editingPersonnelId ? 'Update Personnel' : 'Save Personnel')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Assign Material (Manual Input) */}
      <Modal
        isOpen={isAssignMaterialModalOpen}
        onClose={() => {
          setIsAssignMaterialModalOpen(false);
          setEditingMaterialId(null);
        }}
        title={editingMaterialId ? 'Edit Project Material' : 'Assign Project Material'}
        maxWidth="500px"
      >
        <form onSubmit={handleAddMaterialSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">
                Material Name <span style={{ color: 'var(--erp-text-error)' }}>*</span>
              </label>
              <input
                type="text"
                className={`erp-input ${materialErrors.name ? 'erp-input-error' : ''}`}
                placeholder="Enter material name"
                value={materialNameInput}
                onChange={e => {
                  setMaterialNameInput(e.target.value);
                  if (materialErrors.name) setMaterialErrors(prev => ({ ...prev, name: '' }));
                }}
                autoFocus
              />
              {materialErrors.name && (
                <span className="erp-form-error">{materialErrors.name}</span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">
                Required Quantity <span style={{ color: 'var(--erp-text-error)' }}>*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="Enter required quantity"
                className={`erp-input ${materialErrors.qty ? 'erp-input-error' : ''}`}
                value={materialQtyInput}
                onChange={e => {
                  setMaterialQtyInput(e.target.value);
                  if (materialErrors.qty) setMaterialErrors(prev => ({ ...prev, qty: '' }));
                }}
              />
              {materialErrors.qty && (
                <span className="erp-form-error">{materialErrors.qty}</span>
              )}
            </div>

          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsAssignMaterialModalOpen(false);
                setEditingMaterialId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={!materialNameInput.trim() || !materialQtyInput}
            >
              {editingMaterialId ? 'Update Material' : 'Assign Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upload Document */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Project Document"
      >
        <form onSubmit={handleUploadDocSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Document Name *</label>
              <input
                type="text"
                required
                placeholder="Enter document title or reference"
                className="erp-input"
                value={newDoc.name}
                onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
              />
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Document Type</label>
              <select
                className="erp-select"
                value={newDoc.document_type}
                onChange={e => setNewDoc({ ...newDoc, document_type: e.target.value })}
              >
                <option value="General">General</option>
                <option value="Contract">Contract</option>
                <option value="Drawing">Drawing</option>
                <option value="Quotation">Quotation</option>
                <option value="Specification">Specification</option>
                <option value="Photo">Photo</option>
                <option value="Report">Report</option>
                <option value="Schedule">Schedule</option>
              </select>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Attach File</label>
              <input
                type="file"
                className="erp-input"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setNewDoc(prev => ({
                      ...prev,
                      file_name: f.name,
                      name: prev.name || f.name.replace(/\.[^/.]+$/, ''),
                    }));
                  }
                }}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsUploadDocModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Project Payment */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title="Record Project Payment"
      >
        <form onSubmit={handleRecordPaymentSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Payment Amount ($) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className={`erp-input ${paymentFormErrors.amount ? 'erp-input-error' : ''}`}
                value={newPayment.amount || ''}
                onChange={e => {
                  setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 });
                  if (paymentFormErrors.amount) setPaymentFormErrors(prev => ({ ...prev, amount: '' }));
                }}
              />
              {paymentFormErrors.amount && (
                <span className="erp-form-error">{paymentFormErrors.amount}</span>
              )}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Payment Date</label>
                <input
                  type="date"
                  className="erp-input"
                  value={newPayment.payment_date}
                  onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Payment Method</label>
                <select
                  className="erp-select"
                  value={newPayment.payment_method}
                  onChange={e => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Reference Number (Optional)</label>
              <input
                type="text"
                placeholder="Enter transaction or cheque reference number"
                className="erp-input"
                value={newPayment.reference_number}
                onChange={e => setNewPayment({ ...newPayment, reference_number: e.target.value })}
              />
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Enter payment notes or terms"
                className="erp-textarea"
                value={newPayment.notes}
                onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsRecordPaymentModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>


      {/* Modal 6: Create or Edit Task */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTaskId ? 'Edit Task' : 'Add New Task'}
        maxWidth="440px"
      >
        <form onSubmit={handleSaveTaskSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">
                Task Name <span style={{ color: 'var(--erp-text-error)' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter task or milestone name"
                className="erp-input"
                style={taskFormError ? { borderColor: 'var(--erp-border-error)' } : undefined}
                value={taskNameInput}
                onChange={e => {
                  setTaskNameInput(e.target.value);
                  if (taskFormError) setTaskFormError('');
                }}
              />
              {taskFormError && (
                <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                  {taskFormError}
                </span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Description (Optional)</label>
              <input
                type="text"
                placeholder="Brief description or instructions"
                className="erp-input"
                value={taskDescInput}
                onChange={e => setTaskDescInput(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">
                  Start Date <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  className="erp-input"
                  style={taskDateErrors.start ? { borderColor: 'var(--erp-border-error)' } : undefined}
                  value={taskStartDateInput}
                  onChange={e => {
                    setTaskStartDateInput(e.target.value);
                    if (taskDateErrors.start) setTaskDateErrors(prev => ({ ...prev, start: undefined }));
                  }}
                />
                {taskDateErrors.start && (
                  <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                    {taskDateErrors.start}
                  </span>
                )}
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">
                  Est. End Date <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  className="erp-input"
                  style={taskDateErrors.end ? { borderColor: 'var(--erp-border-error)' } : undefined}
                  value={taskEndDateInput}
                  onChange={e => {
                    setTaskEndDateInput(e.target.value);
                    if (taskDateErrors.end) setTaskDateErrors(prev => ({ ...prev, end: undefined }));
                  }}
                />
                {taskDateErrors.end && (
                  <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                    {taskDateErrors.end}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary">
              {editingTaskId ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 7: Edit Subtask Name & Progress */}
      <Modal
        isOpen={isSubtaskModalOpen}
        onClose={() => {
          setIsSubtaskModalOpen(false);
          setEditingSubtaskData(null);
        }}
        title="Edit Subtask"
        maxWidth="440px"
      >
        {editingSubtaskData && (
          <form onSubmit={handleSaveSubtaskSubmit}>
            <div className="erp-modal-body">
              <div className="erp-form-group">
                <label className="erp-form-label">
                  Subtask Name <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter subtask title"
                  className="erp-input"
                  style={subtaskFormError ? { borderColor: 'var(--erp-border-error)' } : undefined}
                  value={editingSubtaskData.title}
                  onChange={e => {
                    setEditingSubtaskData(prev => (prev ? { ...prev, title: e.target.value } : null));
                    if (subtaskFormError) setSubtaskFormError('');
                  }}
                />
                {subtaskFormError && (
                  <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                    {subtaskFormError}
                  </span>
                )}
              </div>

              {/* Parent task date boundaries */}
              {(() => {
                const parentTask = tasks.find(t => t.id === editingSubtaskData.taskId);
                const parentStart = parentTask?.start_date;
                const parentEnd = parentTask?.est_end_date || parentTask?.end_date;

                return (
                  <div className="erp-form-row">
                    <div className="erp-form-group">
                      <label className="erp-form-label">
                        Start Date <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="erp-input"
                        min={parentStart || undefined}
                        max={editingSubtaskData.est_end_date || parentEnd || undefined}
                        style={editSubtaskDateErrors.start ? { borderColor: 'var(--erp-border-error)' } : undefined}
                        value={editingSubtaskData.start_date || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingSubtaskData(prev => prev ? { ...prev, start_date: val } : null);
                          if (editSubtaskDateErrors.start || editSubtaskDateErrors.end) {
                            setEditSubtaskDateErrors(validateSubtaskDates(val, editingSubtaskData.est_end_date, parentStart, parentEnd));
                          }
                        }}
                      />
                      {editSubtaskDateErrors.start && (
                        <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                          {editSubtaskDateErrors.start}
                        </span>
                      )}
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-form-label">
                        Est. End Date <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="erp-input"
                        min={editingSubtaskData.start_date || parentStart || undefined}
                        max={parentEnd || undefined}
                        style={editSubtaskDateErrors.end ? { borderColor: 'var(--erp-border-error)' } : undefined}
                        value={editingSubtaskData.est_end_date || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingSubtaskData(prev => prev ? { ...prev, est_end_date: val } : null);
                          if (editSubtaskDateErrors.start || editSubtaskDateErrors.end) {
                            setEditSubtaskDateErrors(validateSubtaskDates(editingSubtaskData.start_date, val, parentStart, parentEnd));
                          }
                        }}
                      />
                      {editSubtaskDateErrors.end && (
                        <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                          {editSubtaskDateErrors.end}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="erp-form-group">
                <label className="erp-form-label">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief description or notes"
                  className="erp-input"
                  value={editingSubtaskData.description || ''}
                  onChange={e =>
                    setEditingSubtaskData(prev =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                />
              </div>

              <div className="erp-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="erp-form-label" style={{ marginBottom: 0 }}>Progress</label>
                  <span
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: editingSubtaskData.progress === 100 ? '#059669' : 'var(--erp-primary)',
                    }}
                  >
                    {editingSubtaskData.progress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={editingSubtaskData.progress}
                  onChange={e =>
                    setEditingSubtaskData(prev =>
                      prev ? { ...prev, progress: Number(e.target.value) } : null
                    )
                  }
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    accentColor: editingSubtaskData.progress === 100 ? '#059669' : 'var(--erp-primary)',
                  }}
                />
              </div>
            </div>

            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => {
                  setIsSubtaskModalOpen(false);
                  setEditingSubtaskData(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="erp-btn erp-btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 8: Add Subtask Modal */}
      <Modal
        isOpen={isAddSubtaskModalOpen}
        onClose={() => {
          setIsAddSubtaskModalOpen(false);
          setAddSubtaskTargetTaskId(null);
        }}
        title="Add Subtask"
        maxWidth="440px"
      >
        <form onSubmit={handleAddSubtaskSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">
                Subtask Name <span style={{ color: 'var(--erp-text-error)' }}>*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Enter subtask title"
                className="erp-input"
                style={addSubtaskFormError ? { borderColor: 'var(--erp-border-error)' } : undefined}
                value={subtaskTitleInput}
                onChange={e => {
                  setSubtaskTitleInput(e.target.value);
                  if (addSubtaskFormError) setAddSubtaskFormError('');
                }}
              />
              {addSubtaskFormError && (
                <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                  {addSubtaskFormError}
                </span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Description (Optional)</label>
              <input
                type="text"
                placeholder="Brief description or notes"
                className="erp-input"
                value={subtaskDescInput}
                onChange={e => setSubtaskDescInput(e.target.value)}
              />
            </div>

            {/* Parent task date boundaries */}
            {(() => {
              const parentTask = tasks.find(t => t.id === addSubtaskTargetTaskId);
              const parentStart = parentTask?.start_date;
              const parentEnd = parentTask?.est_end_date || parentTask?.end_date;

              return (
                <div className="erp-form-row">
                  <div className="erp-form-group">
                    <label className="erp-form-label">
                      Start Date <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="erp-input"
                      min={parentStart || undefined}
                      max={subtaskEstEndDateInput || parentEnd || undefined}
                      style={addSubtaskDateErrors.start ? { borderColor: 'var(--erp-border-error)' } : undefined}
                      value={subtaskStartDateInput}
                      onChange={e => {
                        const val = e.target.value;
                        setSubtaskStartDateInput(val);
                        if (addSubtaskDateErrors.start || addSubtaskDateErrors.end) {
                          setAddSubtaskDateErrors(validateSubtaskDates(val, subtaskEstEndDateInput, parentStart, parentEnd));
                        }
                      }}
                    />
                    {addSubtaskDateErrors.start && (
                      <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                        {addSubtaskDateErrors.start}
                      </span>
                    )}
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">
                      Est. End Date <span style={{ color: 'var(--erp-text-error)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="erp-input"
                      min={subtaskStartDateInput || parentStart || undefined}
                      max={parentEnd || undefined}
                      style={addSubtaskDateErrors.end ? { borderColor: 'var(--erp-border-error)' } : undefined}
                      value={subtaskEstEndDateInput}
                      onChange={e => {
                        const val = e.target.value;
                        setSubtaskEstEndDateInput(val);
                        if (addSubtaskDateErrors.start || addSubtaskDateErrors.end) {
                          setAddSubtaskDateErrors(validateSubtaskDates(subtaskStartDateInput, val, parentStart, parentEnd));
                        }
                      }}
                    />
                    {addSubtaskDateErrors.end && (
                      <span style={{ fontSize: '12px', color: 'var(--erp-text-error)', marginTop: '4px' }}>
                        {addSubtaskDateErrors.end}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsAddSubtaskModalOpen(false);
                setAddSubtaskTargetTaskId(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary">
              Add Subtask
            </button>
          </div>
        </form>
      </Modal>



    </div>
  );
};
