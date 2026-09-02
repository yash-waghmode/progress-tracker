import { describe, expect, it } from "vitest";
import { assembleProjects } from "./cloudStorage";

describe("cloud project mapping", () => {
  it("assembles ordered database rows into the app's nested project shape", () => {
    expect(
      assembleProjects(
        [
          { id: "project-one", name: "Launch", position: 0 },
          { id: "project-two", name: "Learn", position: 1 },
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
    ]);
  });
});
