"use client";

import { useState } from "react";
import { Check } from "lucide-react";

/**
 * Waitlist newsletter — email factice, état de succès local uniquement.
 */
export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const submit = () => {
    if (!email.trim()) return;
    setJoined(true);
  };

  return (
    <section className="news-section">
      <div className="news-card">
        <h2 className="news-title">
          First access to{" "}
          <span>agent-ready design extraction</span>
        </h2>
        <p className="news-desc">
          Join the waitlist for private access and early experiments.
        </p>

        {joined ? (
          <p className="news-success">
            <Check size={14} strokeWidth={2.5} />
            You&apos;re on the list. We&apos;ll be in touch.
          </p>
        ) : (
          <div className="news-form">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button type="button" onClick={submit} disabled={!email.trim()}>
              Join the waitlist
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
