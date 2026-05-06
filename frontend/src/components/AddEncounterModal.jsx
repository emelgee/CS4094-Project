import { useState, useRef, useEffect } from "react";
import { API_BASE, HOENN_LOCATIONS } from "../data/constants";
import { capitalize } from "../utils/helpers";

const NATURES = [
  "hardy","lonely","brave","adamant","naughty",
  "bold","docile","relaxed","impish","lax",
  "timid","hasty","serious","jolly","naive",
  "modest","mild","quiet","bashful","rash",
  "calm","gentle","sassy","careful","quirky",
];

export default function AddEncounterModal({ onClose, onAdd }) {
  const [locSearch, setLocSearch] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [selectedLocId, setSelectedLocId] = useState(null);
  const [locations, setLocations] = useState([]);

  const [pokeSearch, setPokeSearch] = useState("");
  const [pokeResults, setPokeResults] = useState([]);
  const [pokeLoading, setPokeLoading] = useState(false);
  const [pokeOpen, setPokeOpen] = useState(false);
  const [selectedPoke, setSelectedPoke] = useState(null);
  const debounceRef = useRef(null);

  const [outcome, setOutcome] = useState("Caught");
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState(5);
  const [nature, setNature] = useState("serious");
  const [abilityId, setAbilityId] = useState(null);
  const [pokeMoves, setPokeMoves] = useState([]);
  const [moves, setMoves] = useState([null, null, null, null]);

  useEffect(() => {
    fetch(`${API_BASE}/api/locations`)
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filteredLocs = HOENN_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locSearch.toLowerCase())
  );

  function handleLocSelect(loc) {
    setSelectedLoc(loc);
    setLocSearch(loc);
    setLocOpen(false);
    const found = locations.find((r) => r.name === loc);
    setSelectedLocId(found ? found.id : null);
  }

  async function fetchPokemon(q) {
    setPokeLoading(true);
    try {
      const url = q.trim()
        ? `${API_BASE}/api/pokemon?search=${encodeURIComponent(q.trim())}`
        : `${API_BASE}/api/pokemon`;
      const res = await fetch(url);
      const data = await res.json();
      setPokeResults(Array.isArray(data) ? data : []);
    } catch {
      setPokeResults([]);
    } finally {
      setPokeLoading(false);
    }
  }

  async function fetchMovesForPoke(pokemon_id, atLevel) {
    try {
      const res = await fetch(`${API_BASE}/api/pokemon/${pokemon_id}/moves`);
      const data = await res.json();
      const levelUp = data
        .filter((m) => m.learn_method === "level-up")
        .sort((a, b) => a.level - b.level);
      setPokeMoves(levelUp);
      autoPopulateMoves(levelUp, atLevel);
    } catch {
      setPokeMoves([]);
    }
  }

  function autoPopulateMoves(moveList, atLevel) {
    const eligible = moveList.filter((m) => m.level <= (atLevel || 100));
    const last4 = eligible.slice(-4);
    setMoves([
      last4[0] ? { id: last4[0].move_id, name: last4[0].move_name } : null,
      last4[1] ? { id: last4[1].move_id, name: last4[1].move_name } : null,
      last4[2] ? { id: last4[2].move_id, name: last4[2].move_name } : null,
      last4[3] ? { id: last4[3].move_id, name: last4[3].move_name } : null,
    ]);
  }

  function handlePokeSearchChange(e) {
    const val = e.target.value;
    setPokeSearch(val);
    setSelectedPoke(null);
    setPokeOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPokemon(val), 250);
  }

  function handlePokeSelect(poke) {
    setSelectedPoke(poke);
    setPokeSearch(capitalize(poke.name));
    setPokeOpen(false);
    setNickname(capitalize(poke.name));
    setAbilityId(poke.ability1_id || null);
    fetchMovesForPoke(poke.id, level);
  }

  function handleLevelChange(val) {
    const lv = parseInt(val) || 1;
    setLevel(lv);
    if (pokeMoves.length > 0) autoPopulateMoves(pokeMoves, lv);
  }

  const abilityOptions = selectedPoke
    ? [
        selectedPoke.ability1_id ? { id: selectedPoke.ability1_id, name: selectedPoke.ability1 } : null,
        selectedPoke.ability2_id ? { id: selectedPoke.ability2_id, name: selectedPoke.ability2 } : null,
        selectedPoke.ability_hidden_id ? { id: selectedPoke.ability_hidden_id, name: selectedPoke.ability_hidden } : null,
      ].filter(Boolean)
    : [];

  function handleSave() {
    if (!selectedLoc || !selectedPoke) return;
    onAdd({
      location: selectedLoc,
      location_id: selectedLocId,
      pokemon: capitalize(selectedPoke.name),
      pokemon_id: selectedPoke.id,
      nickname: nickname || capitalize(selectedPoke.name),
      ability_id: abilityId,
      outcome,
      level: Number(level) || 5,
      nature,
      move1_id: moves[0]?.id || null,
      move2_id: moves[1]?.id || null,
      move3_id: moves[2]?.id || null,
      move4_id: moves[3]?.id || null,
    });
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="rowBetween">
          <h2>Log Encounter</h2>
          <button className="ghost small" onClick={onClose}>✕</button>
        </div>

        {/* 1. Location */}
        <label>
          1. Choose Location
          <div className="search-wrap" style={{ marginTop: 5 }}>
            <input
              className="search-input"
              placeholder="e.g. Route 101, Petalburg Woods..."
              value={locSearch}
              onChange={(e) => { setLocSearch(e.target.value); setLocOpen(true); }}
              onFocus={() => setLocOpen(true)}
              onBlur={() => setTimeout(() => setLocOpen(false), 150)}
            />
            {locOpen && (
              <div className="dropdown">
                {filteredLocs.length === 0
                  ? <div className="dropdown-empty">No locations found</div>
                  : filteredLocs.map((loc) => (
                      <div key={loc} className="dropdown-item" onMouseDown={() => handleLocSelect(loc)}>
                        {loc}
                      </div>
                    ))}
              </div>
            )}
          </div>
        </label>

        {/* 2. Pokemon */}
        <label style={{ opacity: selectedLoc ? 1 : 0.5 }}>
          2. Choose Pokémon Encountered
          <div className="search-wrap" style={{ marginTop: 5 }}>
            <input
              className="search-input"
              placeholder="e.g. Zigzagoon, Ralts..."
              value={pokeSearch}
              onChange={handlePokeSearchChange}
              onFocus={() => { setPokeOpen(true); fetchPokemon(pokeSearch); }}
              onBlur={() => setTimeout(() => setPokeOpen(false), 150)}
              disabled={!selectedLoc}
            />
            {pokeOpen && selectedLoc && (
              <div className="dropdown">
                {pokeLoading && <div className="dropdown-empty">Loading…</div>}
                {!pokeLoading && pokeResults.length === 0 && <div className="dropdown-empty">No Pokémon found</div>}
                {!pokeLoading && pokeResults.slice(0, 80).map((p) => (
                  <div key={p.id} className="dropdown-item" onMouseDown={() => handlePokeSelect(p)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="muted small">#{String(p.id).padStart(3, "0")}</span>
                      <strong>{capitalize(p.name)}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[p.type1, p.type2].filter(Boolean).map((t) => (
                        <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </label>

        {/* 3. Details (shown after pokemon selected) */}
        {selectedPoke && (
          <>
            <div className="formGrid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label htmlFor="add-nickname">Nickname</label>
                <input id="add-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>
              <div>
                <label htmlFor="add-level">Level</label>
                <input id="add-level" type="number" min="1" max="100" value={level} onChange={(e) => handleLevelChange(e.target.value)} />
              </div>
              <div>
                <label htmlFor="add-nature">Nature</label>
                <select id="add-nature" value={nature} onChange={(e) => setNature(e.target.value)}>
                  {NATURES.map((n) => <option key={n} value={n}>{capitalize(n)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="add-ability">Ability</label>
                <select id="add-ability" value={abilityId || ""} onChange={(e) => setAbilityId(Number(e.target.value) || null)}>
                  <option value="">— None —</option>
                  {abilityOptions.map((a) => (
                    <option key={a.id} value={a.id}>{capitalize(a.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-outcome">Outcome</label>
                <select id="add-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option>Caught</option>
                  <option>Missed</option>
                  <option>Fainted</option>
                  <option>Fled</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#7a82a0", marginBottom: 4 }}>Starting Moves</div>
              <div className="formGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {moves.map((mv, i) => (
                  <div key={i}>
                    <label htmlFor={`add-move-${i}`}>Move {i + 1}</label>
                    <select
                      id={`add-move-${i}`}
                      value={mv?.id || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value) || null;
                        const found = pokeMoves.find((m) => m.move_id === id);
                        const next = [...moves];
                        next[i] = id ? { id, name: found?.move_name || "" } : null;
                        setMoves(next);
                      }}
                    >
                      <option value="">— None —</option>
                      {pokeMoves.map((m) => (
                        <option key={m.move_id} value={m.move_id}>{capitalize(m.move_name)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="modal-actions" style={{ marginTop: 10 }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={!selectedLoc || !selectedPoke}
            onClick={handleSave}
            style={{ opacity: selectedLoc && selectedPoke ? 1 : 0.4, cursor: selectedLoc && selectedPoke ? "pointer" : "default" }}
          >
            Save Encounter
          </button>
        </div>
      </div>
    </div>
  );
}
