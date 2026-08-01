"use client";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-error">
      <p className="kicker">Application error</p>
      <h1>The receiving desk stopped.</h1>
      <p>Your source data was not uploaded or retained.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
