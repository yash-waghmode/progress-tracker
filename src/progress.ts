import type { Project, Task } from "./types";

export function getCompletedCount(tasks: Task[]): number {
  return tasks.reduce((count, task) => count + (task.completed ? 1 : 0), 0);
}

export function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((getCompletedCount(tasks) / tasks.length) * 100);
}

export interface OverallProgress {
  completed: number;
  total: number;
  percentage: number;
}

export function calculateOverallProgress(projects: Project[]): OverallProgress {
  const totals = projects.reduce(
    (summary, project) => ({
      completed: summary.completed + getCompletedCount(project.tasks),
      total: summary.total + project.tasks.length,
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
