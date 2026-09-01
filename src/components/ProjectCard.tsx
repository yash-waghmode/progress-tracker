import { FormEvent, useEffect, useRef, useState } from "react";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { calculateProgress, getCompletedCount } from "../progress";
import type { Project } from "../types";
import { ChevronIcon, PlusIcon, TrashIcon } from "./Icons";
import { TaskItem } from "./TaskItem";

interface ProjectCardProps {
  project: Project;
  index: number;
  isExpanded: boolean;
  shouldFocusTaskInput: boolean;
  onToggleExpanded: () => void;
  onTaskInputFocused: () => void;
  onAddTask: (projectId: string, name: string) => void;
  onToggleTask: (projectId: string, taskId: string) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectCard({
  project,
  index,
  isExpanded,
  shouldFocusTaskInput,
  onToggleExpanded,
  onTaskInputFocused,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteProject,
}: ProjectCardProps) {
  const [taskName, setTaskName] = useState("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const completed = getCompletedCount(project.tasks);
  const progress = calculateProgress(project.tasks);
  const previousProgress = useRef(progress);
  const displayedProgress = useAnimatedNumber(progress);
  const bodyId = `project-body-${project.id}`;

  useEffect(() => {
    if (isExpanded && shouldFocusTaskInput) {
      taskInputRef.current?.focus();
      onTaskInputFocused();
    }
  }, [isExpanded, onTaskInputFocused, shouldFocusTaskInput]);

  useEffect(() => {
    if (progress === 100 && previousProgress.current < 100) {
      setCelebrating(true);
      const timer = window.setTimeout(() => setCelebrating(false), 800);
      previousProgress.current = progress;
      return () => window.clearTimeout(timer);
    }
    previousProgress.current = progress;
  }, [progress]);

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = taskName.trim();
    if (!name) {
      setError("Enter a task name.");
      return;
    }
    onAddTask(project.id, name);
    setTaskName("");
    setError("");
  };

  const requestDelete = () => {
    if (project.tasks.length === 0) {
      onDeleteProject(project.id);
      return;
    }
    setConfirmingDelete(true);
  };

  return (
    <article
      className={`project-card ${isExpanded ? "project-card--expanded" : ""} ${celebrating ? "project-card--complete" : ""}`}
      style={
        {
          "--card-delay": `${Math.min(index * 55, 275)}ms`,
        } as React.CSSProperties
      }
    >
      <header className="project-card__summary">
        <h2>{project.name}</h2>

        <div className="project-card__metrics">
          <span className="progress-percent">
            <span aria-hidden="true">{displayedProgress}%</span>
            <span className="sr-only">{progress}% complete</span>
          </span>
          <span className="progress-count">
            {completed} of {project.tasks.length} tasks
          </span>
        </div>

        <div className="project-card__actions">
          {!confirmingDelete && (
            <button
              className="icon-button project-delete"
              type="button"
              onClick={requestDelete}
              aria-label={`Delete project ${project.name}`}
              title={`Delete ${project.name}`}
            >
              <TrashIcon />
            </button>
          )}
          <button
            className="icon-button disclosure-button"
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${project.name}`}
            title={`${isExpanded ? "Collapse" : "Expand"} ${project.name}`}
          >
            <ChevronIcon />
          </button>
        </div>

        <div
          className="progress-track project-card__track"
          role="progressbar"
          aria-label={`${project.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% complete, ${completed} of ${project.tasks.length} tasks complete`}
        >
          <span
            className={`progress-fill ${progress === 100 && project.tasks.length > 0 ? "progress-fill--complete" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {confirmingDelete && (
        <div
          className="delete-confirm"
          role="group"
          aria-label={`Confirm deletion of ${project.name}`}
        >
          <span>Delete this project and its {project.tasks.length} tasks?</span>
          <div>
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-button text-button--danger"
              onClick={() => onDeleteProject(project.id)}
            >
              Delete project
            </button>
          </div>
        </div>
      )}

      <div
        className="project-card__body"
        id={bodyId}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
      >
        <div className="project-card__body-inner">
          <form className="task-form" onSubmit={submitTask} noValidate>
            <div className="input-wrap">
              <label className="sr-only" htmlFor={`task-${project.id}`}>
                Add a task to {project.name}
              </label>
              <input
                ref={taskInputRef}
                id={`task-${project.id}`}
                value={taskName}
                onChange={(event) => {
                  setTaskName(event.target.value);
                  if (error) setError("");
                }}
                placeholder="Add a task"
                autoComplete="off"
                aria-describedby={
                  error ? `task-error-${project.id}` : undefined
                }
                aria-invalid={Boolean(error)}
              />
              <button
                type="submit"
                className="task-submit"
                aria-label={`Add task to ${project.name}`}
                disabled={!taskName.trim()}
              >
                <PlusIcon size={16} />
                <span>Add</span>
              </button>
            </div>
            {error && (
              <p
                className="input-error"
                id={`task-error-${project.id}`}
                role="alert"
              >
                {error}
              </p>
            )}
          </form>

          {project.tasks.length === 0 ? (
            <p className="project-empty">
              Add your first task to start making progress.
            </p>
          ) : (
            <ul className="task-list">
              {project.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={() => onToggleTask(project.id, task.id)}
                  onDelete={() => onDeleteTask(project.id, task.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <table className="print-project" aria-hidden="true">
        <thead>
          <tr>
            <th>
              <div className="print-project__heading">
                <span>{project.name}</span>
                <span>
                  {progress}% · {completed} of {project.tasks.length} tasks
                </span>
              </div>
              <div className="progress-track">
                <span
                  className={`progress-fill ${progress === 100 && project.tasks.length > 0 ? "progress-fill--complete" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {project.tasks.length === 0 ? (
            <tr>
              <td className="print-project__empty">No tasks yet.</td>
            </tr>
          ) : (
            project.tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <span
                    className={`print-project__checkbox ${task.completed ? "print-project__checkbox--checked" : ""}`}
                  >
                    {task.completed && <span>✓</span>}
                  </span>
                  <span
                    className={
                      task.completed ? "print-project__task--completed" : ""
                    }
                  >
                    {task.name}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}
