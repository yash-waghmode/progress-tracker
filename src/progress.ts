import type { Project, Task } from "./types";

export function getCompletedCount(tasks: Task[]): number {
  return tasks.reduce((count, task) => count + (task.completed ? 1 : 0), 0);
}

export function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((getCompletedCount(tasks) / tasks.length) * 100);
}

export function getProjectCompleted(project: Project): number {
  return project.counter?.completed ?? getCompletedCount(project.tasks);
}

export function getProjectTotal(project: Project): number {
  return project.counter?.total ?? project.tasks.length;
}

export function calculateProjectProgress(project: Project): number {
  const total = getProjectTotal(project);
  if (total === 0) return 0;
  return Math.round((getProjectCompleted(project) / total) * 100);
}

export interface OverallProgress {
  completed: number;
  total: number;
  percentage: number;
}

export function calculateOverallProgress(projects: Project[]): OverallProgress {
  const totals = projects.reduce(
    (summary, project) => ({
      completed: summary.completed + getProjectCompleted(project),
      total: summary.total + getProjectTotal(project),
    }),
    { completed: 0, total: 0 },
  );

  return {
    ...totals,
    percentage:
      totals.total === 0
        ? 0
        : Math.round((totals.completed / totals.total) * 100),
  };
}
