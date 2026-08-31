import { useState } from "react";
import type { Task } from "../types";
import { CheckIcon, TrashIcon } from "./Icons";

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const remove = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDelete();
      return;
    }
    setIsRemoving(true);
    window.setTimeout(onDelete, 180);
  };

  return (
    <li
      className={`task-row ${task.completed ? "task-row--completed" : ""} ${isRemoving ? "task-row--removing" : ""}`}
    >
      <label className="task-check">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={onToggle}
          aria-label={`Mark ${task.name} as ${task.completed ? "incomplete" : "complete"}`}
        />
        <span className="task-check__box">
          <CheckIcon />
        </span>
        <span className="task-name">{task.name}</span>
      </label>
      <button
        className="icon-button task-delete"
        type="button"
        onClick={remove}
        aria-label={`Delete task ${task.name}`}
        disabled={isRemoving}
      >
        <TrashIcon />
      </button>
    </li>
  );
}
