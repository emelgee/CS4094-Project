import { useState, useEffect } from "react";
import AddPokemonModal from "./components/AddPokemonModal";
import AddEncounterModal from "./components/AddEncounterModal";
import GenScreen from "./screens/GenScreen";
import DashboardScreen from "./screens/DashboardScreen";
import TeamScreen from "./screens/TeamScreen";
import EncountersScreen from "./screens/EncountersScreen";
import CalculatorScreen from "./screens/CalculatorScreen";
import IvEvScreen from "./screens/IvEvScreen";
import TrainerScreen from "./screens/TrainerScreen";
import BossScreen from "./screens/BossScreen";
import LookupScreen from "./screens/LookupScreen";

const NAV_ITEMS = [
  { key: "gen", label: "Generation" },
  { key: "dashboard", label: "Dashboard" },
  { key: "team", label: "Team" },
  { key: "encounters", label: "Encounters" },
  { key: "calculator", label: "Calculator" },
  { key: "ivev", label: "IV / EV" },
  { key: "trainer", label: "Trainer" },
  { key: "boss", label: "Boss Data" },
  { key: "lookup", label: "Lookup" },
];

export default function App() {
  // ── Navigation ──────────────────────────────────────────────────────
  const [screen, setScreen] = useState("gen");
  const [genBadge, setGenBadge] = useState("—");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = (s) => setScreen(s);

  const handleSelectGen = (n) => {
    setGenBadge(n);
    setScreen("dashboard");
  };

  // ── Party / PC Box ──────────────────────────────────────────────────
  const [party, setParty] = useState([]);
  const [pcBox, setPcBox] = useState([]);

  const fetchTeam = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/team/1");
      const data = await res.json();
      const mapped = data.map((row) => ({
        id: row.id,
        pokemonId: row.pokemon_id,
        name: row.name.charAt(0).toUpperCase() + row.name.slice(1),
        nickname: row.nickname,
        level: row.level,
        nature: row.nature,
        ability: row.ability,
        types: [row.type1, row.type2]
          .filter(Boolean)
          .map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
        primaryType: row.type1,
        stats: {
          hp: row.hp,
          atk: row.attack,
          def: row.defense,
          spa: row.sp_attack,
          spd: row.sp_defense,
          spe: row.speed,
        },
        moves: [
          row.move1 || "",
          row.move2 || "",
          row.move3 || "",
          row.move4 || "",
        ],
        slot: row.slot,
        dbData: {
          ability1: row.ability1,
          ability2: row.ability2,
          ability_hidden: row.ability_hidden,
        },
      }));
      setParty(mapped.filter((m) => m.slot !== null));
      setPcBox(mapped.filter((m) => m.slot === null));
    } catch (err) {
      console.error("Failed to fetch team:", err);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddPokemon = async (mon) => {
    if (party.length >= 6) {
      alert("Party is full (6/6)! Send a Pokémon to PC Box first.");
      return;
    }
    try {
      // assign the next available slot
      const usedSlots = party.map((m) => m.slot);
      const slot = [0, 1, 2, 3, 4, 5].find((s) => !usedSlots.includes(s));
      await fetch("http://localhost:5000/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          pokemon_id: mon.dbData.id,
          nickname: mon.name,
          level: mon.level,
          nature: "hardy",
          ability: mon.ability || null,
          slot,
        }),
      });
      await fetchTeam();
    } catch (err) {
      console.error("Add pokemon failed:", err);
    }
  };

  const handleSendToBox = async (id) => {
    if (party.length <= 1) {
      alert("You need at least 1 Pokémon in your party!");
      return;
    }
    try {
      await fetch(`http://localhost:5000/api/team/${id}/slot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: null }),
      });
      await fetchTeam();
    } catch (err) {
      console.error("Send to box failed:", err);
    }
  };

  const handleRemove = async (id) => {
    if (party.length <= 1) {
      alert("Party can't be empty!");
      return;
    }
    if (window.confirm("Remove this Pokémon from your team entirely?")) {
      try {
        await fetch(`http://localhost:5000/api/team/${id}`, {
          method: "DELETE",
        });
        await fetchTeam();
      } catch (err) {
        console.error("Remove failed:", err);
      }
    }
  };

  const handleWithdraw = async (id) => {
    if (party.length >= 6) {
      alert("Party is full (6/6)! Move someone to PC Box first.");
      return;
    }
    try {
      const usedSlots = party.map((m) => m.slot);
      const slot = [0, 1, 2, 3, 4, 5].find((s) => !usedSlots.includes(s));
      await fetch(`http://localhost:5000/api/team/${id}/slot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      await fetchTeam();
    } catch (err) {
      console.error("Withdraw failed:", err);
    }
  };

  const handleRelease = async (id) => {
    const mon = pcBox.find((m) => m.id === id);
    if (!mon) return;
    if (window.confirm(`Release ${mon.nickname || mon.name} permanently?`)) {
      try {
        await fetch(`http://localhost:5000/api/team/${id}`, {
          method: "DELETE",
        });
        await fetchTeam();
      } catch (err) {
        console.error("Release failed:", err);
      }
    }
  };

  // ── Encounters ──────────────────────────────────────────────────────
  const [encounters, setEncounters] = useState([]);

  const fetchEncounters = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/encounters/1");
      const data = await res.json();
      setEncounters(data);
    } catch (err) {
      console.error("Failed to fetch encounters:", err);
    }
  };

  useEffect(() => {
    fetchEncounters();
  }, []);

  const handleDeleteEncounter = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/encounters/${id}`, {
        method: "DELETE",
      });
      fetchEncounters();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpdateEncounter = async (updatedEnc) => {
    try {
      await fetch(`http://localhost:5000/api/encounters/${updatedEnc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: updatedEnc.location,
          nickname: updatedEnc.nickname,
          status: updatedEnc.outcome?.toLowerCase(),
        }),
      });
      fetchEncounters();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // ── Modals ───────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);

  const handleOpenAdd = () => {
    setScreen("team");
    setShowAddModal(true);
  };

  const handleAddEncounter = async (enc) => {
    try {
      const res = await fetch("http://localhost:5000/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: 1,
          pokemon_id: enc.pokemon_id,
          location: enc.location,
          nickname: enc.nickname,
          ability: enc.ability,
          nature: "serious",
          level: 50,
          hp_iv: 31,
          attack_iv: 31,
          defense_iv: 31,
          sp_attack_iv: 31,
          sp_defense_iv: 31,
          speed_iv: 31,
          hp_ev: 0,
          attack_ev: 0,
          defense_ev: 0,
          sp_attack_ev: 0,
          sp_defense_ev: 0,
          speed_ev: 0,
          move1_id: null,
          move2_id: null,
          move3_id: null,
          move4_id: null,
          item_id: null,
          status: enc.outcome?.toLowerCase() || "caught",
        }),
      });
      if (!res.ok) throw new Error("Failed to create encounter");
      await fetchEncounters();
      setShowEncounterModal(false);
    } catch (err) {
      console.error("Add encounter failed:", err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      {showAddModal && (
        <AddPokemonModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPokemon}
        />
      )}

      {showEncounterModal && (
        <AddEncounterModal
          onClose={() => setShowEncounterModal(false)}
          onAdd={handleAddEncounter}
        />
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">⚔</span>
          <strong>PokeChallenge</strong>
          <span className="badge">Gen {genBadge}</span>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              className={`navbtn${screen === key ? " active" : ""}`}
              onClick={() => navigate(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          className="ghost icon-btn"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          ☰
        </button>
      </header>

      <div className="shell">
        <aside className={`sidebar${sidebarOpen ? "" : " collapsed"}`}>
          <h3>Quick Actions</h3>
          <details open>
            <summary>Current Run</summary>
            <div className="stack">
              <div className="row">
                <span>Run:</span>
                <strong>Emerald Nuzlocke</strong>
              </div>
              <div className="row">
                <span>Status:</span>
                <strong className="status-active">Active</strong>
              </div>
              <div className="row">
                <span>Badges:</span>
                <strong>2 / 8</strong>
              </div>
            </div>
          </details>
          <details open>
            <summary>Shortcuts</summary>
            <div className="stack">
              {[
                ["encounters", "+ Add Encounter"],
                ["calculator", "Open Calculator"],
                ["boss", "Boss Quick Load"],
                ["lookup", "Search Pokémon"],
              ].map(([s, lbl]) => (
                <button key={s} className="btn" onClick={() => navigate(s)}>
                  {lbl}
                </button>
              ))}
            </div>
          </details>
          <details>
            <summary>Boss Quick Load</summary>
            <div className="stack">
              {[
                ["roxanne", "Roxanne (Gym 1)"],
                ["brawly", "Brawly (Gym 2)"],
                ["wattson", "Wattson (Gym 3)"],
                ["flannery", "Flannery (Gym 4)"],
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  className="btn small"
                  onClick={() => navigate("boss")}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </details>
        </aside>

        <main className="main">
          {screen === "gen" && <GenScreen onSelectGen={handleSelectGen} />}
          {screen === "dashboard" && (
            <DashboardScreen
              party={party}
              encounters={encounters}
              onNavigate={navigate}
              onOpenAdd={handleOpenAdd}
            />
          )}
          {screen === "team" && (
            <TeamScreen
              party={party}
              pcBox={pcBox}
              onSendToBox={handleSendToBox}
              onRemove={handleRemove}
              onWithdraw={handleWithdraw}
              onRelease={handleRelease}
              onOpenAdd={() => setShowAddModal(true)}
              onNavigate={navigate}
            />
          )}
          {screen === "encounters" && (
            <EncountersScreen
              onNavigate={navigate}
              onOpenAdd={() => setShowEncounterModal(true)}
              encounters={encounters}
              onDelete={handleDeleteEncounter}
              onUpdate={handleUpdateEncounter}
            />
          )}
          {screen === "calculator" && (
            <CalculatorScreen
              onNavigate={navigate}
              encounters={encounters}
              party={party}
              onRefreshEncounters={fetchEncounters}
            />
          )}
          {screen === "ivev" && <IvEvScreen />}
          {screen === "trainer" && <TrainerScreen />}
          {screen === "boss" && <BossScreen onNavigate={navigate} />}
          {screen === "lookup" && <LookupScreen onNavigate={navigate} />}
        </main>
      </div>
    </>
  );
}
