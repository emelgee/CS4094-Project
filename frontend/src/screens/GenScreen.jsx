export default function GenScreen({ onSelectGen }) {
  const gens = [
    { n: 1, label: "Red / Blue / Yellow",       supported: true },
    { n: 2, label: "Gold / Silver / Crystal",   supported: true },
    { n: 3, label: "Ruby / Sapphire / Emerald", supported: true },
    { n: 4, label: "Diamond / Pearl / Platinum", supported: false },
    { n: 5, label: "Black / White",             supported: false },
    { n: 6, label: "X / Y",                     supported: false },
  ];

  return (
    <section>
      <div className="page-header">
        <h1>Choose Generation</h1>
        <p className="muted">This affects mechanics, stats, and lookups. Gen 1–3 fully supported.</p>
      </div>
      <div className="gen-grid">
        {gens.map((g) => (
          <button
            key={g.n}
            className={`card gen ${g.supported ? "supported" : "future"}`}
            disabled={!g.supported}
            onClick={() => g.supported && onSelectGen(g.n)}
          >
            <span className="gen-num">Gen {g.n}</span>
            <span className="gen-label">{g.label}</span>
            <span className={`gen-badge ${g.supported ? "supported-badge" : "future-badge"}`}>
              {g.supported ? "✓ Supported" : "Stretch Goal"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
