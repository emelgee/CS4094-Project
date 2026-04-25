import { useState, useEffect } from "react";
import { API_BASE } from "../data/constants";
import {
  groupTrainersByRoute,
  formatTrainerRoute,
  formatSpeciesName,
  buildTrainerPokemonView,
  gen3CombatStat,
  capitalize,
} from "../utils/helpers";
import { calculateDamage } from "../utils/calc";

export default function CalculatorScreen({
  onNavigate,
  encounters = [],
  party = [],
  onRefreshEncounters,
  visible = false,
}) {
  const [defMode, setDefMode] = useState("lookup");
  const [trainerRows, setTrainerRows] = useState([]);
  const [pokemonIndex, setPokemonIndex] = useState({});
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedPokemonIndex, setSelectedPokemonIndex] = useState("");
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [preview, setPreview] = useState(null);

  const [moves, setMoves] = useState([]);
  const [attackerPartyMonId, setAttackerPartyMonId] = useState("");
  const [defenderId, setDefenderId] = useState("");
  const [moveId, setMoveId] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [damageResult, setDamageResult] = useState(null);
  const [crit, setCrit] = useState(false);
  const [burned, setBurned] = useState(false);
  const [weather, setWeather] = useState("");
  const [lookupDefender, setLookupDefender] = useState(null);
  const [lookupAddError, setLookupAddError] = useState(null);
  const [defenderHp, setDefenderHp] = useState(null);

  // Load moves when calculator becomes visible
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/moves?orderBy=power`);
        if (!res.ok) throw new Error("Failed to load moves");
        const data = await res.json();
        if (!cancelled)
          setMoves(data.filter((m) => m.power != null && Number(m.power) > 0));
      } catch {
        if (!cancelled) setMoves([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Load trainer + pokemon data when calculator becomes visible
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function loadTrainerData() {
      setLookupLoading(true);
      setLookupError("");
      try {
        const [trainerRes, pokemonRes] = await Promise.all([
          fetch(`${API_BASE}/api/trainers`),
          fetch(`${API_BASE}/api/pokemon`),
        ]);
        if (!trainerRes.ok) throw new Error("Failed to load trainer data.");
        if (!pokemonRes.ok) throw new Error("Failed to load Pokémon data.");
        const [trainerData, pokemonData] = await Promise.all([
          trainerRes.json(),
          pokemonRes.json(),
        ]);
        if (cancelled) return;

        const index = {};
        for (const p of Array.isArray(pokemonData) ? pokemonData : []) {
          index[String(p.name || "").toLowerCase()] = p;
        }
        const rows = Array.isArray(trainerData) ? trainerData : [];
        setPokemonIndex(index);
        setTrainerRows(rows);
        const firstRoute = formatTrainerRoute(rows[0]);
        setSelectedRoute(firstRoute || "");
        setSelectedTrainerId(rows[0]?.id || "");
      } catch (err) {
        if (!cancelled) {
          setLookupError(err.message || "Failed to load trainer lookup data.");
          setTrainerRows([]);
          setPokemonIndex({});
          setSelectedRoute("");
          setSelectedTrainerId("");
          setSelectedPokemonIndex("");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    }
    loadTrainerData();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const groupedTrainers = groupTrainersByRoute(trainerRows);
  const routeEntries = Object.entries(groupedTrainers).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const trainerEntries =
    selectedRoute && groupedTrainers[selectedRoute]
      ? groupedTrainers[selectedRoute]
      : [];
  const selectedTrainer =
    trainerEntries.find((t) => t.id === selectedTrainerId) ||
    trainerEntries[0] ||
    null;
  const selectedTeam = Array.isArray(selectedTrainer?.pokemon)
    ? selectedTrainer.pokemon
    : [];
  const trainerRouteLabel = selectedTrainer
    ? formatTrainerRoute(selectedTrainer)
    : "Unassigned";

  const handlePokeChange = (idx) => {
    setSelectedPokemonIndex(idx);
    const sel = idx !== "" ? selectedTeam[Number(idx)] || null : null;
    setPreview(sel ? buildTrainerPokemonView(sel, pokemonIndex) : null);
  };

  const handleRouteChange = (routeLabel) => {
    setSelectedRoute(routeLabel);
    const first = groupedTrainers[routeLabel]?.[0] || null;
    setSelectedTrainerId(first?.id || "");
    setSelectedPokemonIndex("");
    setPreview(null);
  };

  const handleTrainerChange = (trainerId) => {
    setSelectedTrainerId(trainerId);
    setSelectedPokemonIndex("");
    setPreview(null);
  };

  const encounterOptionLabel = (e) =>
    `${e.nickname || e.pokemon_name || "Pokémon"} · Lv.${e.level} · #${e.id}`;

  const handleDamageCalculate = async () => {
    setCalcError(null);
    setDamageResult(null);
    if (!attackerPartyMonId) {
      setCalcError("Choose a party attacker.");
      return;
    }
    const atkMon = party.find((m) => String(m.id) === attackerPartyMonId);
    if (!atkMon || !atkMon.stats) {
      setCalcError("Party Pokémon is missing stats.");
      return;
    }
    if (!moveId) {
      setCalcError("Choose a move.");
      return;
    }
    const moveRow = moves.find((m) => String(m.id) === String(moveId));
    if (!moveRow) {
      setCalcError("Move list not loaded.");
      return;
    }

    const usePreviewDef = !defenderId && lookupDefender;
    if (!defenderId && !usePreviewDef) {
      setCalcError(
        "Choose a defender encounter, or use the lookup to Add as Defender."
      );
      return;
    }

    setCalcLoading(true);
    try {
      let defStat, spdStat, type1, type2, hpStat;

      if (defenderId) {
        const enc = encounters.find((e) => String(e.id) === String(defenderId));
        if (!enc || enc.pokemon_id == null) {
          setCalcError("Defender encounter not found.");
          return;
        }
        const pres = await fetch(`${API_BASE}/api/pokemon/${enc.pokemon_id}`);
        if (!pres.ok) {
          setCalcError("Could not load defender species.");
          return;
        }
        const p = await pres.json();
        const lv = Number(enc.level);
        defStat = gen3CombatStat(p.defense, enc.defense_iv, enc.defense_ev, lv);
        spdStat = gen3CombatStat(
          p.sp_defense,
          enc.sp_defense_iv,
          enc.sp_defense_ev,
          lv
        );
        hpStat = Math.floor(
          ((2 * (Number(p.hp) || 0) + (enc.hp_iv ?? 31) + Math.floor((enc.hp_ev ?? 0) / 4)) * lv) / 100
        ) + lv + 10;
        type1 = p.type1;
        type2 = p.type2;
      } else {
        defStat = lookupDefender.battleStats?.Def;
        spdStat = lookupDefender.battleStats?.SpD;
        hpStat = lookupDefender.battleStats?.HP ?? null;
        type1 = lookupDefender.basePokemon?.type1 || "normal";
        type2 = lookupDefender.basePokemon?.type2 || null;
      }

      const atkTypes = (atkMon.types || []).map((t) => String(t).toLowerCase());
      const conditions = { isCrit: crit, isBurned: burned, weather: weather || "" };

      const out = calculateDamage(
        {
          level: atkMon.level,
          attack: atkMon.stats.atk,
          sp_attack: atkMon.stats.spa,
          type1: atkTypes[0] || null,
          type2: atkTypes[1] || null,
          item: atkMon.item || null,
          atkStage: 0,
          spAtkStage: 0,
        },
        {
          defense: defStat,
          sp_defense: spdStat,
          type1,
          type2,
          defStage: 0,
          spDefStage: 0,
        },
        { type: moveRow.type, basePower: moveRow.power },
        conditions
      );
      setDamageResult(out);
      setDefenderHp(hpStat ?? null);
    } catch (err) {
      setCalcError(err.message || "Calculation failed");
    } finally {
      setCalcLoading(false);
    }
  };

  const handleAddLookupAsDefender = () => {
    if (!preview) return;
    setLookupAddError(null);
    setLookupDefender(preview);
    setDefenderId("");
  };

  const handleReset = () => {
    setAttackerPartyMonId("");
    setDefenderId("");
    setMoveId("");
    setCrit(false);
    setBurned(false);
    setWeather("");
    setDamageResult(null);
    setDefenderHp(null);
    setCalcError(null);
    setDefMode("lookup");
    setSelectedPokemonIndex("");
    setPreview(null);
    setLookupDefender(null);
    setLookupAddError(null);
  };

  const resultMain =
    damageResult &&
    typeof damageResult.min === "number" &&
    typeof damageResult.max === "number"
      ? `${damageResult.min} – ${damageResult.max}`
      : "—";

  const canCalculate = Boolean(
    attackerPartyMonId &&
    moveId &&
    moves.length &&
    (defenderId || lookupDefender)
  );

  return (
    <section>
      <div className="page-header">
        <h1>Damage Calculator</h1>
        <p className="muted">
          Gen 3 mechanics · parity target with Pokémon Showdown.
        </p>
      </div>

      <div className="twoCol">
        <div className="col">
          {/* ── Damage calc inputs ── */}
          <details open className="panel">
            <summary>Damage calc</summary>
            <p className="muted small" style={{ marginTop: 4 }}>
              Estimate uses your party&apos;s Attack / Sp. Atk and level, the
              move&apos;s power and type, plus defender stats (from a logged
              encounter or the route lookup preview). Crit, burn, and weather
              are applied; held items and unknown stat stages are ignored.
            </p>
            <div className="formGrid">
              <label>
                Attacker (from party)
                <select
                  value={attackerPartyMonId}
                  onChange={(e) => setAttackerPartyMonId(e.target.value)}
                >
                  <option value="">
                    {party.length
                      ? "Select party Pokémon…"
                      : "Party is empty — add Pokémon on Team"}
                  </option>
                  {party.map((mon) => (
                    <option key={mon.id} value={String(mon.id)}>
                      {mon.name} · Lv.{mon.level}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Defender (opponent)
                <select
                  value={lookupDefender && !defenderId ? "__lookup__" : defenderId}
                  onChange={(e) => {
                    if (e.target.value === "__lookup__") return;
                    setDefenderId(e.target.value);
                    setLookupDefender(null);
                  }}
                >
                  <option value="">Select encounter…</option>
                  {lookupDefender && (
                    <option value="__lookup__">
                      {lookupDefender.displayName} · Lv.{lookupDefender.level} — from lookup
                    </option>
                  )}
                  {encounters.map((e) => (
                    <option key={e.id} value={e.id}>
                      {encounterOptionLabel(e)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Move
                <select
                  value={moveId}
                  onChange={(e) => setMoveId(e.target.value)}
                >
                  <option value="">Select move…</option>
                  {moves.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type}) — power {m.power}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Weather
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                >
                  <option value="">None</option>
                  <option value="sun">Sun</option>
                  <option value="rain">Rain</option>
                </select>
              </label>
            </div>

            <div className="row mt8" style={{ flexWrap: "wrap" }}>
              <label className="row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={crit}
                  onChange={(e) => setCrit(e.target.checked)}
                />
                <span className="muted small">Critical hit</span>
              </label>
              <label className="row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={burned}
                  onChange={(e) => setBurned(e.target.checked)}
                />
                <span className="muted small">Attacker burned</span>
              </label>
            </div>

            {calcError && (
              <p className="muted small" style={{ color: "#f87171" }}>
                {calcError}
              </p>
            )}

            <div className="row mt8">
              <button
                type="button"
                className="btn"
                disabled={calcLoading || !canCalculate}
                onClick={handleDamageCalculate}
              >
                {calcLoading ? "…" : "Calculate"}
              </button>
              <button type="button" className="ghost" onClick={handleReset}>
                Reset
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => onNavigate("team")}
              >
                Team
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => onNavigate("encounters")}
              >
                Encounters
              </button>
            </div>
          </details>

          {/* ── Route / trainer lookup ── */}
          <details className="panel">
            <summary>Route / trainer lookup (reference)</summary>
            <div className="rowBetween mb8" style={{ marginTop: 8 }}>
              <span className="muted small">Input mode:</span>
              <div className="def-mode-toggle">
                <button
                  className={`def-mode-btn${defMode === "lookup" ? " active" : ""}`}
                  onClick={() => setDefMode("lookup")}
                >
                  🔍 Game Lookup
                </button>
                <button
                  className={`def-mode-btn${defMode === "manual" ? " active" : ""}`}
                  onClick={() => setDefMode("manual")}
                >
                  ⚙ Showdown / Manual
                </button>
              </div>
            </div>

            {defMode === "lookup" && (
              <div>
                {lookupLoading && (
                  <div className="panel muted">Loading trainer database…</div>
                )}
                {!lookupLoading && lookupError && (
                  <div className="panel muted">{lookupError}</div>
                )}
                <div className="formGrid">
                  <label>
                    Route / Location
                    <select
                      value={selectedRoute}
                      disabled={!routeEntries.length}
                      onChange={(e) => handleRouteChange(e.target.value)}
                    >
                      <option value="">Select Route...</option>
                      {routeEntries.map(([routeLabel]) => (
                        <option key={routeLabel} value={routeLabel}>
                          {routeLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Trainer
                    <select
                      value={selectedTrainerId}
                      disabled={!selectedRoute || trainerEntries.length === 0}
                      onChange={(e) => handleTrainerChange(e.target.value)}
                    >
                      <option value="">Select Trainer...</option>
                      {trainerEntries.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>
                          {trainer.name}{" "}
                          {trainer.party ? `(${trainer.party})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Opponent Pokémon
                    <select
                      value={selectedPokemonIndex}
                      disabled={!selectedTrainer || selectedTeam.length === 0}
                      onChange={(e) => handlePokeChange(e.target.value)}
                    >
                      <option value="">Select Pokémon...</option>
                      {selectedTeam.map((pokemon, index) => (
                        <option key={index} value={index}>
                          Lv.{pokemon.level}{" "}
                          {formatSpeciesName(pokemon.species)}{" "}
                          {pokemon.iv != null ? `· IV ${pokemon.iv}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedTrainer && (
                  <div className="panel mt8">
                    <div className="rowBetween">
                      <strong>{selectedTrainer.name}</strong>
                      {preview && (
                        <div className="row">
                          {lookupAddError && (
                            <span
                              className="muted small"
                              style={{ color: "#f87171" }}
                            >
                              {lookupAddError}
                            </span>
                          )}
                          <button
                            className="btn small"
                            onClick={handleAddLookupAsDefender}
                          >
                            + Add as Defender
                          </button>
                        </div>
                      )}
                    </div>
                    {preview && (
                      <div className="stack mt8">
                        <div className="rowBetween">
                          <strong>{preview.displayName}</strong>
                          <span className="badge">Lv {preview.level}</span>
                        </div>
                        {preview.battleStats && (
                          <div className="formGrid tight">
                            {Object.entries(preview.battleStats).map(
                              ([k, v]) => (
                                <div key={k} className="preview-stat">
                                  <span>{k}</span>
                                  <strong>{v}</strong>
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {preview.moves.length > 0 && (
                          <div className="boss-moves">
                            {preview.moves.map((m) => (
                              <span key={m} className="move-tag">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {defMode === "manual" && (
              <div>
                <div className="muted small mt8">
                  Enter defender stats manually or paste from Pokémon Showdown.
                </div>
                <div className="formGrid tight" style={{ marginTop: 8 }}>
                  {[
                    ["HP", 45],
                    ["Atk", 30],
                    ["Def", 35],
                    ["SpA", 35],
                    ["SpD", 30],
                    ["Spe", 25],
                  ].map(([lbl, def]) => (
                    <label key={lbl}>
                      {lbl}
                      <input defaultValue={def} type="number" />
                    </label>
                  ))}
                </div>
                <div className="muted small mt8">
                  💡 Paste stats from Pokémon Showdown or enter manually.
                </div>
              </div>
            )}
          </details>
        </div>

        {/* ── Right: results + type chart ── */}
        <div className="col">
          <details open className="panel">
            <summary>Results</summary>
            <div className="results-block">
              <div className="result-main">{resultMain}</div>
              <div className="muted">damage range (rolled min–max)</div>
            </div>
            <div className="stack mt8">
              <div className="statRow">
                <span>% of HP</span>
                <strong>
                  {damageResult && defenderHp
                    ? `${((damageResult.min / defenderHp) * 100).toFixed(1)}% – ${((damageResult.max / defenderHp) * 100).toFixed(1)}%`
                    : "—"}
                </strong>
              </div>
              <div className="statRow">
                <span>KO Estimate</span>
                <strong>—</strong>
              </div>
              <div className="statRow">
                <span>Crit Damage</span>
                <strong>—</strong>
              </div>
            </div>
          </details>

          <details open className="panel">
            <summary>Type Chart Reference</summary>
            <div className="type-chart-mini">
              <div className="muted small">
                Quick lookup — Fighting vs common types
              </div>
              {[
                ["normal", "2×"],
                ["rock", "2×"],
                ["ice", "2×"],
                ["psychic", "0.5×"],
                ["flying", "0.5×"],
                ["ghost", "0×"],
              ].map(([t, eff]) => (
                <div key={t} className="type-matchup">
                  <span className={`type-chip type-${t}`}>{capitalize(t)}</span>
                  <strong>{eff}</strong>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
