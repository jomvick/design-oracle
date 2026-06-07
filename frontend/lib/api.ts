import type { AnalysisResult, DesignSummary } from "./types";

export interface AnalysisStatus {
  analyze_id: string;
  url: string;
  status: "pending" | "running" | "complete" | "error";
  progress: number;
  stage: string;
  detail: string;
  error?: string | null;
  done: boolean;
  title?: string;
  dna?: AnalysisResult["dna"];
  colors?: AnalysisResult["colors"];
  typography?: AnalysisResult["typography"];
  components?: AnalysisResult["components"];
  patterns?: AnalysisResult["patterns"];
  layout?: AnalysisResult["layout"];
}

export type { AnalysisResult, DesignSummary };

export async function startAnalysis(url: string): Promise<{ analyze_id: string }> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string; error?: string }).detail || (err as { error?: string }).error || "Analysis failed");
  }
  return res.json();
}

export async function getAnalysisStatus(id: string): Promise<AnalysisStatus> {
  const res = await fetch(`/api/analyze/${id}/status`);
  if (!res.ok) throw new Error("Status not found");
  return res.json();
}

export async function getAnalysisResult(id: string): Promise<AnalysisResult> {
  const res = await fetch(`/api/analyze/${id}/result`);
  if (!res.ok) throw new Error("Result not found");
  return res.json();
}

export async function deleteAnalysis(id: string): Promise<void> {
  await fetch(`/api/analyze/${id}`, { method: "DELETE" });
}

export async function getDesigns(): Promise<DesignSummary[]> {
  const res = await fetch("/api/designs");
  if (!res.ok) return [];
  return res.json();
}

export function streamAnalysisEvents(
  id: string,
  onProgress: (data: { stage: string; progress: number; detail: string }) => void,
  onComplete: () => void,
  onError: (msg: string) => void
): () => void {
  const es = new EventSource(`/api/analyze/${id}/events`);
  es.addEventListener("progress", (e) => {
    const d = JSON.parse((e as MessageEvent).data);
    onProgress(d);
  });
  es.addEventListener("complete", () => {
    es.close();
    onComplete();
  });
  es.addEventListener("error", (e) => {
    let msg = "Connection error";
    try {
      const d = JSON.parse((e as MessageEvent).data);
      msg = d.error || msg;
    } catch {
      /* non-JSON error event */
    }
    es.close();
    onError(msg);
  });
  return () => es.close();
}
