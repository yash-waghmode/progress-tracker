export interface Task {
  id: string;
  name: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}
