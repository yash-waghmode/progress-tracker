import { supabase } from "./supabase";
import type { Project } from "./types";

interface ProjectRow {
  id: string;
  name: string;
  position: number;
  tracking_mode?: "tasks" | "counter";
  target_total?: number | null;
  current_value?: number | null;
  unit_label?: string | null;
}

interface TaskRow {
  id: string;
  project_id: string;
  name: string;
  completed: boolean;
  position: number;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Cloud request failed.";
}

export function assembleProjects(
  projectRows: ProjectRow[],
  taskRows: TaskRow[],
): Project[] {
  const tasksByProject = new Map<string, Project["tasks"]>();

  for (const task of taskRows) {
    const tasks = tasksByProject.get(task.project_id) ?? [];
    tasks.push({
      id: task.id,
      name: task.name,
      completed: task.completed,
    });
    tasksByProject.set(task.project_id, tasks);
  }

  return projectRows.map((project) => {
    const counter =
      project.tracking_mode === "counter" &&
      typeof project.target_total === "number" &&
      typeof project.current_value === "number" &&
      typeof project.unit_label === "string"
        ? {
            total: project.target_total,
            completed: project.current_value,
            unit: project.unit_label,
          }
        : undefined;

    return {
      id: project.id,
      name: project.name,
      tasks: counter ? [] : (tasksByProject.get(project.id) ?? []),
      ...(counter ? { counter } : {}),
    };
  });
}

export function createProjectRows(projects: Project[], userId: string) {
  return projects.map((project, position) => ({
    id: project.id,
    user_id: userId,
    name: project.name,
    position,
    tracking_mode: project.counter ? "counter" : "tasks",
    target_total: project.counter?.total ?? null,
    current_value: project.counter?.completed ?? null,
    unit_label: project.counter?.unit ?? null,
  }));
}

export async function loadCloudProjects(userId: string): Promise<Project[]> {
  const [projectsResult, tasksResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, position, tracking_mode, target_total, current_value, unit_label",
      )
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, project_id, name, completed, position")
      .eq("user_id", userId)
      .order("project_id", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  if (projectsResult.error) throw new Error(errorMessage(projectsResult.error));
  if (tasksResult.error) throw new Error(errorMessage(tasksResult.error));

  return assembleProjects(
    (projectsResult.data ?? []) as ProjectRow[],
    (tasksResult.data ?? []) as TaskRow[],
  );
}

export async function saveCloudProjects(
  projects: Project[],
  userId: string,
): Promise<void> {
  const projectRows = createProjectRows(projects, userId);
  const taskRows = projects.flatMap((project) =>
    project.counter
      ? []
      : project.tasks.map((task, position) => ({
          id: task.id,
          project_id: project.id,
          user_id: userId,
          name: task.name,
          completed: task.completed,
          position,
        })),
  );

  if (projectRows.length > 0) {
    const { error } = await supabase
      .from("projects")
      .upsert(projectRows, { onConflict: "id" });
    if (error) throw new Error(errorMessage(error));
  }

  if (taskRows.length > 0) {
    const { error } = await supabase
      .from("tasks")
      .upsert(taskRows, { onConflict: "id" });
    if (error) throw new Error(errorMessage(error));
  }

  const [storedProjects, storedTasks] = await Promise.all([
    supabase.from("projects").select("id").eq("user_id", userId),
    supabase.from("tasks").select("id").eq("user_id", userId),
  ]);
  if (storedProjects.error) throw new Error(errorMessage(storedProjects.error));
  if (storedTasks.error) throw new Error(errorMessage(storedTasks.error));

  const projectIds = new Set(projectRows.map(({ id }) => id));
  const taskIds = new Set(taskRows.map(({ id }) => id));
  const staleTaskIds = (storedTasks.data ?? [])
    .map(({ id }) => id)
    .filter((id) => !taskIds.has(id));
  const staleProjectIds = (storedProjects.data ?? [])
    .map(({ id }) => id)
    .filter((id) => !projectIds.has(id));

  if (staleTaskIds.length > 0) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", userId)
      .in("id", staleTaskIds);
    if (error) throw new Error(errorMessage(error));
  }

  if (staleProjectIds.length > 0) {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("user_id", userId)
      .in("id", staleProjectIds);
    if (error) throw new Error(errorMessage(error));
  }
}
