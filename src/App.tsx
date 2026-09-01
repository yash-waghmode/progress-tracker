import { FormEvent, useEffect, useRef, useState } from "react";
import { ProjectCard } from "./components/ProjectCard";
import { PlusIcon } from "./components/Icons";
import { OverallProgress } from "./components/OverallProgress";
import { createId } from "./id";
import { loadProjects, saveProjects } from "./storage";
import type { Project } from "./types";

function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [focusTaskInputId, setFocusTaskInputId] = useState<string | null>(null);
  const hasUserChangedProjects = useRef(false);

  useEffect(() => {
    if (!hasUserChangedProjects.current) return;
    setStorageWarning(!saveProjects(projects));
  }, [projects]);

  const updateProjects = (update: (current: Project[]) => Project[]) => {
    hasUserChangedProjects.current = true;
    setProjects(update);
  };

  const addProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      setError("Enter a project name.");
      return;
    }
    const projectId = createId();
    updateProjects((current) => [
      ...current,
      { id: projectId, name, tasks: [] },
    ]);
    setExpandedProjectId(projectId);
    setFocusTaskInputId(projectId);
    setProjectName("");
    setError("");
  };

  const addTask = (projectId: string, name: string) => {
    updateProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
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
    setFocusTaskInputId((current) => (current === projectId ? null : current));
  };

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Progress</p>
          <h1>Make what matters move.</h1>
          <p className="intro">Small steps, clearly seen.</p>
        </div>

        <form className="project-form" onSubmit={addProject} noValidate>
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
              disabled={!projectName.trim()}
              title="Add project"
            >
              <PlusIcon />
              <span>Add project</span>
            </button>
          </div>
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
            Name your first project above, then break it into a few doable
            tasks.
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
              shouldFocusTaskInput={focusTaskInputId === project.id}
              onToggleExpanded={() =>
                setExpandedProjectId((current) =>
                  current === project.id ? null : project.id,
                )
              }
              onTaskInputFocused={() => setFocusTaskInputId(null)}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onDeleteProject={deleteProject}
            />
          ))}
        </section>
      )}

      <footer className="page-footer">
        <span>
          {projects.length === 0
            ? "Ready when you are."
            : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        </span>
        <span>Saved on this device</span>
      </footer>
    </main>
  );
}

export default App;
