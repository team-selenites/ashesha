// Example targets. Coordinates come from the data pipeline (Elisabetta) and are
// filled in there. Only WISE 0855 is confirmed here, from the challenge brief.
// Do not add coordinates by hand without checking them against the data.
// When a target's prepared file exists, add data: "data/<id>.json" and the viewer loads it.
var SELENITES_EXAMPLES = [
  { id: "3I-ATLAS", name: "Comet 3I/ATLAS", note: "Headline example: August and December 2025", ra: null, dec: null, data: "data/3i_atlas.json",
    position_source: "from orbit calculations (JPL Horizons)" },
  { id: "barnards-star", name: "Barnard's Star", note: "Fast-moving nearby star", ra: null, dec: null, data: "data/barnards_star.json",
    position_source: "from its catalogue position and proper motion" },
  { id: "epsilon-indi-b", name: "Epsilon Indi B", note: "Pair of brown dwarfs around a star", ra: null, dec: null, data: "data/epsilon_indi_b.json",
    position_source: "from its catalogue position and proper motion" },
  { id: "wise-0855", name: "WISE 0855", note: "Fast-moving brown dwarf", ra: "08:55:10.831", dec: "-07:14:42.53", data: "data/wise0855.json",
    position_source: "from its catalogue position and proper motion" },
  { id: "rw-aur", name: "RW Aurigae", note: "Variable star: brightness changes", ra: null, dec: null, data: "data/rw_aur.json",
    position_source: "from its catalogue position and proper motion" },
  { id: "r-dra", name: "R Draconis", note: "Variable star: brightness changes", ra: null, dec: null, data: "data/r_dra.json",
    position_source: "from its catalogue position and proper motion" }
];
