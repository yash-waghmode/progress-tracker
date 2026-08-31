import { FormEvent, useEffect, useRef, useState } from "react";
import { calculateProgress, getCompletedCount } from "../progress";
import type { Project } from "../types";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { ArrowIcon, CheckIcon, TrashIcon } from "./Icons";
import { TaskItem } from "./TaskItem";

interface ProjectCardProps {
  project: Project;
  index: number;
  onAddTask: (projectId: string, name: string) => void;
  onToggleTask: (projectId: string, taskId: string) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectCard({
  project,
  index,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteProject,
}: ProjectCardProps) {
  const [taskName, setTaskName] = useState("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const completed = getCompletedCount(project.tasks);
  const progress = calculateProgress(project.tasks);
  const displayedProgress = useAnimatedNumber(progress);
  const [celebrating, setCelebrating] = useState(false);
  const previousProgress = useRef(progress);

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
      className={`project-card ${celebrating ? "project-card--complete" : ""}`}
      style={
        {
          "--card-delay": `${Math.min(index * 70, 350)}ms`,
        } as React.CSSProperties
      }
    >
      <div className="project-card__topline">
        <h2>{project.name}</h2>
        {!confirmingDelete && (
          <button
            className="icon-button project-delete"
            type="button"
            onClick={requestDelete}
            aria-label={`Delete project ${project.name}`}
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {confirmingDelete && (
        <div
          className="delete-confirm"
          role="group"
          aria-label="Confirm project deletion"
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
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="progress-summary">
        <div className="progress-numbers">
          <span className="progress-percent">
            <span aria-hidden="true">{displayedProgress}%</span>
            <span className="sr-only">{progress}% complete</span>
          </span>
          <span className="progress-count">
            {completed} of {project.tasks.length}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`${project.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span
            className={`progress-fill ${progress === 100 ? "progress-fill--complete" : ""}`}
            style={{ width: `${progress}%` }}
          />
          {progress === 100 && project.tasks.length > 0 && (
            <span className="completion-mark" aria-hidden="true">
              <CheckIcon size={12} />
            </span>
          )}
        </div>
      </div>

      <form className="task-form" onSubmit={submitTask} noValidate>
        <div className="input-wrap">
          <label className="sr-only" htmlFor={`task-${project.id}`}>
            Add a task to {project.name}
          </label>
          <input
            id={`task-${project.id}`}
            value={taskName}
            onChange={(event) => {
              setTaskName(event.target.value);
              if (error) setError("");
            }}
            placeholder="Add a task"
            autoComplete="off"
            aria-describedby={error ? `task-error-${project.id}` : undefined}
            aria-invalid={Boolean(error)}
          />
          <button
            type="submit"
            className="submit-icon"
            aria-label={`Add task to ${project.name}`}
          >
            <ArrowIcon />
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
    </article>
  );
}
