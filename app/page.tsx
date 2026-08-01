/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
import { Workbench } from "@/app/_components/workbench";
import { IntentLink } from "@/components/intent-link";

export default function HomePage() {
  const email = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "hello@iamuvin.com";
  const checkout = process.env.NEXT_PUBLIC_TEAM_CHECKOUT_URL;
  const teamHref =
    checkout || `mailto:${email}?subject=ImportDryRun%20Team%20pilot`;
  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="ImportDryRun home">
          <span>IDR</span> ImportDryRun
        </a>
        <nav aria-label="Primary navigation">
          <a href="#desk">Desk</a>
          <a href="#limits">Limits</a>
          <a href="#team">Team</a>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-number" aria-hidden="true">
          05
        </div>
        <div className="hero-copy">
          <p className="kicker">CSV receiving desk / local check</p>
          <h1 id="hero-title">
            Reject the broken import before production does.
          </h1>
          <p>
            Run customer CSV files against an explicit column contract. Find the
            exact rows to repair without sending source data to a server.
          </p>
          <a className="primary-link" href="#desk">
            Open the receiving desk
          </a>
        </div>
        <aside className="manifest" aria-label="Dry run manifest">
          <span>RECEIPT / DRY-0005</span>
          <dl>
            <div>
              <dt>Input</dt>
              <dd>CSV + JSON contract</dd>
            </div>
            <div>
              <dt>Processing</dt>
              <dd>This browser tab</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>Rows and repair rules</dd>
            </div>
          </dl>
        </aside>
      </section>

      <Workbench />

      <section className="limits" id="limits" aria-labelledby="limits-title">
        <div>
          <p className="kicker">Evidence boundary</p>
          <h2 id="limits-title">
            A clean dry run proves the supplied file matches the supplied
            contract.
          </h2>
        </div>
        <ol>
          <li>
            <strong>01 / Format</strong>
            <p>
              Version 0.1 accepts UTF-8, comma-delimited CSV with RFC 4180-style
              quoting and up to 5,000 data rows.
            </p>
          </li>
          <li>
            <strong>02 / Destination</strong>
            <p>
              The check cannot prove that a production importer applies the same
              mapping, coercion, or transaction behavior.
            </p>
          </li>
          <li>
            <strong>03 / Formulas</strong>
            <p>
              Formula-trigger detection follows common spreadsheet prefixes.
              Neutralization still depends on the destination.
            </p>
          </li>
        </ol>
      </section>

      <section className="team" id="team" aria-labelledby="team-title">
        <div>
          <p className="kicker">Commercial hypothesis</p>
          <h2 id="team-title">
            One file is free. Teams need one contract across intake, support,
            and CI.
          </h2>
          <p>
            Team would add shared contract versions, customer intake links,
            check history, API access, and release gates. Price and demand are
            unverified.
          </p>
        </div>
        <aside>
          <span>TEAM / TARGET</span>
          <strong>$29</strong>
          <small>per team / month</small>
          <IntentLink event="team_interest" href={teamHref}>
            Request the Team pilot
          </IntentLink>
        </aside>
      </section>

      <footer>
        <div>
          <span>ImportDryRun 0.1</span>
          <span>No upload. No retention.</span>
        </div>
        <IntentLink
          event="feedback_intent"
          href={`mailto:${email}?subject=ImportDryRun%20feedback`}
        >
          Send product feedback
        </IntentLink>
        <span>
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>
        </span>
      </footer>
    </main>
  );
}
