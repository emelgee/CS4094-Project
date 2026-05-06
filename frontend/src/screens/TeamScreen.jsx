import PokemonCard from "../components/PokemonCard";
import { getPokemonSpriteUrl } from "../utils/helpers";

export default function TeamScreen({
  party,
  pcBox,
  graveyard = [],
  onSendToBox,
  onSendToGraveyard,
  onRevive,
  onRemove,
  onWithdraw,
  onRelease,
  onOpenAdd,
  onNavigate,
  onSave,
}) {
  const emptySlots = Math.max(0, 6 - party.length);

  return (
    <section>
      <div className="page-header rowBetween">
        <div>
          <h1>Your Team</h1>
          <p className="muted">
            Active party (max 6) · Manage stats, moves, and nature. Overflow
            goes to PC Box. Send fainted Pokémon to the Graveyard.
          </p>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() =>
              document
                .getElementById("pcBoxAnchor")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            💾 PC Box ↓
          </button>
          <button
            className="btn"
            onClick={() =>
              document
                .getElementById("graveyardAnchor")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            🪦 Graveyard ↓
          </button>
        </div>
      </div>

      <div className="rowBetween mb8">
        <strong>
          Active Party <span className="muted small">({party.length} / 6)</span>
        </strong>
        <button className="btn small" onClick={onOpenAdd}>+ Add Pokemon</button>
      </div>

      <div className="grid">
        {party.map((mon) => (
          <PokemonCard
            key={mon.id}
            mon={mon}
            onSendToBox={onSendToBox}
            onSendToGraveyard={onSendToGraveyard}
            onRemove={onRemove}
            onNavigate={onNavigate}
            onSave={onSave}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="card empty big" onClick={onOpenAdd}>
            + Add
          </div>
        ))}
      </div>

      {/* PC Box */}
      <div id="pcBoxAnchor" style={{ marginTop: 28 }}>
        <div className="rowBetween mb8">
          <div>
            <strong>💾 PC Box</strong>
            <span className="muted small" style={{ marginLeft: 8 }}>
              ({pcBox.length} stored)
            </span>
          </div>
          <span className="muted small">
            Pokémon here can be withdrawn back to party
          </span>
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
                  <div className="pc-mon-name-wrap">
                    <img
                      className="pc-mon-sprite"
                      src={getPokemonSpriteUrl(mon.pokemonId, mon.name)}
                      alt={`${mon.name} sprite`}
                      loading="lazy"
                    />
                    <strong>{mon.name}</strong>
                  </div>
                  <span className="badge">Lv {mon.level}</span>
                </div>
                <div className="pc-mon-meta" style={{ margin: "4px 0" }}>
                  {mon.types.map((t) => (
                    <span
                      key={t}
                      className={`type-chip type-${
                        t.toLowerCase().split("/")[0]
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {mon.moves.filter(Boolean).length > 0 && (
                  <div className="pc-mon-meta">
                    {mon.moves.filter(Boolean).slice(0, 4).join(" · ")}
                  </div>
                )}
                <div className="pc-box-actions">
                  <button
                    className="btn small"
                    onClick={() => onWithdraw(mon.id)}
                  >
                    ⬆ Withdraw
                  </button>
                  {onSendToGraveyard && (
                    <button
                      className="ghost small danger"
                      onClick={() => onSendToGraveyard(mon.id)}
                      title="Move to Graveyard"
                    >
                      🪦 Graveyard
                    </button>
                  )}
                  <button
                    className="ghost small danger"
                    onClick={() => onRelease(mon.id)}
                  >
                    Release
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Graveyard */}
      <div id="graveyardAnchor" style={{ marginTop: 28 }}>
        <div className="rowBetween mb8">
          <div>
            <strong>🪦 Graveyard</strong>
            <span className="muted small" style={{ marginLeft: 8 }}>
              ({graveyard.length} fallen)
            </span>
          </div>
          <span className="muted small">
            Pokémon that have fainted in your run. Revive moves them back to
            the PC Box.
          </span>
        </div>

        <div className="grid">
          {graveyard.length === 0 ? (
            <div className="card empty big" style={{ gridColumn: "1 / -1" }}>
              🕊 No fallen Pokémon. May it stay that way.
            </div>
          ) : (
            graveyard.map((mon) => (
              <div key={mon.id} className="pc-box-card graveyard-card">
                <div className="pc-mon-header">
                  <div className="pc-mon-name-wrap">
                    <img
                      className="pc-mon-sprite"
                      src={getPokemonSpriteUrl(mon.pokemonId, mon.name)}
                      alt={`${mon.name} sprite`}
                      loading="lazy"
                    />
                    <strong>{mon.nickname || mon.name}</strong>
                  </div>
                  <span className="badge">Lv {mon.level}</span>
                </div>
                <div className="pc-mon-meta" style={{ margin: "4px 0" }}>
                  {mon.types.map((t) => (
                    <span
                      key={t}
                      className={`type-chip type-${t.toLowerCase().split("/")[0]}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="pc-box-actions">
                  {onRevive && (
                    <button
                      className="btn small"
                      onClick={() => onRevive(mon.id)}
                      title="Move back to PC Box"
                    >
                      ✨ Revive
                    </button>
                  )}
                  <button
                    className="ghost small danger"
                    onClick={() => onRelease(mon.id)}
                  >
                    Release
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
