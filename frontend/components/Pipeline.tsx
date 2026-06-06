"use client";

import { PIPELINE_STEPS } from "@/hooks/useAnalysisPipeline";

interface PipelineProps {
  currentStage: string;
  progress: number;
  detail: string;
}

const STAGE_LABELS: Record<string, string> = {
  launch: "Capture",
  navigate: "Navigation",
  screenshot: "Screenshot",
  dom: "DOM",
  colors: "Colors",
  typography: "Typography",
  components: "Components",
  layout: "Layout",
  patterns: "Patterns",
  dna: "DNA",
};

export default function Pipeline({ currentStage, progress, detail }: PipelineProps) {
  const currentIndex = PIPELINE_STEPS.indexOf(currentStage);

  return (
    <div className="analysis-left">
      <div className="pipeline-steps">
        <h3>Pipeline</h3>
        {PIPELINE_STEPS.map((step, i) => {
          const cls = [
            "pstep",
            i === currentIndex ? "active" : "",
            i < currentIndex ? "done" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={step} className={cls}>
              <span className="dot" />
              {STAGE_LABELS[step] || step}
            </div>
          );
        })}
      </div>
      <div className="analysis-progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-label">{detail || "Ready"}</div>
      </div>
    </div>
  );
}
