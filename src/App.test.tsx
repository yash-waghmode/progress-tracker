// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://127.0.0.1:5173/" }

import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { STORAGE_KEY } from "./storage";
import type { Project } from "./types";

class BrowserStorage implements Storage {
  private values = new Map<string, string>();
  readonly writes: Array<{ key: string; value: string }> = [];

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
    this.writes.push({ key, value });
  }
}

const storedProjects: Project[] = [
  {
    id: "stored-project",
    name: "Stored launch",
    tasks: [
      { id: "one", name: "Plan", completed: true },
      { id: "two", name: "Build", completed: true },
      { id: "three", name: "Ship", completed: false },
    ],
  },
  {
    id: "second-project",
    name: "Customer rollout",
    tasks: [{ id: "four", name: "Invite customers", completed: false }],
  },
];

let storage: BrowserStorage;

function seedProjects(projects: Project[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects }));
  storage.writes.length = 0;
}

function overallProgress() {
  return screen.getByRole("progressbar", { name: "Overall progress" });
}

beforeEach(() => {
  storage = new BrowserStorage();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("project overview and disclosure", () => {
  it("renders compact summaries collapsed and expands only one project at a time", async () => {
    seedProjects(storedProjects);
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("2 of 3 tasks")).toBeTruthy();
    expect(screen.getByText("0 of 1 tasks")).toBeTruthy();

    const firstDisclosure = screen.getByRole("button", {
      name: "Expand Stored launch",
    });
    const secondDisclosure = screen.getByRole("button", {
      name: "Expand Customer rollout",
    });
    expect(firstDisclosure.getAttribute("aria-expanded")).toBe("false");
    expect(secondDisclosure.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("checkbox")).toBeNull();

    await user.click(firstDisclosure);
    expect(
      screen.getByRole("button", { name: "Collapse Stored launch" }),
    ).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Mark Plan/ })).toBeTruthy();

    await user.click(secondDisclosure);
    expect(
      screen.getByRole("button", { name: "Expand Stored launch" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse Customer rollout" }),
    ).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /Mark Plan/ })).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: /Mark Invite customers/ }),
    ).toBeTruthy();
  });

  it("supports disclosure by keyboard with correct ARIA state", async () => {
    seedProjects(storedProjects.slice(0, 1));
    const user = userEvent.setup();
    render(<App />);

    const disclosure = screen.getByRole("button", {
      name: "Expand Stored launch",
    });
    disclosure.focus();
    await user.keyboard("{Enter}");

    const collapse = screen.getByRole("button", {
      name: "Collapse Stored launch",
    });
    expect(collapse.getAttribute("aria-expanded")).toBe("true");
    expect(collapse.getAttribute("aria-controls")).toBe(
      "project-body-stored-project",
    );

    await user.keyboard(" ");
    expect(
      screen.getByRole("button", { name: "Expand Stored launch" }),
    ).toBeTruthy();
  });

  it("automatically expands a new project and focuses its task input", async () => {
    seedProjects(storedProjects.slice(0, 1));
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Project name"), "Website launch");
    await user.click(screen.getByRole("button", { name: "Add project" }));

    expect(
      screen.getByRole("button", { name: "Expand Stored launch" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse Website launch" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText("Add a task to Website launch"),
    );
  });

  it("does not toggle disclosure when task and delete controls are used", async () => {
    seedProjects(storedProjects.slice(0, 1));
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Expand Stored launch" }),
    );
    const collapseName = "Collapse Stored launch";

    await user.click(
      screen.getByRole("checkbox", { name: "Mark Ship as complete" }),
    );
    expect(screen.getByRole("button", { name: collapseName })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete task Ship" }));
    expect(screen.getByRole("button", { name: collapseName })).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Delete project Stored launch" }),
    );
    expect(screen.getByRole("button", { name: collapseName })).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Confirm deletion of Stored launch" }),
    ).toBeTruthy();
  });
});

describe("progress and controls", () => {
  it("shows accessible zero overall progress with no projects", () => {
    render(<App />);

    expect(overallProgress().getAttribute("aria-valuenow")).toBe("0");
    expect(overallProgress().getAttribute("aria-valuetext")).toBe(
      "0% complete, 0 of 0 tasks complete",
    );
    expect(screen.getByText("0 of 0 tasks complete")).toBeTruthy();
  });

  it("combines restored data correctly without altering the stored schema", () => {
    seedProjects(storedProjects);
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(overallProgress().getAttribute("aria-valuenow")).toBe("50");
    expect(overallProgress().getAttribute("aria-valuetext")).toBe(
      "50% complete, 2 of 4 tasks complete",
    );
    expect(storage.writes).toEqual([]);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      version: 1,
      projects: storedProjects,
    });
  });

  it("recalculates after toggling, adding, and deleting a task", async () => {
    seedProjects(storedProjects.slice(0, 1));
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Expand Stored launch" }),
    );

    expect(overallProgress().getAttribute("aria-valuenow")).toBe("67");
    await user.click(
      screen.getByRole("checkbox", { name: "Mark Ship as complete" }),
    );
    expect(overallProgress().getAttribute("aria-valuenow")).toBe("100");

    const taskInput = screen.getByLabelText("Add a task to Stored launch");
    await user.type(taskInput, "Announce launch{Enter}");
    expect(overallProgress().getAttribute("aria-valuenow")).toBe("75");

    await user.click(
      screen.getByRole("button", { name: "Delete task Announce launch" }),
    );
    expect(overallProgress().getAttribute("aria-valuenow")).toBe("100");
  });

  it("recalculates when a project is deleted", async () => {
    seedProjects(storedProjects);
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Delete project Stored launch" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete project" }));

    expect(overallProgress().getAttribute("aria-valuenow")).toBe("0");
    expect(overallProgress().getAttribute("aria-valuetext")).toBe(
      "0% complete, 0 of 1 tasks complete",
    );
  });

  it("disables trimmed-empty project and task submissions", async () => {
    const user = userEvent.setup();
    render(<App />);

    const projectInput = screen.getByLabelText("Project name");
    const projectSubmit = screen.getByRole("button", { name: "Add project" });
    expect((projectSubmit as HTMLButtonElement).disabled).toBe(true);
    await user.type(projectInput, "   ");
    expect((projectSubmit as HTMLButtonElement).disabled).toBe(true);
    await user.clear(projectInput);
    await user.type(projectInput, "Valid project{Enter}");

    const taskInput = screen.getByLabelText("Add a task to Valid project");
    const taskSubmit = screen.getByRole("button", {
      name: "Add task to Valid project",
    });
    expect((taskSubmit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(taskInput, { target: { value: "   " } });
    expect((taskSubmit as HTMLButtonElement).disabled).toBe(true);
    await user.type(taskInput, "A real task");
    expect((taskSubmit as HTMLButtonElement).disabled).toBe(false);
  });

  it("creates and updates a number-based project without named tasks", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("Number goal"));
    await user.type(screen.getByLabelText("Project name"), "Study OS");
    await user.type(screen.getByLabelText("Total"), "20");
    await user.type(screen.getByLabelText("Unit (optional)"), "chapters");
    await user.click(screen.getByRole("button", { name: "Add project" }));

    expect(screen.getByText("0 of 20 chapters")).toBeTruthy();
    const completedInput = screen.getByLabelText(
      "Completed chapters for Study OS",
    );
    expect(document.activeElement).toBe(completedInput);
    expect(screen.queryByLabelText("Add a task to Study OS")).toBeNull();

    await user.click(
      screen.getByRole("button", {
        name: "Increase completed chapters for Study OS",
      }),
    );
    expect(screen.getByText("1 of 20 chapters")).toBeTruthy();

    fireEvent.change(completedInput, { target: { value: "7" } });
    expect(screen.getByText("7 of 20 chapters")).toBeTruthy();
    expect(overallProgress().getAttribute("aria-valuenow")).toBe("35");
    expect(overallProgress().getAttribute("aria-valuetext")).toBe(
      "35% complete, 7 of 20 steps complete",
    );
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toMatchObject({
      version: 2,
      projects: [
        {
          name: "Study OS",
          tasks: [],
          counter: { completed: 7, total: 20, unit: "chapters" },
        },
      ],
    });
  });
});

describe("persistence regressions", () => {
  it("loads stored projects before rendering without a startup write", () => {
    seedProjects(storedProjects.slice(0, 1));
    render(<App />);

    expect(screen.getByRole("heading", { name: "Stored launch" })).toBeTruthy();
    expect(screen.getByText("2 of 3 tasks")).toBeTruthy();
    expect(
      screen
        .getByRole("progressbar", { name: "Stored launch progress" })
        .getAttribute("aria-valuenow"),
    ).toBe("67");
    expect(storage.writes).toEqual([]);
  });

  it("persists creations and completion through remounts and simulated server restarts", async () => {
    const user = userEvent.setup();
    const view = render(<App />);

    expect(window.location.origin).toBe("http://127.0.0.1:5173");
    await user.type(
      screen.getByLabelText("Project name"),
      "Website launch{Enter}",
    );
    const taskInput = screen.getByLabelText("Add a task to Website launch");
    await user.type(taskInput, "Review final copy{Enter}");
    await user.type(taskInput, "Publish site{Enter}");
    await user.type(taskInput, "Notify customers{Enter}");

    await user.click(
      screen.getByRole("checkbox", {
        name: "Mark Review final copy as complete",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Mark Publish site as complete" }),
    );

    let persistedBeforeRestart = "";
    await waitFor(() => {
      persistedBeforeRestart = window.localStorage.getItem(STORAGE_KEY) ?? "";
      expect(persistedBeforeRestart).toContain("Notify customers");
    });

    view.unmount();
    render(<App />);
    expect(screen.getByText("2 of 3 tasks")).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      persistedBeforeRestart,
    );

    await user.click(
      screen.getByRole("button", { name: "Expand Website launch" }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Mark Notify customers as complete",
      }),
    );
    expect(screen.getByText("100% complete")).toBeTruthy();

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
        '"name":"Notify customers","completed":true',
      );
    });
  });

  it("persists deleting every project as an intentional empty collection", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Project name"), "Temporary{Enter}");
    await user.click(
      screen.getByRole("button", { name: "Delete project Temporary" }),
    );

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
        '"projects":[]',
      );
    });

    cleanup();
    render(<App />);
    expect(screen.getByText("A clear place to begin.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Temporary" })).toBeNull();
  });

  it("renders an empty state safely when stored data is malformed", () => {
    storage.setItem(STORAGE_KEY, "{broken");
    expect(() => render(<App />)).not.toThrow();
    expect(screen.getByText("A clear place to begin.")).toBeTruthy();
  });

  it("uses reduced motion to remove tasks immediately", async () => {
    seedProjects(storedProjects.slice(0, 1));
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Expand Stored launch" }),
    );

    const article = screen.getByRole("article");
    await user.click(
      within(article).getByRole("button", { name: "Delete task Ship" }),
    );
    expect(screen.queryByRole("checkbox", { name: /Mark Ship/ })).toBeNull();
  });
});
