import { describe, expect, it } from "vitest";
import { loadProjects, saveProjects, STORAGE_KEY } from "./storage";
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
});
