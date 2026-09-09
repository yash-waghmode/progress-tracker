import { describe, expect, it } from "vitest";
import { assembleProjects, createProjectRows } from "./cloudStorage";

describe("cloud project mapping", () => {
  it("assembles ordered database rows into the app's nested project shape", () => {
    expect(
      assembleProjects(
        [
          { id: "project-one", name: "Launch", position: 0 },
          { id: "project-two", name: "Learn", position: 1 },
          {
            id: "project-three",
            name: "Study OS",
            position: 2,
            tracking_mode: "counter",
            target_total: 20,
            current_value: 7,
            unit_label: "chapters",
          },
        ],
        [
          {
            id: "task-one",
            project_id: "project-one",
            name: "Plan",
            completed: true,
            position: 0,
          },
          {
            id: "task-two",
            project_id: "project-one",
            name: "Ship",
            completed: false,
            position: 1,
          },
        ],
      ),
    ).toEqual([
      {
        id: "project-one",
        name: "Launch",
        tasks: [
          { id: "task-one", name: "Plan", completed: true },
          { id: "task-two", name: "Ship", completed: false },
        ],
      },
      { id: "project-two", name: "Learn", tasks: [] },
      {
        id: "project-three",
        name: "Study OS",
        tasks: [],
        counter: { completed: 7, total: 20, unit: "chapters" },
      },
    ]);
  });

  it("maps both tracking modes to cloud project rows", () => {
    expect(
      createProjectRows(
        [
          { id: "tasks", name: "Launch", tasks: [] },
          {
            id: "counter",
            name: "Study OS",
            tasks: [],
            counter: { completed: 7, total: 20, unit: "chapters" },
          },
        ],
        "user-one",
      ),
    ).toEqual([
      {
        id: "tasks",
        user_id: "user-one",
        name: "Launch",
        position: 0,
        tracking_mode: "tasks",
        target_total: null,
        current_value: null,
        unit_label: null,
      },
      {
        id: "counter",
        user_id: "user-one",
        name: "Study OS",
        position: 1,
        tracking_mode: "counter",
        target_total: 20,
        current_value: 7,
        unit_label: "chapters",
      },
    ]);
  });
});
