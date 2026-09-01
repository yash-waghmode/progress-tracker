import { describe, expect, it } from "vitest";
import {
  calculateOverallProgress,
  calculateProgress,
  getCompletedCount,
} from "./progress";
import type { Project, Task } from "./types";

const task = (completed: boolean): Task => ({
  id: crypto.randomUUID(),
  name: "Task",
  completed,
});

describe("project progress", () => {
  it("returns zero for a project without tasks", () => {
    expect(calculateProgress([])).toBe(0);
    expect(getCompletedCount([])).toBe(0);
  });

  it("calculates completion from completed tasks only", () => {
    const tasks = [task(true), task(false), task(true)];
    expect(getCompletedCount(tasks)).toBe(2);
    expect(calculateProgress(tasks)).toBe(67);
  });

  it("returns one hundred when every task is complete", () => {
    expect(calculateProgress([task(true), task(true)])).toBe(100);
  });
});

describe("overall progress", () => {
  it("returns zero with no projects or only projects without tasks", () => {
    expect(calculateOverallProgress([])).toEqual({
      completed: 0,
      total: 0,
      percentage: 0,
    });
    expect(
      calculateOverallProgress([
        { id: "empty-1", name: "Empty one", tasks: [] },
        { id: "empty-2", name: "Empty two", tasks: [] },
      ]),
    ).toEqual({ completed: 0, total: 0, percentage: 0 });
  });

  it("combines completed tasks across projects and weights by task count", () => {
    const projects: Project[] = [
      {
        id: "small",
        name: "Small complete project",
        tasks: [task(true)],
      },
      {
        id: "large",
        name: "Large incomplete project",
        tasks: [task(false), task(false), task(false)],
      },
    ];

    expect(calculateOverallProgress(projects)).toEqual({
      completed: 1,
      total: 4,
      percentage: 25,
    });
  });

  it("uses the same rounding rule as project progress", () => {
    const projects: Project[] = [
      {
        id: "one",
        name: "One",
        tasks: [task(true), task(true)],
      },
      {
        id: "two",
        name: "Two",
        tasks: [task(false)],
      },
    ];

    expect(calculateOverallProgress(projects).percentage).toBe(67);
  });
});
