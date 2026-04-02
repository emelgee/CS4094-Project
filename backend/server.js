const express = require("express");
const cors = require("cors");

const pokemonRoutes = require("./api/pokemon");
const encounterRoutes = require("./api/encounter");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use("/api/pokemon", pokemonRoutes);
app.use("/api/encounters", encounterRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
