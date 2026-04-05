export default function DashboardScreen({ party, onNavigate, onOpenAdd }) {
  return (
    <section>
      <div className="page-header">
        <h1>Run Dashboard</h1>
        <p className="muted">Emerald Nuzlocke — Active · 2 Badges</p>
      </div>

      <div className="twoCol">
        <div className="col">
          <details open className="panel">
            <summary>Team Preview</summary>
            <div className="grid">
              {party.map((mon) => (
                <div
                  key={mon.id}
                  className="card pokemon-mini"
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigate("team")}
                >
                  <div className={`poke-type-pip type-${mon.primaryType}`}></div>
                  <strong>{mon.name}</strong>
                  <div className="muted">Lv {mon.level} · {mon.types.join("/")}</div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - party.length) }).map((_, i) => (
                <div key={i} className="card empty" onClick={onOpenAdd}>+ Add</div>
              ))}
            </div>
          </details>

          <details open className="panel">
            <summary>Quick Actions</summary>
            <div className="btn-group">
              <button className="btn" onClick={() => onNavigate("team")}>Manage Team</button>
              <button className="btn" onClick={() => onNavigate("encounters")}>Go to Encounters</button>
              <button className="btn" onClick={() => onNavigate("calculator")}>Open Calculator</button>
              <button className="btn" onClick={() => onNavigate("boss")}>Boss Quick Load</button>
              <button className="btn" onClick={() => onNavigate("ivev")}>IV / EV Tracker</button>
            </div>
          </details>
        </div>

        <div className="col">
          <details open className="panel">
            <summary>Recent Encounters</summary>
            <div className="list">
              <div className="listItem">
                <div>
                  <strong>Route 104</strong>
                  <div className="muted">Taillow — Caught</div>
                </div>
                <span className="outcome-tag caught">Caught</span>
              </div>
              <div className="listItem">
                <div>
                  <strong>Petalburg Woods</strong>
                  <div className="muted">Shroomish — Missed</div>
                </div>
                <span className="outcome-tag missed">Missed</span>
              </div>
            </div>
          </details>

          <details open className="panel">
            <summary>Run Notes</summary>
            <textarea rows="5" placeholder="Strategy notes, reminders..."></textarea>
          </details>
        </div>
      </div>
    </section>
  );
}
