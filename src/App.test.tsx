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
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { STORAGE_KEY } from "./storage";

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

let storage: BrowserStorage;

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

describe("progress tracker flow", () => {
  it("loads stored projects before rendering without a startup write", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: "stored-project",
            name: "Stored launch",
            tasks: [
              { id: "one", name: "Plan", completed: true },
              { id: "two", name: "Build", completed: true },
              { id: "three", name: "Ship", completed: false },
            ],
          },
        ],
      }),
    );
    storage.writes.length = 0;

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(screen.getByRole("heading", { name: "Stored launch" })).toBeTruthy();
    expect(screen.getByText("2 of 3")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "67",
    );
    expect(storage.writes).toEqual([]);
  });

  it("persists creations and completion through remounts and simulated server restarts", async () => {
    const user = userEvent.setup();
    const view = render(<App />);

    expect(window.location.origin).toBe("http://127.0.0.1:5173");

    expect(screen.getByText("A clear place to begin.")).toBeTruthy();

    const projectInput = screen.getByLabelText("Project name");
    await user.type(projectInput, "Website launch{Enter}");
    expect(
      screen.getByRole("heading", { name: "Website launch" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(projectInput);
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
        "Website launch",
      );
    });

    const taskInput = screen.getByLabelText("Add a task to Website launch");
    await user.type(taskInput, "Review final copy{Enter}");
    await user.type(taskInput, "Publish site{Enter}");
    await user.type(taskInput, "Notify customers{Enter}");
    expect(screen.getByText("0 of 3")).toBeTruthy();
    await waitFor(() => {
      const persisted = window.localStorage.getItem(STORAGE_KEY) ?? "";
      expect(persisted).toContain("Review final copy");
      expect(persisted).toContain("Publish site");
      expect(persisted).toContain("Notify customers");
    });

    await user.click(
      screen.getByRole("checkbox", {
        name: "Mark Review final copy as complete",
      }),
    );
    expect(screen.getByText("1 of 3")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "33",
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Mark Publish site as complete" }),
    );
    expect(screen.getByText("2 of 3")).toBeTruthy();
    expect(screen.getByText("67% complete")).toBeTruthy();

    let persistedBeforeRestart = "";
    await waitFor(() => {
      persistedBeforeRestart = window.localStorage.getItem(STORAGE_KEY) ?? "";
      expect(persistedBeforeRestart).toContain("Website launch");
      expect(persistedBeforeRestart).toContain("Notify customers");
    });

    view.unmount();
    const restartedView = render(<App />);
    expect(
      screen.getByRole("heading", { name: "Website launch" }),
    ).toBeTruthy();
    expect(screen.getByText("2 of 3")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "67",
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      persistedBeforeRestart,
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: "Mark Notify customers as complete",
      }),
    );
    expect(screen.getByText("3 of 3")).toBeTruthy();
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
        '"name":"Notify customers","completed":true',
      );
    });

    restartedView.unmount();
    render(<App />);
    expect(screen.getByText("3 of 3")).toBeTruthy();
    expect(screen.getByText("100% complete")).toBeTruthy();
  });

  it("persists deleting every project as an intentional empty collection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Project name"), "Temporary{Enter}");

    await user.click(
      screen.getByRole("button", { name: "Delete project Temporary" }),
    );
    expect(screen.getByText("A clear place to begin.")).toBeTruthy();

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

  it("rejects blank names without submitting or reloading", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add project" }));
    expect(screen.getByRole("alert").textContent).toBe("Enter a project name.");

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "   " },
    });
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("article")).toBeNull();
  });
});
