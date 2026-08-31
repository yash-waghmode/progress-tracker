// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://localhost/" }

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
  }
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new BrowserStorage(),
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
  it("creates, completes, restores, and removes project data", async () => {
    const user = userEvent.setup();
    const view = render(<App />);

    expect(screen.getByText("A clear place to begin.")).toBeTruthy();

    const projectInput = screen.getByLabelText("Project name");
    await user.type(projectInput, "Website launch{Enter}");
    expect(
      screen.getByRole("heading", { name: "Website launch" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(projectInput);

    const taskInput = screen.getByLabelText("Add a task to Website launch");
    await user.type(taskInput, "Review final copy{Enter}");
    await user.type(taskInput, "Publish site{Enter}");
    expect(screen.getByText("0 of 2")).toBeTruthy();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Mark Review final copy as complete",
      }),
    );
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "50",
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Mark Publish site as complete" }),
    );
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(screen.getByText("100% complete")).toBeTruthy();

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
        "Website launch",
      );
    });

    view.unmount();
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Website launch" }),
    ).toBeTruthy();
    expect(screen.getByText("2 of 2")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Delete task Review final copy" }),
    );
    expect(screen.queryByText("Review final copy")).toBeNull();
    expect(screen.getByText("1 of 1")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Delete project Website launch" }),
    );
    expect(
      screen.getByRole("group", { name: "Confirm project deletion" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("A clear place to begin.")).toBeTruthy();

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
        '"projects":[]',
      );
    });
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
