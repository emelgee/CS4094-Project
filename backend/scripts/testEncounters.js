const { runDirectInsert } = require("./encounters");
runDirectInsert(1, 2, "pallet-town", null, null, null, null)
  .then(() => console.log("success, added pokemon 1"))
  .catch((e) => console.error(e.message));

runDirectInsert(1, 184, "pallet-town", "Tear", "Huge Power", "Adamant", "Paralyzed")
  .then(() => console.log("success"))
  .catch((e) => console.error(e.message));