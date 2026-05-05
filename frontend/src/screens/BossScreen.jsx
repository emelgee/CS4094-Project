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
import {
  getCoverageRecommendations,
  getKeyThreats,
  getNotableTraits,
  getSpeedTier,
  getOhkoThreats,
} from "../utils/threatNotes";

export default function BossScreen({ onNavigate, onLoadIntoCalc, party = [] }) {
  const [trainers, setTrainers] = useState([]);
  const [pokemonIndex, setPokemonIndex] = useState({});
  const [allMoves, setAllMoves] = useState([]);
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
        const [trainerRes, pokemonRes, movesRes] = await Promise.all([
          fetch(`${API_BASE}/api/trainers`),
          fetch(`${API_BASE}/api/pokemon`),
          fetch(`${API_BASE}/api/moves`),
        ]);
        if (!trainerRes.ok) throw new Error("Failed to load trainer data.");
        if (!pokemonRes.ok) throw new Error("Failed to load pokemon data.");
        // Moves are only used for the threat analysis — non-fatal if it fails.
        const [trainerData, pokemonData, movesData] = await Promise.all([
          trainerRes.json(),
          pokemonRes.json(),
          movesRes.ok ? movesRes.json() : Promise.resolve([]),
        ]);
        if (cancelled) return;

        const pokemonMap = {};
        for (const p of Array.isArray(pokemonData) ? pokemonData : []) {
          pokemonMap[String(p.name || "").toLowerCase()] = p;
        }

        const rows = Array.isArray(trainerData) ? trainerData : [];
        // Filter to boss trainers only (done inside groupBossTrainers)
        setPokemonIndex(pokemonMap);
        setTrainers(rows);
        setAllMoves(Array.isArray(movesData) ? movesData : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load boss data.");
          setTrainers([]);
          setPokemonIndex({});
          setAllMoves([]);
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

  // ── Threat analysis (auto-derived from data above) ──────────────────
  const activeTrainerItems = Array.isArray(activeTrainer?.items) ? activeTrainer.items : [];
  const coverage = useMemo(
    () => getCoverageRecommendations(activeTeam, pokemonIndex),
    [activeTeam, pokemonIndex],
  );
  const keyThreats = useMemo(
    () => getKeyThreats(activeTeam, pokemonIndex, allMoves),
    [activeTeam, pokemonIndex, allMoves],
  );
  const notableTraits = useMemo(
    () => getNotableTraits(activeTeam, pokemonIndex, activeTrainerItems),
    [activeTeam, pokemonIndex, activeTrainerItems],
  );
  const speedTier = useMemo(
    () => getSpeedTier(activeTeam, pokemonIndex),
    [activeTeam, pokemonIndex],
  );
  const ohkoThreats = useMemo(
    () => getOhkoThreats(activeTeam, pokemonIndex, allMoves, party),
    [activeTeam, pokemonIndex, allMoves, party],
  );

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
              <button
                className="btn small"
                disabled={!activeTrainer}
                onClick={() => {
                  if (!activeTrainer) return;
                  // Hand the trainer (and their lead Pokémon) to the
                  // calculator. Falls back to plain navigation if the
                  // host didn't wire onLoadIntoCalc.
                  if (onLoadIntoCalc) onLoadIntoCalc(activeTrainer.id, 0);
                  else onNavigate("calculator");
                }}
              >
                Load into Calc
              </button>
            </div>
          </details>

          <details open className="panel">
            <summary>Threat Analysis</summary>
            {!activeTrainer && (
              <div className="muted small">Select a boss to see analysis.</div>
            )}

            {activeTrainer && (
              <div className="threat-analysis">
                {/* Coverage */}
                <div className="threat-section">
                  <div className="threat-label">Bring against this team</div>
                  {coverage.bring.length === 0 ? (
                    <div className="muted small">No clear type advantage — go neutral.</div>
                  ) : (
                    <div className="threat-chip-row">
                      {coverage.bring.map((c) => (
                        <span
                          key={c.type}
                          className={`type-chip type-${c.type}`}
                          title={`Avg ${c.avg.toFixed(2)}× across the team`}
                        >
                          {capitalize(c.type)} ×{c.avg.toFixed(1)}
                        </span>
                      ))}
                    </div>
                  )}

                  {coverage.avoid.length > 0 && (
                    <>
                      <div className="threat-label" style={{ marginTop: 8 }}>
                        Avoid — resisted by team
                      </div>
                      <div className="threat-chip-row">
                        {coverage.avoid.map((c) => (
                          <span
                            key={c.type}
                            className={`type-chip type-${c.type}`}
                            style={{ opacity: 0.55 }}
                            title={`Avg ${c.avg.toFixed(2)}× across the team`}
                          >
                            {capitalize(c.type)} ×{c.avg.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Key offensive threats */}
                <div className="threat-section">
                  <div className="threat-label">Key offensive threats</div>
                  <ul className="threat-list">
                    {keyThreats.map((t, i) => (
                      <li key={`${t.species}-${i}`}>
                        <strong>{t.species}</strong>
                        <span className="muted small"> · Lv {t.level ?? "?"}</span>
                        {t.strongest ? (
                          <>
                            {" — "}
                            <span
                              className={`type-chip type-${t.strongest.type || "normal"}`}
                              style={{ marginRight: 4 }}
                            >
                              {t.strongest.name}
                            </span>
                            <span className="muted small">
                              BP {t.strongest.power ?? "—"}
                              {t.strongest.accuracy ? ` · ${t.strongest.accuracy}%` : ""}
                              {t.strongest.stab ? " · STAB" : ""}
                            </span>
                          </>
                        ) : (
                          <span className="muted small"> — no damaging moves listed</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* OHKO/2HKO vs your party */}
                {ohkoThreats.length > 0 && (
                  <div className="threat-section">
                    <div className="threat-label">Versus your party</div>
                    <ul className="threat-list">
                      {ohkoThreats.map((t, i) => (
                        <li key={`${t.bossSpecies}-${t.move.name}-${t.partyName}-${i}`}>
                          <span
                            className={`threat-tag ${t.ohko ? "ohko" : t.twohko ? "twohko" : "warn"}`}
                          >
                            {t.ohko ? "OHKO" : t.twohko ? "2HKO" : "Threat"}
                          </span>
                          <strong>{t.bossSpecies}</strong>
                          {"'s "}
                          <span className={`type-chip type-${t.move.type}`}>{t.move.name}</span>
                          {" → "}
                          <strong>{t.partyName}</strong>
                          <span className="muted small">
                            {" "}
                            ({t.minPct.toFixed(0)}–{t.maxPct.toFixed(0)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notable traits */}
                {(notableTraits.abilities.length > 0 ||
                  notableTraits.items.length > 0) && (
                  <div className="threat-section">
                    <div className="threat-label">Watch out for</div>
                    <ul className="threat-list">
                      {notableTraits.abilities.map((a, i) => (
                        <li key={`ab-${i}`}>
                          <strong>{a.species}</strong> · {a.ability}
                          <span className="muted small"> — {a.why}</span>
                        </li>
                      ))}
                      {notableTraits.items
                        .filter((it) => it.why)
                        .map((it, i) => (
                          <li key={`it-${i}`}>
                            <span className="move-tag">{it.item}</span>
                            <span className="muted small"> — {it.why}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Speed line */}
                {speedTier && (
                  <div className="threat-section">
                    <div className="threat-label">Speed line</div>
                    <div className="muted small">
                      Fastest: <strong>{speedTier.species}</strong> at{" "}
                      <strong>{speedTier.spe}</strong> Spe (Lv {speedTier.level}).
                    </div>
                  </div>
                )}

                {party.length === 0 && (
                  <div className="muted small">
                    Tip: add Pokémon to your party for OHKO/2HKO warnings against your team.
                  </div>
                )}
              </div>
            )}
          </details>
        </div>
      </div>
    </section>
  );
}
