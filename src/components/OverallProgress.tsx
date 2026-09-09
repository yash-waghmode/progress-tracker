import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { calculateOverallProgress } from "../progress";
import type { Project } from "../types";

interface OverallProgressProps {
  projects: Project[];
}

export function OverallProgress({ projects }: OverallProgressProps) {
  const { completed, total, percentage } = calculateOverallProgress(projects);
  const displayedPercentage = useAnimatedNumber(percentage);
  const itemLabel = projects.some((project) => project.counter)
    ? "steps"
    : "tasks";
  const description = `${percentage}% complete, ${completed} of ${total} ${itemLabel} complete`;

  return (
    <section className="overall-progress" aria-labelledby="overall-title">
      <div className="overall-progress__text">
        <div>
          <h2 id="overall-title">Overall progress</h2>
          <span className="overall-progress__percent" aria-hidden="true">
            {displayedPercentage}%
          </span>
        </div>
        <p>
          {completed} of {total} {itemLabel} complete
        </p>
      </div>
      <div
        className="progress-track overall-progress__track"
        role="progressbar"
        aria-label="Overall progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={description}
      >
        <span
          className={`progress-fill ${percentage === 100 && total > 0 ? "progress-fill--complete" : ""}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}
