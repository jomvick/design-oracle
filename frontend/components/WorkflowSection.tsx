const STEPS = [
  {
    num: "01",
    title: "Extract",
    desc: "Paste a URL. We pull colors, typography, components, and layout specs into a DESIGN.md.",
  },
  {
    num: "02",
    title: "Export",
    desc: "Download DESIGN.md, design tokens, and Tailwind config for your repo.",
  },
  {
    num: "03",
    title: "Point your agent",
    desc: "Drop them in your project and let your AI agent match your design system.",
  },
];

/**
 * Section « How it works » — 3 étapes Extract / Export / Point your agent.
 */
export default function WorkflowSection() {
  return (
    <section className="work-section">
      <div className="work-head">
        <span className="home-eyebrow">
          <span>Design Intelligence</span>
        </span>
        <h2 className="work-title">
          From URL to design system in minutes
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
