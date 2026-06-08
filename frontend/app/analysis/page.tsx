"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAnalysisPipeline } from "@/hooks/useAnalysisPipeline";
import Pipeline from "@/components/Pipeline";
import Logs from "@/components/Logs";
import AnalysisStage from "@/components/AnalysisStage";
import { ShimmerText } from "@/components/ui/Shimmer";
import AiGlow from "@/components/ui/AiGlow";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url") || "";
  const loadedRef = useRef(false);

  const {
    pipelineStage,
    pipelineProgress,
    pipelineDetail,
    logs,
    status,
    currentId,
    run,
  } = useAnalysisPipeline();

  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    if (url && !loadedRef.current) {
      loadedRef.current = true;
      run(url);
    }
  }, [url, run]);

  useEffect(() => {
    if (status === "complete" && currentId) {
      setScreenshotUrl(`/api/analyze/${currentId}/screenshot`);
    }
  }, [status, currentId]);

  useEffect(() => {
    if (status === "complete" && currentId) {
      const t = setTimeout(
        () => router.push(`/dashboard/overview?id=${currentId}`),
        2000
      );
      return () => clearTimeout(t);
    }
  }, [status, currentId, router]);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden lg:flex">
          <Pipeline
            currentStage={pipelineStage}
            progress={pipelineProgress}
          />
        </aside>

        <AnalysisStage
          status={status}
          pipelineDetail={pipelineDetail}
          screenshotUrl={screenshotUrl}
          currentId={currentId}
          device={device}
          onDeviceChange={setDevice}
        />

        <aside className="hidden xl:flex">
          <Logs logs={logs} status={status} />
        </aside>
      </div>
    </div>
  );
}

function AnalysisFallback() {
  return (
    <div className="relative flex min-h-[calc(100vh-60px)] items-center justify-center p-12">
      <AiGlow active intensity="soft" />
      <div className="relative z-10 w-full max-w-sm">
        <ShimmerText lines={5} />
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<AnalysisFallback />}>
      <AnalysisContent />
    </Suspense>
  );
}
