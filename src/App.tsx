import { FormEvent, useEffect, useRef, useState } from "react";
import { ProjectCard } from "./components/ProjectCard";
import { PlusIcon } from "./components/Icons";
import { createId } from "./id";
import { loadProjects, saveProjects } from "./storage";
import type { Project } from "./types";

function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setStorageWarning(!saveProjects(projects));
  }, [projects]);

  const addProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) {
      setError("Enter a project name.");
      return;
    }
    setProjects((current) => [...current, { id: createId(), name, tasks: [] }]);
    setProjectName("");
    setError("");
  };

  const addTask = (projectId: string, name: string) => {
    setProjects((current) =>
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
    setProjects((current) =>
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
    setProjects((current) =>
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
    setProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
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
            <button type="submit" className="primary-button">
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
