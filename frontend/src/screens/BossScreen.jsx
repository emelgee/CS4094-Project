import { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../data/constants";
import {
  groupBossTrainers,
  getBossVariantLabel,
  formatTrainerMaps,
  formatSpeciesName,
  getPokemonSpriteUrl,
  capitalize,
} from "../utils/helpers";

export default function BossScreen({ onNavigate }) {
  const [trainers, setTrainers] = useState([]);
  const [pokemonIndex, setPokemonIndex] = useState({});
  const [activeBossGroupKey, setActiveBossGroupKey] = useState("");
  const [activeBossVariantId, setActiveBossVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadBossData() {
      setLoading(true);
      setError("");
      try {
        const [trainerRes, pokemonRes] = await Promise.all([
          fetch(`${API_BASE}/api/trainers`),
          fetch(`${API_BASE}/api/pokemon`),
        ]);
        if (!trainerRes.ok) throw new Error("Failed to load trainer data.");
        if (!pokemonRes.ok) throw new Error("Failed to load pokemon data.");
        const [trainerData, pokemonData] = await Promise.all([trainerRes.json(), pokemonRes.json()]);
        if (cancelled) return;

        const pokemonMap = {};
        for (const p of Array.isArray(pokemonData) ? pokemonData : []) {
          pokemonMap[String(p.name || "").toLowerCase()] = p;
        }

        const rows = Array.isArray(trainerData) ? trainerData : [];
        // Filter to boss trainers only (done inside groupBossTrainers)
        setPokemonIndex(pokemonMap);
        setTrainers(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load boss data.");
          setTrainers([]);
          setPokemonIndex({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBossData();
    return () => { cancelled = true; };
  }, []);

  const bossGroups = useMemo(() => groupBossTrainers(trainers), [trainers]);

  useEffect(() => {
    if (bossGroups.length === 0) { setActiveBossGroupKey(""); return; }
    setActiveBossGroupKey((current) =>
      bossGroups.some((g) => g.key === current) ? current : bossGroups[0].key
    );
  }, [bossGroups]);

  useEffect(() => {
    if (bossGroups.length === 0 || !activeBossGroupKey) { setActiveBossVariantId(""); return; }
    const activeGroup = bossGroups.find((g) => g.key === activeBossGroupKey) || bossGroups[0];
    if (!activeGroup) { setActiveBossVariantId(""); return; }
    setActiveBossVariantId((current) =>
      activeGroup.trainers.some((t) => t.id === current) ? current : activeGroup.trainers[0]?.id || ""
    );
  }, [bossGroups, activeBossGroupKey]);

  const activeGroup   = bossGroups.find((g) => g.key === activeBossGroupKey) || bossGroups[0] || null;
  const activeTrainer = activeGroup?.trainers.find((t) => t.id === activeBossVariantId) || activeGroup?.trainers[0] || null;
  const activeTeam    = Array.isArray(activeTrainer?.pokemon) ? activeTrainer.pokemon : [];
  const activeTrainerMaps = activeTrainer ? formatTrainerMaps(activeTrainer) : [];

  const activeTeamDetails = activeTeam.map((entry) => {
    const pokemon = pokemonIndex[String(entry.species || "").toLowerCase()] || null;
    return {
      ...entry,
      pokemon,
      displayName: formatSpeciesName(entry.species),
      stats: pokemon ? { HP: pokemon.hp, Atk: pokemon.attack, Def: pokemon.defense, SpA: pokemon.sp_attack, SpD: pokemon.sp_defense, Spe: pokemon.speed } : null,
      types: pokemon ? [pokemon.type1, pokemon.type2].filter(Boolean) : [],
    };
  });

  const variantLabel = activeTrainer ? getBossVariantLabel(activeTrainer) : "";
  const variantSelectLabel =
    activeGroup?.role === "Rival"       ? "Battle variant" :
    activeGroup?.role === "Gym Leader"  ? "Rematch"        : "Variant";

  return (
    <section>
      <div className="page-header">
        <h1>Boss Data</h1>
        <p className="muted">Bosses are grouped once, with rematches and rival battle variants selectable from the same card.</p>
      </div>

      <div className="twoCol">
        {/* ── Left: boss list ── */}
        <div className="col">
          <div className="rowBetween mb8">
            <strong>Bosses — Emerald</strong>
            <select style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} disabled>
              <option>Emerald</option>
            </select>
          </div>
          <p className="muted small mb8">
            Gym leaders collapse into one entry with rematch options. Rivals collapse into one entry with route and starter variants.
          </p>

          {loading && <div className="panel muted">Loading boss data…</div>}
          {!loading && error && <div className="panel muted">{error}</div>}

          <div className="list">
            {bossGroups.map((group) => (
              <div
                key={group.key}
                className={`listItem boss-list-item${activeBossGroupKey === group.key ? " active" : ""}`}
                onClick={() => setActiveBossGroupKey(group.key)}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <strong>{group.name}</strong>
                  <div className="muted">{group.subtitle}</div>
                </div>
                <div className="row">
                  <span className={`type-chip type-${group.type}`}>{capitalize(group.type)}</span>
                  <span className="badge">{group.role}</span>
                  <span className="badge">{group.trainers.length} {group.trainers.length === 1 ? "set" : "sets"}</span>
                </div>
              </div>
            ))}
            {!loading && !error && bossGroups.length === 0 && (
              <div className="listItem"><div className="muted">No boss data found.</div></div>
            )}
          </div>
        </div>

        {/* ── Right: boss detail ── */}
        <div className="col">
          <details key={activeGroup ? activeGroup.key : "no-boss-selected"} open className="panel">
            <summary>{activeGroup ? `${activeGroup.name} — ${variantLabel}` : "Select a boss"}</summary>

            {activeGroup ? (
              <div>
                <div className="boss-meta">
                  <span className={`type-chip type-${activeGroup.type}`}>{capitalize(activeGroup.type)}</span>
                  <span className="badge">{activeGroup.role}</span>
                  <span className="muted small">{activeGroup.subtitle}</span>
                </div>
                <div className="formGrid" style={{ marginTop: 8 }}>
                  <label>
                    {variantSelectLabel}
                    <select
                      value={activeBossVariantId}
                      onChange={(e) => setActiveBossVariantId(e.target.value)}
                      disabled={!activeGroup || activeGroup.trainers.length === 0}
                    >
                      {activeGroup.trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>{getBossVariantLabel(trainer)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="muted small mt8">Selected battle: {variantLabel}</div>
                <div className="muted small mt8">Maps: {activeTrainerMaps.length > 0 ? activeTrainerMaps.join(", ") : "Unassigned"}</div>
                {Array.isArray(activeTrainer?.items) && activeTrainer.items.length > 0 && (
                  <div className="boss-moves mt8">
                    {activeTrainer.items.map((item) => <span key={item} className="move-tag">{item}</span>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="muted small mt8">No boss data loaded yet.</div>
            )}

            <div className="list mt8">
              {activeTeamDetails.map((p, index) => (
                <div key={`${activeGroup ? activeGroup.key : "boss"}-${index}-${p.species}-${p.level}`} className="boss-poke-card">
                  <div className="rowBetween">
                    <div className="boss-poke-head">
                      <img
                        className="boss-poke-sprite"
                        src={getPokemonSpriteUrl(p.pokemon?.id, p.species || p.displayName)}
                        alt={`${p.displayName} sprite`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
                        }}
                      />
                      <strong>{p.displayName}</strong>
                    </div>
                    <div>
                      <span className="badge">Lv {p.level}</span>
                      {p.types.map((t) => <span key={t} className={`type-chip type-${t.toLowerCase()}`}>{t}</span>)}
                    </div>
                  </div>
                  <div className="muted small">
                    {p.stats ? `Base stats from Pokémon data for ${p.displayName}` : `Pokémon data not found for ${p.displayName}`}
                  </div>
                  {p.stats && (
                    <div className="boss-stats">
                      {Object.entries(p.stats).map(([k, v]) => <span key={k}>{k} <strong>{v}</strong></span>)}
                    </div>
                  )}
                  <div className="boss-moves">
                    {(p.moves || []).map((m) => <span key={m} className="move-tag">{m}</span>)}
                  </div>
                </div>
              ))}
            </div>

            <div className="row mt8">
              <button className="btn small" onClick={() => onNavigate("calculator")}>Load into Calc</button>
              <button className="ghost small">Export Team</button>
            </div>
          </details>

          <details className="panel">
            <summary>Threat Notes</summary>
            <textarea
              rows="4"
              placeholder="Danger moves, recommended types, strategy notes..."
              defaultValue="Rock Throw can threaten Flying/Bug types. Nosepass high def — use special attackers or Fighting types if available."
            ></textarea>
          </details>
        </div>
      </div>
    </section>
  );
}
