import {
  MAX_COUNTER_TOTAL,
  type CounterProgress,
  type Project,
  type Task,
} from "./types";

// Keep this pre-Stepmark key stable so existing browser data and backup files
// remain compatible across the product rename and future schema versions.
export const STORAGE_KEY = "progress-tracker:projects";
export const LEGACY_STORAGE_KEYS = ["minimal-progress-tracker:v1"] as const;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;
type StorageAccess = StorageReader & StorageWriter;

interface StoredData {
  version: 2;
  projects: Project[];
}

interface ProjectsBackup extends StoredData {
  app: "progress-tracker";
  exportedAt: string;
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

function isCounter(value: unknown): value is CounterProgress {
  if (!value || typeof value !== "object") return false;
  const counter = value as Record<string, unknown>;
  return (
    Number.isInteger(counter.completed) &&
    Number.isInteger(counter.total) &&
    (counter.completed as number) >= 0 &&
    (counter.total as number) > 0 &&
    (counter.total as number) <= MAX_COUNTER_TOTAL &&
    (counter.completed as number) <= (counter.total as number) &&
    typeof counter.unit === "string" &&
    counter.unit.trim().length > 0 &&
    counter.unit.length <= 40
  );
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const project = value as Record<string, unknown>;
  if (
    typeof project.id !== "string" ||
    typeof project.name !== "string" ||
    project.name.trim().length === 0 ||
    !Array.isArray(project.tasks) ||
    !project.tasks.every(isTask)
  ) {
    return false;
  }
  if (project.counter === undefined) return true;
  return project.tasks.length === 0 && isCounter(project.counter);
}

function parseProjects(raw: string | null): Project[] | null {
  if (raw === null) return null;

  try {
    const data: unknown = JSON.parse(raw);
    if (Array.isArray(data)) return data.filter(isProject);
    if (!data || typeof data !== "object") return null;

    const parsed = data as { version?: unknown; projects?: unknown };
    if (
      parsed.version !== undefined &&
      parsed.version !== 1 &&
      parsed.version !== 2
    ) {
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

    const data: StoredData = { version: 2, projects };
    target.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function createProjectsBackup(
  projects: Project[],
  exportedAt = new Date(),
): string {
  const backup: ProjectsBackup = {
    app: "progress-tracker",
    version: 2,
    exportedAt: exportedAt.toISOString(),
    projects,
  };

  return JSON.stringify(backup, null, 2);
}

export function parseProjectsBackup(raw: string): Project[] | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;

    const backup = value as {
      app?: unknown;
      version?: unknown;
      exportedAt?: unknown;
      projects?: unknown;
    };
    if (
      backup.app !== "progress-tracker" ||
      (backup.version !== 1 && backup.version !== 2) ||
      typeof backup.exportedAt !== "string" ||
      Number.isNaN(Date.parse(backup.exportedAt)) ||
      !Array.isArray(backup.projects) ||
      !backup.projects.every(isProject)
    ) {
      return null;
    }

    return backup.projects as Project[];
  } catch {
    return null;
  }
}
