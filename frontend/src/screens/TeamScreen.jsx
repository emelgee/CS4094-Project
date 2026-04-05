import PokemonCard from "../components/PokemonCard";

export default function TeamScreen({
  party,
  pcBox,
  onSendToBox,
  onRemove,
  onWithdraw,
  onRelease,
  onOpenAdd,
  onNavigate,
}) {
  const emptySlots = Math.max(0, 6 - party.length);

  return (
    <section>
      <div className="page-header rowBetween">
        <div>
          <h1>Your Team</h1>
          <p className="muted">Active party (max 6) · Manage stats, moves, and nature. Overflow goes to PC Box.</p>
        </div>
        <button
          className="btn"
          onClick={() => document.getElementById("pcBoxAnchor")?.scrollIntoView({ behavior: "smooth" })}
        >
          💾 PC Box ↓
        </button>
      </div>

      <div className="rowBetween mb8">
        <strong>Active Party <span className="muted small">({party.length} / 6)</span></strong>
        <button className="btn small" onClick={onOpenAdd}>+ Add Pokémon</button>
      </div>

      <div className="grid">
        {party.map((mon) => (
          <PokemonCard
            key={mon.id}
            mon={mon}
            onSendToBox={onSendToBox}
            onRemove={onRemove}
            onNavigate={onNavigate}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="card empty big" onClick={onOpenAdd}>+ Add Pokémon</div>
        ))}
      </div>

      {/* PC Box */}
      <div id="pcBoxAnchor" style={{ marginTop: 28 }}>
        <div className="rowBetween mb8">
          <div>
            <strong>💾 PC Box</strong>
            <span className="muted small" style={{ marginLeft: 8 }}>({pcBox.length} stored)</span>
          </div>
          <span className="muted small">Pokémon here can be withdrawn back to party</span>
        </div>

        <div className="grid">
          {pcBox.length === 0 ? (
            <div className="card empty big" style={{ gridColumn: "1 / -1" }}>
              📦 PC Box is empty. Send Pokémon here when your party is full.
            </div>
          ) : (
            pcBox.map((mon, idx) => (
              <div key={idx} className="pc-box-card">
                <div className="pc-mon-header">
                  <strong>{mon.name}</strong>
                  <span className="badge">Lv {mon.level}</span>
                </div>
                <div className="pc-mon-meta" style={{ margin: "4px 0" }}>
                  {mon.types.map((t) => (
                    <span key={t} className={`type-chip type-${t.toLowerCase().split("/")[0]}`}>{t}</span>
                  ))}
                </div>
                {mon.moves.filter(Boolean).length > 0 && (
                  <div className="pc-mon-meta">{mon.moves.filter(Boolean).slice(0, 4).join(" · ")}</div>
                )}
                <div className="pc-box-actions">
                  <button className="btn small" onClick={() => onWithdraw(idx)}>⬆ Withdraw</button>
                  <button className="ghost small danger" onClick={() => onRelease(idx)}>Release</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
