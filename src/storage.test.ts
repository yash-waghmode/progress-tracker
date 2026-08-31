import { describe, expect, it } from "vitest";
import {
  LEGACY_STORAGE_KEYS,
  loadProjects,
  saveProjects,
  STORAGE_KEY,
} from "./storage";
import type { Project } from "./types";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const projects: Project[] = [
  {
    id: "project-1",
    name: "Launch site",
    tasks: [{ id: "task-1", name: "Review copy", completed: true }],
  },
];

describe("project persistence", () => {
  it("saves and restores project data", () => {
    const storage = new MemoryStorage();
    expect(saveProjects(projects, storage)).toBe(true);
    expect(loadProjects(storage)).toEqual(projects);
  });

  it("returns an empty list for corrupt data", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{broken");
    expect(loadProjects(storage)).toEqual([]);
  });

  it("migrates projects from the previously used key without loss", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_STORAGE_KEYS[0],
      JSON.stringify({ version: 1, projects }),
    );

    expect(loadProjects(storage)).toEqual(projects);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      version: 1,
      projects,
    });
  });

  it("migrates the supported unversioned project-array schema", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEYS[0], JSON.stringify(projects));

    expect(loadProjects(storage)).toEqual(projects);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      version: 1,
      projects,
    });
  });

  it("keeps an intentionally empty current collection empty", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects: [] }));
    storage.setItem(
      LEGACY_STORAGE_KEYS[0],
      JSON.stringify({ version: 1, projects }),
    );

    expect(loadProjects(storage)).toEqual([]);
  });

  it("recovers valid legacy data when the current entry is malformed", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{broken");
    storage.setItem(
      LEGACY_STORAGE_KEYS[0],
      JSON.stringify({ version: 1, projects }),
    );

    expect(loadProjects(storage)).toEqual(projects);
  });

  it("filters malformed projects without losing valid ones", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, projects: [...projects, { id: 2 }] }),
    );
    expect(loadProjects(storage)).toEqual(projects);
  });

  it("fails safely when storage is unavailable", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error("Storage blocked");
      },
      setItem: () => {
        throw new Error("Storage blocked");
      },
    };

    expect(loadProjects(unavailableStorage)).toEqual([]);
    expect(saveProjects(projects, unavailableStorage)).toBe(false);
  });

  it("restores legacy projects even when migration cannot be written", () => {
    const storage = {
      getItem: (key: string) =>
        key === LEGACY_STORAGE_KEYS[0]
          ? JSON.stringify({ version: 1, projects })
          : null,
      setItem: () => {
        throw new Error("Storage is read-only");
      },
    };

    expect(loadProjects(storage)).toEqual(projects);
  });
});
