import { describe, expect, it } from "vitest";
import { calculateProgress, getCompletedCount } from "./progress";
import type { Task } from "./types";

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
