const STEPS = [
  {
    num: "01",
    title: "Extract any site",
    desc: "Paste a URL. Get a DESIGN.md with colors, typography, components, and layout specs.",
  },
  {
    num: "02",
    title: "Save it anywhere",
    desc: "Drop DESIGN.md directly into your repo root alongside your existing prompt files.",
  },
  {
    num: "03",
    title: "Point your agent at it",
    desc: "Tell your AI coding agent to use DESIGN.md as its visual style guide. That's it.",
  },
];

/**
 * Section « How it works » — 3 étapes Extract / Save / Point your agent.
 */
export default function WorkflowSection() {
  return (
    <section className="work-section">
      <div className="work-head">
        <span className="home-eyebrow">
          <span>Works with your agent</span>
        </span>
        <h2 className="work-title">
          Drop DESIGN.md into your repo.
          <br />
          Your agent does the rest.
        </h2>
      </div>

      <div className="work-grid">
        {STEPS.map((step) => (
          <article key={step.num} className="work-card">
            <span className="work-num">{step.num}</span>
            <h3 className="work-card-title">{step.title}</h3>
            <p className="work-card-desc">{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
