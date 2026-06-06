"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function EditorPage() {
  const params = useParams();
  const cloneId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!cloneId) return;

    async function initEditor() {
      setStatus("Downloading clone...");

      const res = await fetch(`/api/raw/${cloneId}`);
      if (!res.ok) {
        setStatus("Error: clone not found");
        return;
      }
      const rawHtml = await res.text();
      const html = rewriteAssetPaths(rawHtml, cloneId);

      const doc = new DOMParser().parseFromString(html, "text/html");
      const bodyHtml = doc.body.innerHTML;
      const inlineCss = Array.from(doc.querySelectorAll("style"))
        .map((el) => el.textContent)
        .join("\n");
      const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => el.getAttribute("href"))
        .filter(Boolean) as string[];

      setStatus("Initializing editor...");

      const checkGrapesJS = setInterval(() => {
        if (typeof (window as any).grapesjs !== "undefined") {
          clearInterval(checkGrapesJS);
          setLoading(false);

          setTimeout(() => {
            const editor = (window as any).grapesjs.init({
              container: "#gjs",
              height: "100%",
              storageManager: false,
              undoManager: { trackSelection: false },
              deviceManager: {
                devices: [
                  { name: "Desktop", width: "" },
                  { name: "Tablet", width: "768px", widthMedia: "992px" },
                  { name: "Mobile", width: "375px", widthMedia: "576px" },
                ],
              },
            });

            editor.on("load", () => {
              const wrapper = editor.DomComponents.getWrapper();
              wrapper.components(bodyHtml);

              const frame = editor.Canvas.getFrameEl();
              if (frame) {
                const fDoc = frame.contentDocument || frame.contentWindow.document;
                if (fDoc && fDoc.head) {
                  if (inlineCss) {
                    const s = fDoc.createElement("style");
                    s.textContent = inlineCss;
                    fDoc.head.appendChild(s);
                  }
                  links.forEach((href) => {
                    const l = fDoc.createElement("link");
                    l.rel = "stylesheet";
                    l.href = href;
                    fDoc.head.appendChild(l);
                  });
                }
              }
            });

            editorRef.current = editor;
            setStatus("");
          }, 100);
        }
      }, 200);

      setTimeout(() => {
        clearInterval(checkGrapesJS);
        if (!editorRef.current) {
          setStatus("Error: GrapesJS failed to load");
        }
      }, 15000);
    }

    initEditor();
  }, [cloneId]);

  const handleSave = async () => {
    const editor = editorRef.current;
    if (!editor) {
      alert("Editor not ready yet");
      return;
    }
    const html = editor.getHtml();
    const css = editor.getCss();
    const full = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>${css}</style>\n</head>\n<body>${html}\n</body>\n</html>`;

    try {
      const res = await fetch(`/api/save/${cloneId}`, { method: "POST", body: full });
      alert(res.ok ? "Saved ✓" : "Error saving");
    } catch {
      alert("Network error");
    }
  };

  return (
    <>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" />
      </head>
      <div className="editor-layout">
        <div id="navbar">
          <h1>Design Oracle — Editor</h1>
          <div className="actions">
            <span className="span" id="cloneInfo">{cloneId}</span>
            <button onClick={handleSave} className="btn-primary">💾 Save</button>
            <a id="exportLink" href={`/api/export/${cloneId}`}>📦 Export ZIP</a>
            <Link href="/">← Back</Link>
          </div>
        </div>
        {loading && <div id="loading">{status}</div>}
        <div id="gjs" style={{ display: loading ? "none" : "block" }} />
      </div>

      <Script src="https://unpkg.com/grapesjs" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/grapesjs/0.21.4/grapes.min.js" strategy="afterInteractive" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               background: #0a0a0b; color: #e5e5e5; overflow: hidden; height: 100vh; }
        .editor-layout { display: flex; flex-direction: column; height: 100vh; }
        #navbar { display: flex; align-items: center; justify-content: space-between;
                  padding: 8px 16px; background: #121213; border-bottom: 1px solid #222; height: 44px; flex-shrink: 0; }
        #navbar h1 { font-size: 14px; font-weight: 600; }
        #navbar .actions { display: flex; gap: 8px; align-items: center; }
        #navbar .actions button, #navbar .actions a {
          padding: 6px 14px; border-radius: 6px; border: none; background: #2a2a2b;
          color: #ccc; font-size: 12px; cursor: pointer; text-decoration: none; }
        #navbar .actions button:hover, #navbar .actions a:hover { background: #333; }
        #navbar .actions .btn-primary { background: #D97757; color: #fff; font-weight: 600; }
        #navbar .actions .btn-primary:hover { background: #c0684a; }
        #navbar .span { color: #555; font-size: 12px; }
        #gjs { height: calc(100vh - 44px); }
        .gjs-cv-canvas { background: #1a1a1b; }
        #loading { display: flex; align-items: center; justify-content: center;
                   height: calc(100vh - 44px); color: #888; font-size: 15px; }
      `}</style>
    </>
  );
}

function rewriteAssetPaths(html: string, cloneId: string): string {
  return html
    .replace(/(src|href)=(["'])\//g, `$1=$2/clones/${cloneId}/`)
    .replace(/url\(["']?\//g, `url(/clones/${cloneId}/`);
}
