import type { Task } from "./types";

export function getCompletedCount(tasks: Task[]): number {
  return tasks.reduce((count, task) => count + (task.completed ? 1 : 0), 0);
}

export function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((getCompletedCount(tasks) / tasks.length) * 100);
}
