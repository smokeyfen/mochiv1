const gates = [
  ['M0 Contracts', 'PASS'],
  ['Golden Fixtures', 'NEXT'],
  ['Omni Feasibility Benchmark', 'BLOCKED'],
  ['Safe Action Grammar', 'BLOCKED'],
  ['FEN V1 Feasibility Lock', 'BLOCKED']
] as const;

export function App() {
  return (
    <main className="shell">
      <header><h1>MochiV1</h1><p>POV Authentic On-Hand Review</p></header>
      <section aria-labelledby="status-title">
        <h2 id="status-title">Build status</h2>
        <table><thead><tr><th>Gate</th><th>Status</th></tr></thead>
          <tbody>{gates.map(([gate,status]) => <tr key={gate}><td>{gate}</td><td>{status}</td></tr>)}</tbody>
        </table>
      </section>
      <section aria-labelledby="rule-title"><h2 id="rule-title">Current rule</h2>
        <p>All physical actions are UNTESTED until real Omni benchmark evidence promotes them.</p>
      </section>
    </main>
  );
}
