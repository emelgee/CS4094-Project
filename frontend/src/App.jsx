import { useState, useEffect } from "react";
import AddEncounterModal from "./components/AddEncounterModal";
import AddPokemonModal from "./components/AddPokemonModal";
import GenScreen from "./screens/GenScreen";
import DashboardScreen from "./screens/DashboardScreen";
import TeamScreen from "./screens/TeamScreen";
import EncountersScreen from "./screens/EncountersScreen";
import CalculatorScreen from "./screens/CalculatorScreen";
import IvEvScreen from "./screens/IvEvScreen";
import TrainerScreen from "./screens/TrainerScreen";
import BossScreen from "./screens/BossScreen";
import LookupScreen from "./screens/LookupScreen";
import AuthScreen from "./screens/AuthScreen";
import { useAuth } from "./auth/AuthContext";
import { apiFetch } from "./utils/api";

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
  const { user, status, logout } = useAuth();

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
      const res = await apiFetch("/api/team");
      if (!res.ok) return;
      const data = await res.json();
      const mapped = data.map((row) => ({
        id: row.id,
        pokemonId: row.pokemon_id,
        name: row.name.charAt(0).toUpperCase() + row.name.slice(1),
        nickname: row.nickname,
        level: row.level,
        nature: row.nature.charAt(0).toUpperCase() + row.nature.slice(1),
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
        ivs: {
          hp: row.hp_iv ?? 31,
          atk: row.attack_iv ?? 31,
          def: row.defense_iv ?? 31,
          spa: row.sp_attack_iv ?? 31,
          spd: row.sp_defense_iv ?? 31,
          spe: row.speed_iv ?? 31,
        },
        evs: {
          hp: row.hp_ev ?? 0,
          atk: row.attack_ev ?? 0,
          def: row.defense_ev ?? 0,
          spa: row.sp_attack_ev ?? 0,
          spd: row.sp_defense_ev ?? 0,
          spe: row.speed_ev ?? 0,
        },
        moves: [
          row.move1 || "",
          row.move2 || "",
          row.move3 || "",
          row.move4 || "",
        ],
        slot: row.team_slot,
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
    if (status !== "authenticated") return;
    fetchTeam();
  }, [status]);

  const handleSendToBox = async (id) => {
    if (party.length <= 1) {
      alert("You need at least 1 Pokémon in your party!");
      return;
    }
    try {
      await apiFetch(`/api/team/${id}/slot`, {
        method: "PATCH",
        json: { team_slot: null },
      });
      await fetchTeam();
    } catch (err) {
      console.error("Send to box failed:", err);
    }
  };

  const handleWithdraw = async (id) => {
    if (party.length >= 6) {
      alert("Party is full (6/6)! Move someone to PC Box first.");
      return;
    }
    try {
      const usedSlots = party.map((m) => m.slot);
      const slot = [1, 2, 3, 4, 5, 6].find((s) => !usedSlots.includes(s));
      await apiFetch(`/api/team/${id}/slot`, {
        method: "PATCH",
        json: { team_slot: slot },
      });
      await fetchTeam();
    } catch (err) {
      console.error("Withdraw failed:", err);
    }
  };

  // ── Encounters ──────────────────────────────────────────────────────
  const [encounters, setEncounters] = useState([]);

  const fetchEncounters = async () => {
    try {
      const res = await apiFetch("/api/encounters");
      if (!res.ok) return;
      const data = await res.json();
      setEncounters(data);
    } catch (err) {
      console.error("Failed to fetch encounters:", err);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchEncounters();
  }, [status]);

  const handleDeleteEncounter = async (id) => {
    if (!window.confirm("Release this Pokémon? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/encounters/${id}`, { method: "DELETE" });
      await fetchEncounters();
      await fetchTeam();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpdateEncounter = async (updatedEnc) => {
    try {
      await apiFetch(`/api/encounters/${updatedEnc.id}`, {
        method: "PATCH",
        json: {
          location: updatedEnc.location,
          nickname: updatedEnc.nickname,
          status: updatedEnc.outcome?.toLowerCase(),
        },
      });
      fetchEncounters();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // ── Modals ───────────────────────────────────────────────────────────
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showAddPokemonModal, setShowAddPokemonModal] = useState(false);

  const handleAddPokemonToTeam = async (mon) => {
    try {
      const usedSlots = party.map((m) => m.slot).filter((s) => s != null);
      const nextSlot = [1, 2, 3, 4, 5, 6].find((s) => !usedSlots.includes(s));

      const res = await apiFetch("/api/team", {
        method: "POST",
        json: {
          pokemon_id: mon?.dbData?.id,
          nickname: null,
          level: Number(mon?.level) || 5,
          nature: "hardy",
          ability_id: null,
          team_slot: nextSlot ?? null,
          location_id: null,
        },
      });

      if (!res.ok) throw new Error("Failed to add Pokemon to team");

      await fetchTeam();
      setShowAddPokemonModal(false);
    } catch (err) {
      console.error("Add Pokemon failed:", err);
    }
  };

  const handleAddEncounter = async (enc) => {
    try {
      const res = await apiFetch("/api/encounters", {
        method: "POST",
        json: {
          pokemon_id: enc.pokemon_id,
          location: enc.location,
          nickname: enc.nickname,
          ability: enc.ability,
          nature: "serious",
          level: 50,
          hp_iv: 31, attack_iv: 31, defense_iv: 31,
          sp_attack_iv: 31, sp_defense_iv: 31, speed_iv: 31,
          hp_ev: 0, attack_ev: 0, defense_ev: 0,
          sp_attack_ev: 0, sp_defense_ev: 0, speed_ev: 0,
          move1_id: null, move2_id: null, move3_id: null, move4_id: null,
          item_id: null,
          status: enc.outcome?.toLowerCase() || "caught",
        },
      });
      if (!res.ok) throw new Error("Failed to create encounter");

      // Auto-assign to team if there's a free slot
      const newEncounter = await res.json();
      if (party.length < 6) {
        const usedSlots = party.map((m) => m.slot);
        const slot = [1, 2, 3, 4, 5, 6].find((s) => !usedSlots.includes(s));
        await apiFetch(`/api/team/${newEncounter.id}/slot`, {
          method: "PATCH",
          json: { team_slot: slot },
        });
      }

      await fetchEncounters();
      await fetchTeam();
      setShowEncounterModal(false);
    } catch (err) {
      console.error("Add encounter failed:", err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="auth-shell">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <AuthScreen />;
  }

  return (
    <>
      {showEncounterModal && (
        <AddEncounterModal
          onClose={() => setShowEncounterModal(false)}
          onAdd={handleAddEncounter}
        />
      )}
      {showAddPokemonModal && (
        <AddPokemonModal
          onClose={() => setShowAddPokemonModal(false)}
          onAdd={handleAddPokemonToTeam}
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
        <div className="user-menu">
          <span className="user-name">{user?.username}</span>
          <button className="ghost small" onClick={logout} title="Sign out">
            Logout
          </button>
        </div>
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
              onOpenAdd={() => setShowAddPokemonModal(true)}
            />
          )}
          {screen === "team" && (
            <TeamScreen
              party={party}
              pcBox={pcBox}
              onSendToBox={handleSendToBox}
              onWithdraw={handleWithdraw}
              onNavigate={navigate}
              onOpenAdd={() => setShowAddPokemonModal(true)}
              onRemove={handleDeleteEncounter}
              onRelease={handleDeleteEncounter}
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
          <div style={{ display: screen === "calculator" ? "" : "none" }}>
            <CalculatorScreen
              onNavigate={navigate}
              encounters={encounters}
              party={party}
              onRefreshEncounters={fetchEncounters}
              visible={screen === "calculator"}
            />
          </div>
          {screen === "ivev" && <IvEvScreen />}
          {screen === "trainer" && <TrainerScreen />}
          {screen === "boss" && <BossScreen onNavigate={navigate} />}
          {screen === "lookup" && <LookupScreen onNavigate={navigate} />}
        </main>
      </div>
    </>
  );
}