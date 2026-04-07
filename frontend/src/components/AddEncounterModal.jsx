import { useState, useRef } from "react";
import { API_BASE, HOENN_LOCATIONS } from "../data/constants";
import { capitalize } from "../utils/helpers";

export default function AddEncounterModal({ onClose, onAdd }) {
  const [locSearch, setLocSearch] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);

  const [pokeSearch, setPokeSearch] = useState("");
  const [pokeResults, setPokeResults] = useState([]);
  const [pokeLoading, setPokeLoading] = useState(false);
  const [pokeOpen, setPokeOpen] = useState(false);
  const [selectedPoke, setSelectedPoke] = useState(null);
  const debounceRef = useRef(null);

  const [outcome, setOutcome] = useState("Caught");

  const filteredLocs = HOENN_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locSearch.toLowerCase())
  );

  function handleLocSelect(loc) {
    setSelectedLoc(loc);
    setLocSearch(loc);
    setLocOpen(false);
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
  }

  function handleSave() {
    if (!selectedLoc || !selectedPoke) return;
    onAdd({
      location: selectedLoc,
      pokemon: capitalize(selectedPoke.name),
      pokemon_id: selectedPoke.id,
      nickname: capitalize(selectedPoke.name),
      ability: selectedPoke.ability1 || null,
      outcome,
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
                {!pokeLoading && pokeResults.slice(0, 80).map((p) => {
                  const types = [p.type1, p.type2].filter(Boolean);
                  return (
                    <div key={p.id} className="dropdown-item" onMouseDown={() => handlePokeSelect(p)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="muted small">#{String(p.id).padStart(3, "0")}</span>
                        <strong>{capitalize(p.name)}</strong>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {types.map((t) => (
                          <span key={t} className={`type-chip type-${t}`}>{capitalize(t)}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </label>

        {/* 3. Outcome */}
        <label style={{ opacity: selectedPoke ? 1 : 0.5 }}>
          3. Encounter Outcome
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={{ marginTop: 5 }} disabled={!selectedPoke}>
            <option>Caught</option>
            <option>Missed</option>
            <option>Fainted</option>
            <option>Fled</option>
          </select>
        </label>

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
