"use client";

import { useEffect, useRef } from "react";
import type { PipelineLog } from "@/hooks/useAnalysisPipeline";

interface LogsProps {
  logs: PipelineLog[];
  status: string;
}

export default function Logs({ logs, status }: LogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [logs]);

  const statusClass =
    status === "running" ? "running" : status === "complete" ? "done" : "";

  return (
    <div className="analysis-right">
      <div className="logs-header">
        <span>Live Logs</span>
        <span className={`status-dot ${statusClass}`} />
      </div>
      <div className="logs-body">
        {logs.length === 0 ? (
          <div className="log-entry">
            <span className="ts">──</span>
            <span className="msg" style={{ color: "var(--muted2)" }}>
              Waiting to start...
            </span>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`log-entry ${log.type}`}>
              <span className="ts">
                +{log.ts.toFixed(1).padStart(6, "0")}s
              </span>
              <span className="msg">{log.msg}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
