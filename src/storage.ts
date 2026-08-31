import type { Project, Task } from "./types";

export const STORAGE_KEY = "minimal-progress-tracker:v1";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

interface StoredData {
  version: 1;
  projects: Project[];
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.name === "string" &&
    task.name.trim().length > 0 &&
    typeof task.completed === "boolean"
  );
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    project.name.trim().length > 0 &&
    Array.isArray(project.tasks) &&
    project.tasks.every(isTask)
  );
}

export function loadProjects(storage?: StorageReader | null): Project[] {
  try {
    const target =
      storage === undefined
        ? typeof window === "undefined"
          ? null
          : window.localStorage
        : storage;
    if (!target) return [];

    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return [];
    const parsed = data as Partial<StoredData>;
    if (parsed.version !== 1 || !Array.isArray(parsed.projects)) return [];
    return parsed.projects.filter(isProject);
  } catch {
    return [];
  }
}

export function saveProjects(
  projects: Project[],
  storage?: StorageWriter | null,
): boolean {
  try {
    const target =
      storage === undefined
        ? typeof window === "undefined"
          ? null
          : window.localStorage
        : storage;
    if (!target) return false;

    const data: StoredData = { version: 1, projects };
    target.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
