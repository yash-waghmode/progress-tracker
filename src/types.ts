export interface Task {
  id: string;
  name: string;
  completed: boolean;
}

export const MAX_COUNTER_TOTAL = 1_000_000;

export interface CounterProgress {
  completed: number;
  total: number;
  unit: string;
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
  counter?: CounterProgress;
}
