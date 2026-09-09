import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useAuthSession } from "./authSession";
import { loadCloudProjects, saveCloudProjects } from "./cloudStorage";
import { ProjectCard } from "./components/ProjectCard";
import { PlusIcon } from "./components/Icons";
import { OverallProgress } from "./components/OverallProgress";
import { createId } from "./id";
import {
  createProjectsBackup,
  loadProjects,
  parseProjectsBackup,
  saveProjects,
} from "./storage";
import type { Project } from "./types";
import { MAX_COUNTER_TOTAL } from "./types";

type ProjectType = "tasks" | "counter";

function App() {
  const session = useAuthSession();
  const userId = session?.user.id;
  const initialProjects = useRef<Project[]>(loadProjects());
  const [projects, setProjects] = useState<Project[]>(initialProjects.current);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("tasks");
  const [counterTotal, setCounterTotal] = useState("");
  const [counterUnit, setCounterUnit] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [focusProjectControlId, setFocusProjectControlId] = useState<
    string | null
  >(null);
  const [cloudStatus, setCloudStatus] = useState<
    "local" | "loading" | "ready" | "saving" | "error"
  >(session ? "loading" : "local");
  const [cloudError, setCloudError] = useState("");
  const [cloudLoadAttempt, setCloudLoadAttempt] = useState(0);
  const projectsRef = useRef(initialProjects.current);
  const cloudReadyRef = useRef(false);
  const cloudUserIdRef = useRef<string | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSyncRef = useRef(0);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) {
      cloudReadyRef.current = false;
      cloudUserIdRef.current = null;
      setCloudStatus("local");
      return;
    }

    let active = true;
    cloudReadyRef.current = false;
    cloudUserIdRef.current = userId;
    syncQueueRef.current = Promise.resolve();
    setCloudStatus("loading");
    setCloudError("");

    void loadCloudProjects(userId)
      .then((cloudProjects) => {
        if (!active || cloudUserIdRef.current !== userId) return;
        projectsRef.current = cloudProjects;
        setProjects(cloudProjects);
        setStorageWarning(!saveProjects(cloudProjects));
        cloudReadyRef.current = true;
        setCloudStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (!active || cloudUserIdRef.current !== userId) return;
        setCloudError(
          loadError instanceof Error
            ? loadError.message
            : "Your cloud projects could not be loaded.",
        );
        setCloudStatus("error");
      });

    return () => {
      active = false;
    };
  }, [cloudLoadAttempt, userId]);

  const queueCloudSync = (nextProjects: Project[]) => {
    if (!userId || !cloudReadyRef.current) return;

    const syncNumber = latestSyncRef.current + 1;
    latestSyncRef.current = syncNumber;
    setCloudStatus("saving");
    setCloudError("");

    syncQueueRef.current = syncQueueRef.current
      .catch(() => undefined)
      .then(() => saveCloudProjects(nextProjects, userId))
      .then(() => {
        if (
          cloudUserIdRef.current === userId &&
          latestSyncRef.current === syncNumber
        ) {
          setCloudStatus("ready");
        }
      })
      .catch((syncError: unknown) => {
        if (
          cloudUserIdRef.current === userId &&
          latestSyncRef.current === syncNumber
        ) {
          setCloudError(
            syncError instanceof Error
              ? syncError.message
              : "Your latest changes could not be saved to the cloud.",
          );
          setCloudStatus("error");
        }
      });
  };

  const updateProjects = (update: (current: Project[]) => Project[]) => {
    const nextProjects = update(projectsRef.current);
    projectsRef.current = nextProjects;
    setProjects(nextProjects);
    setStorageWarning(!saveProjects(nextProjects));
    queueCloudSync(nextProjects);
  };

  const retryCloud = () => {
    if (cloudReadyRef.current) {
      queueCloudSync(projectsRef.current);
    } else {
      setCloudLoadAttempt((attempt) => attempt + 1);
    }
  };

  const addProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      setError("Enter a project name.");
      return;
    }
    const total = Number(counterTotal);
    if (
      projectType === "counter" &&
      (!Number.isInteger(total) || total < 1 || total > MAX_COUNTER_TOTAL)
    ) {
      setError(
        `Enter a total between 1 and ${MAX_COUNTER_TOTAL.toLocaleString()}.`,
      );
      return;
    }
    const projectId = createId();
    updateProjects((current) => [
      ...current,
      {
        id: projectId,
        name,
        tasks: [],
        ...(projectType === "counter"
          ? {
              counter: {
                completed: 0,
                total,
                unit: counterUnit.trim() || "items",
              },
            }
          : {}),
      },
    ]);
    setExpandedProjectId(projectId);
    setFocusProjectControlId(projectId);
    setProjectName("");
    setProjectType("tasks");
    setCounterTotal("");
    setCounterUnit("");
    setError("");
  };

  const addTask = (projectId: string, name: string) => {
    updateProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? project.counter
            ? project
            : {
                ...project,
                tasks: [
                  ...project.tasks,
                  { id: createId(), name, completed: false },
                ],
              }
          : project,
      ),
    );
  };

  const updateCounter = (projectId: string, completed: number) => {
    updateProjects((current) =>
      current.map((project) =>
        project.id === projectId && project.counter
          ? {
              ...project,
              counter: {
                ...project.counter,
                completed: Math.min(
                  project.counter.total,
                  Math.max(0, Math.round(completed)),
                ),
              },
            }
          : project,
      ),
    );
  };

  const toggleTask = (projectId: string, taskId: string) => {
    updateProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, completed: !task.completed }
                  : task,
              ),
            }
          : project,
      ),
    );
  };

  const deleteTask = (projectId: string, taskId: string) => {
    updateProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.filter((task) => task.id !== taskId),
            }
          : project,
      ),
    );
  };

  const deleteProject = (projectId: string) => {
    updateProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
    setExpandedProjectId((current) => (current === projectId ? null : current));
    setFocusProjectControlId((current) =>
      current === projectId ? null : current,
    );
  };

  const downloadBackup = () => {
    const blob = new Blob([createProjectsBackup(projects)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `stepmark-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupStatus("Backup downloaded.");
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const restoredProjects = parseProjectsBackup(await file.text());
      if (!restoredProjects) {
        setBackupStatus("That file is not a valid Stepmark backup.");
        return;
      }

      if (
        projects.length > 0 &&
        !window.confirm(
          "Restore this backup? It will replace your projects on every device.",
        )
      ) {
        setBackupStatus("Restore cancelled.");
        return;
      }

      updateProjects(() => restoredProjects);
      setExpandedProjectId(null);
      setFocusProjectControlId(null);
      setBackupStatus(
        `Backup restored: ${restoredProjects.length} ${restoredProjects.length === 1 ? "project" : "projects"}.`,
      );
    } catch {
      setBackupStatus("The backup could not be read.");
    } finally {
      input.value = "";
    }
  };

  if (session && cloudStatus === "loading") {
    return (
      <main className="cloud-shell" aria-busy="true">
        <p role="status">Loading your cloud projects…</p>
      </main>
    );
  }

  if (session && cloudStatus === "error" && !cloudReadyRef.current) {
    return (
      <main className="cloud-shell">
        <section className="cloud-error" aria-labelledby="cloud-error-title">
          <h1 id="cloud-error-title">We couldn’t open your cloud tracker.</h1>
          <p role="alert">{cloudError}</p>
          <button type="button" onClick={retryCloud}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  const cloudStatusLabel =
    cloudStatus === "saving"
      ? "Saving to cloud…"
      : cloudStatus === "error"
        ? "Cloud save needs retry"
        : cloudStatus === "ready"
          ? "Saved to cloud"
          : "Saved on this device";

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Stepmark</p>
          <h1>Make what matters move.</h1>
          <p className="intro">Small steps, clearly seen.</p>
        </div>

        <form className="project-form" onSubmit={addProject} noValidate>
          <fieldset className="project-type-toggle">
            <legend className="sr-only">
              How will you track this project?
            </legend>
            <label>
              <input
                type="radio"
                name="project-type"
                value="tasks"
                checked={projectType === "tasks"}
                onChange={() => {
                  setProjectType("tasks");
                  setError("");
                }}
              />
              <span>Task list</span>
            </label>
            <label>
              <input
                type="radio"
                name="project-type"
                value="counter"
                checked={projectType === "counter"}
                onChange={() => {
                  setProjectType("counter");
                  setError("");
                }}
              />
              <span>Number goal</span>
            </label>
          </fieldset>
          <div className="project-input-wrap">
            <label className="sr-only" htmlFor="project-name">
              Project name
            </label>
            <input
              id="project-name"
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
                if (error) setError("");
              }}
              placeholder="Name a new project"
              autoComplete="off"
              aria-describedby={error ? "project-error" : undefined}
              aria-invalid={Boolean(error)}
            />
            <button
              type="submit"
              className="primary-button"
              disabled={
                !projectName.trim() ||
                (projectType === "counter" &&
                  (!Number.isInteger(Number(counterTotal)) ||
                    Number(counterTotal) < 1 ||
                    Number(counterTotal) > MAX_COUNTER_TOTAL))
              }
              title="Add project"
            >
              <PlusIcon />
              <span>Add project</span>
            </button>
          </div>
          {projectType === "counter" && (
            <div className="counter-setup">
              <div>
                <label htmlFor="counter-total">Total</label>
                <input
                  id="counter-total"
                  type="number"
                  min="1"
                  max={MAX_COUNTER_TOTAL}
                  step="1"
                  inputMode="numeric"
                  value={counterTotal}
                  onChange={(event) => {
                    setCounterTotal(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="20"
                  required
                />
              </div>
              <div>
                <label htmlFor="counter-unit">Unit (optional)</label>
                <input
                  id="counter-unit"
                  value={counterUnit}
                  onChange={(event) => setCounterUnit(event.target.value)}
                  placeholder="chapters"
                  maxLength={40}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
          {error && (
            <p className="input-error" id="project-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </header>

      {storageWarning && (
        <p className="storage-warning" role="status">
          Changes are available now, but this browser could not save them for
          later.
        </p>
      )}

      {cloudStatus === "error" && cloudReadyRef.current && (
        <div className="cloud-warning" role="alert">
          <span>{cloudError}</span>
          <button type="button" onClick={retryCloud}>
            Retry cloud save
          </button>
        </div>
      )}

      <OverallProgress projects={projects} />

      {projects.length === 0 ? (
        <section className="empty-state" aria-labelledby="empty-title">
          <div className="empty-state__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2 id="empty-title">A clear place to begin.</h2>
          <p>
            Name your first project above, then track tasks or a simple number.
          </p>
        </section>
      ) : (
        <section className="projects" aria-label="Your projects">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              isExpanded={expandedProjectId === project.id}
              shouldFocusInput={focusProjectControlId === project.id}
              onToggleExpanded={() =>
                setExpandedProjectId((current) =>
                  current === project.id ? null : project.id,
                )
              }
              onInputFocused={() => setFocusProjectControlId(null)}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onUpdateCounter={updateCounter}
              onDeleteProject={deleteProject}
            />
          ))}
        </section>
      )}

      <footer className="page-footer">
        <div className="page-footer__summary">
          <span>
            {projects.length === 0
              ? "Ready when you are."
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
          </span>
          <span aria-live="polite">{cloudStatusLabel}</span>
        </div>
        <div className="backup-actions">
          <button type="button" onClick={downloadBackup}>
            Download backup
          </button>
          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
          >
            Restore backup
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={restoreBackup}
          />
        </div>
      </footer>
      <p className="backup-status" role="status" aria-live="polite">
        {backupStatus}
      </p>
    </main>
  );
}

export default App;
