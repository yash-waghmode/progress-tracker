import type { Project, Task } from "./types";

// Keep this key stable across schema versions so the development origin and key
// remain the two durable coordinates for a user's data.
export const STORAGE_KEY = "progress-tracker:projects";
export const LEGACY_STORAGE_KEYS = ["minimal-progress-tracker:v1"] as const;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;
type StorageAccess = StorageReader & StorageWriter;

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

function parseProjects(raw: string | null): Project[] | null {
  if (raw === null) return null;

  try {
    const data: unknown = JSON.parse(raw);
    if (Array.isArray(data)) return data.filter(isProject);
    if (!data || typeof data !== "object") return null;

    const parsed = data as Partial<StoredData>;
    if (parsed.version !== undefined && parsed.version !== 1) {
      return null;
    }
    if (!Array.isArray(parsed.projects)) return null;
    return parsed.projects.filter(isProject);
  } catch {
    return null;
  }
}

function getBrowserStorage(): StorageAccess | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readProjects(storage: StorageReader, key: string): Project[] | null {
  try {
    return parseProjects(storage.getItem(key));
  } catch {
    return null;
  }
}

export function loadProjects(storage?: StorageAccess | null): Project[] {
  const target = storage === undefined ? getBrowserStorage() : storage;
  if (!target) return [];

  const current = readProjects(target, STORAGE_KEY);
  if (current !== null) return current;

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = readProjects(target, key);
    if (legacy !== null) {
      saveProjects(legacy, target);
      return legacy;
    }
  }

  return [];
}

export function saveProjects(
  projects: Project[],
  storage?: StorageWriter | null,
): boolean {
  try {
    const target = storage === undefined ? getBrowserStorage() : storage;
    if (!target) return false;

    const data: StoredData = { version: 1, projects };
    target.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
