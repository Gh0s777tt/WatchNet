import Link from "next/link";
import caseData from "../../../../public/data/yameiko-project-intel.json";

const priorityStyles: Record<string, string> = {
  critical: "border-red-400/40 bg-red-500/10 text-red-200",
  high: "border-orange-300/40 bg-orange-400/10 text-orange-100",
  medium: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
};

export const metadata = {
  title: "Yameiko Project Intelligence Case",
  description: "Local OSIRIS starter case for the Yameiko development portfolio.",
};

export default function YameikoCasePage() {
  const priorityCounts = caseData.projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.priority] = (acc[project.priority] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen overflow-y-auto bg-[var(--bg-void)] text-[var(--text-primary)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-[var(--border-primary)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="hud-label mb-3">LOCAL CASE / DEVELOPMENT PORTFOLIO</p>
            <h1 className="text-3xl font-semibold tracking-normal text-[var(--text-heading)] md:text-5xl">
              {caseData.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">
              {caseData.summary} The case turns your local projects into an
              asset map for monitoring, release readiness and public-surface review.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded border border-[var(--border-active)] px-4 font-mono text-xs uppercase tracking-[0.12em] text-[var(--gold-primary)] transition hover:bg-[var(--hover-accent)]"
          >
            Open OSIRIS Dashboard
          </Link>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Projects" value={caseData.projects.length.toString()} />
          <Metric label="Critical" value={(priorityCounts.critical || 0).toString()} tone="risk-critical" />
          <Metric label="High" value={(priorityCounts.high || 0).toString()} tone="risk-high" />
          <Metric label="Medium" value={(priorityCounts.medium || 0).toString()} tone="text-[var(--cyan-primary)]" />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {caseData.projects.map((project) => (
            <article
              key={project.name}
              className="glass-panel rounded-lg p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="hud-label">{project.type}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-normal text-[var(--text-heading)]">
                    {project.name}
                  </h2>
                </div>
                <span className={`w-fit rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${priorityStyles[project.priority]}`}>
                  {project.priority}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                {project.riskFocus}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="hud-label mb-2">Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {project.stack.map((item) => (
                      <span key={item} className="rounded border border-[var(--border-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="hud-label mb-2">Signals</p>
                  <ul className="space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
                    {project.signals.map((signal) => (
                      <li key={signal} className="border-l border-[var(--border-cyan)] pl-3">
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="glass-panel rounded-lg p-5">
          <p className="hud-label mb-3">Starter Workflow</p>
          <ol className="grid gap-3 md:grid-cols-2">
            {caseData.starterWorkflow.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border-active)] font-mono text-xs text-[var(--gold-primary)]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="pb-8 text-xs text-[var(--text-muted)]">
          Data source: {caseData.generatedFrom}. Generated locally on {caseData.generatedAt}.
        </footer>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "text-[var(--gold-primary)]",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="glass-panel-sm rounded-lg p-4">
      <p className="hud-label">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
