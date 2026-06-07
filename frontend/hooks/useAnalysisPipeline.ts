"use client";

import { useState, useCallback, useRef } from "react";
import { startAnalysis, streamAnalysisEvents, getAnalysisResult } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

export const PIPELINE_STEPS = [
  "launch", "navigate", "screenshot", "dom", "colors",
  "typography", "components", "layout", "patterns", "dna",
];

export interface PipelineLog {
  ts: number;
  msg: string;
  type: "active" | "done" | "error" | "";
}

export function useAnalysisPipeline() {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState("");
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineDetail, setPipelineDetail] = useState("");
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const startTime = useRef(0);
  const disconnectRef = useRef<(() => void) | null>(null);

  const addLog = useCallback((msg: string, type: PipelineLog["type"] = "") => {
    if (!startTime.current) startTime.current = Date.now();
    const ts = (Date.now() - startTime.current) / 1000;
    setLogs((prev) => [...prev, { ts, msg, type }]);
  }, []);

  const clearLogs = useCallback(() => {
    startTime.current = 0;
    setLogs([]);
  }, []);

  const run = useCallback(
    async (url: string) => {
      setStatus("running");
      setPipelineStage("");
      setPipelineProgress(0);
      setPipelineDetail("");
      setResult(null);
      clearLogs();
      addLog(`Target: ${url}`, "active");

      try {
        const { analyze_id } = await startAnalysis(url);
        setCurrentId(analyze_id);
        addLog(`Session: ${analyze_id}`);

        const disconnect = streamAnalysisEvents(
          analyze_id,
          (data) => {
            setPipelineStage(data.stage);
            setPipelineProgress(data.progress);
            setPipelineDetail(data.detail);
            if (data.detail) addLog(data.detail);
          },
          () => {
            addLog("Analysis complete", "done");
            getAnalysisResult(analyze_id)
              .then((res) => {
                setResult(res);
                setStatus("complete");
              })
              .catch(() => setStatus("error"));
          },
          (msg) => {
            addLog(`Error: ${msg}`, "error");
            setStatus("error");
          }
        );
        disconnectRef.current = disconnect;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        addLog(`Error: ${msg}`, "error");
        setStatus("error");
      }
    },
    [addLog, clearLogs]
  );

  const reset = useCallback(() => {
    if (disconnectRef.current) disconnectRef.current();
    setCurrentId(null);
    setPipelineStage("");
    setPipelineProgress(0);
    setPipelineDetail("");
    setStatus("idle");
    setResult(null);
    clearLogs();
  }, [clearLogs]);

  return {
    currentId,
    pipelineStage,
    pipelineProgress,
    pipelineDetail,
    logs,
    status,
    result,
    run,
    reset,
    addLog,
    clearLogs,
  };
}
