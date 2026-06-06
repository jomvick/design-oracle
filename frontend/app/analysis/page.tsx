"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAnalysisPipeline } from "@/hooks/useAnalysisPipeline";
import { getAnalysisResult } from "@/lib/api";
import Pipeline from "@/components/Pipeline";
import Logs from "@/components/Logs";

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
    result,
    currentId,
    run,
    addLog,
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

  const handleGoToDashboard = () => {
    if (currentId) {
      router.push(`/dashboard/overview?id=${currentId}`);
    }
  };

  return (
    <div className="view active analysis-view">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Pipeline
          currentStage={pipelineStage}
          progress={pipelineProgress}
          detail={pipelineDetail}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="analysis-center"
      >
        <div className="analysis-toolbar">
          <span className="url-display">{url || "Waiting for URL..."}</span>
          {["desktop", "tablet", "mobile"].map((d) => (
            <button
              key={d}
              className={`device-btn ${device === d ? "active" : ""}`}
              onClick={() => setDevice(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="screenshot-stage">
          {status === "complete" && screenshotUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src={screenshotUrl}
                alt="Screenshot"
                width={1200}
                height={900}
                unoptimized
                style={{ width: "100%", height: "auto", cursor: "pointer", display: "block" }}
                onClick={() => window.open(screenshotUrl)}
              />
            </motion.div>
          ) : (
            <div className="loader">
              <div className="spinner" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                {status === "running"
                  ? pipelineDetail || "Analyzing..."
                  : "Awaiting analysis..."}
              </motion.span>
            </div>
          )}
          {status === "complete" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                bottom: 32,
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <button className="zen-btn-outline" onClick={handleGoToDashboard}>
                → View Dashboard
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Logs logs={logs} status={status} />
      </motion.div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="view active" style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div className="loader">
        <div className="spinner" />
        <span style={{ color: "var(--muted2)", fontSize: 14 }}>Loading...</span>
      </div>
    </div>}>
      <AnalysisContent />
    </Suspense>
  );
}
