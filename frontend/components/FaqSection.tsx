"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const FAQS = [
  {
    q: "What is a DESIGN.md?",
    a: "A Markdown file describing a website's design system — colors, typography, components, spacing, and layout — so an AI coding agent can match your app's visual style.",
  },
  {
    q: "Which sites can I analyze?",
    a: "Any live website URL. Awwwards and SiteInspire gallery pages are auto-resolved to the real site; Behance, Dribbble, Mobbin, and Designspiration links show a guide.",
  },
  {
    q: "Is Design Oracle free?",
    a: "The first analyses each week are free — the badge under the search bar shows where you stand.",
  },
  {
    q: "Which AI coding agents does it work with?",
    a: "Anything that reads a file — opencode, Codex, Cursor, and more. Export the DESIGN.md and point your agent at it.",
  },
  {
    q: "How are design tokens generated?",
    a: "Colors, typography, spacing, and component styles are extracted and written as Tailwind config and design tokens.",
  },
];

/**
 * FAQ accordéon — une seule réponse ouverte à la fois.
 */
export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="faq-section">
      <h2 className="faq-title">Frequently asked questions</h2>
      <div className="faq-list">
        {FAQS.map((item, i) => (
          <div key={i} className={cn("faq-item", open === i && "is-open")}>
            <button
              type="button"
              className="faq-question"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>{item.q}</span>
              <Plus
                size={16}
                strokeWidth={2}
                className={cn("faq-plus", open === i && "is-open")}
              />
            </button>
            <div className="faq-answer">
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
