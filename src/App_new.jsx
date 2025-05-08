import { useState, useEffect, useMemo } from "react";
import { RadioBrowserApi } from "radio-browser-api";   // ← named import
import Player from "./components/Player";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";

/* ------------------------------------------------------------------ */
/* 1.  INITIALISE THE API CLIENT                                      */
/* ------------------------------------------------------------------ */
const api = new RadioBrowserApi("edm-widget"); // optional user-agent string

export default function App() {
  /* -------------------------------------------------------------- */
  /* 2.  REACT STATE                                                */
  /* -------------------------------------------------------------- */
  const [stations, setStations] = useState([]);
  const [query, setQuery]       = useState("");
  const [current, setCurrent]   = useState(null);
  const [favs, setFavs] = useState(
    () => JSON.parse(localStorage.getItem("favs") || "[]")
  );

/* 3. FETCH STATIONS ONCE ON MOUNT --------------------------------- */
useEffect(() => {
  const tags = ["edm", "house", "trance", "dance"];
  const mirror = "https://de1.api.radio-browser.info";

  Promise.all(
    tags.map(tag =>
      fetch(
        `${mirror}/json/stations/bytag/${tag}?hidebroken=true&order=clickcount&reverse=true&limit=40`
      ).then(r => r.json())
    )
  )
    .then(arrays => {
      // merge + dedupe by stationuuid
      const merged = Object.values(
        arrays.flat().reduce((acc, s) => {
          acc[s.stationuuid] = s;
          return acc;
        }, {})
      );

      const clean = merged.filter(s => {
        const url = s.url_resolved;
        return url && url.startsWith("http") && /\.(m3u8|mp3|aac|ogg|pls|m3u)$/i.test(url);
      });

      if (!clean.length) throw new Error("No valid streams");
      setStations(clean);
      setCurrent(clean[0]);
    })
    .catch(err => {
      console.error(err);
      setStations([]);
    });
}, []);



  /* -------------------------------------------------------------- */
  /* 4.  PERSIST FAVOURITES LOCALLY                                 */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    localStorage.setItem("favs", JSON.stringify(favs));
  }, [favs]);

  /* -------------------------------------------------------------- */
  /* 5.  FUZZY SEARCH + FILTER                                      */
  /* -------------------------------------------------------------- */
  const fuse = useMemo(
    () => new Fuse(stations, { keys: ["name", "tags", "country"] }),
    [stations]
  );

  const list = useMemo(
    () => (query ? fuse.search(query).map(r => r.item) : stations),
    [query, stations, fuse]
  );

  const favStations = useMemo(
    () => stations.filter(s => favs.includes(s.stationuuid)),
    [stations, favs]
  );

  const toggleFav = id =>
    setFavs(f => (f.includes(id) ? f.filter(x => x !== id) : [...f, id]));

  /* -------------------------------------------------------------- */
  /* 6.  RENDER                                                     */
  /* -------------------------------------------------------------- */
  if (!current && !stations.length) {
    return <p className="p-6">No stations found. Try again later.</p>;
  }

  if (!current) return <p className="p-6">Loading stations…</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">EDM Radio Demo</h1>

      {/* Search box */}
      <input
        placeholder="Search stations…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />

      {/* Station list */}
      <ul className="space-y-2">
        <AnimatePresence>
        {list.map(st => {
  const active = st.stationuuid === current.stationuuid;
  return (
    <motion.li
      key={st.stationuuid}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      /* --------------------------- NEW CLASSES --------------------------- */
      className={`relative flex items-center justify-between p-3 rounded shadow
        ${
          active
            ? "bg-indigo-600 text-white"          /* selected row */
            : "bg-gray-800 text-gray-200 hover:bg-gray-700" /* idle + hover */
          }`}
    >
      {/* thin accent bar for the station that’s playing */}
      {active && (
        <span className="absolute left-0 top-0 h-full w-1 bg-yellow-300 rounded-l"></span>
      )}

      {/* station button */}
      <button
        onClick={() => setCurrent(st)}
        className="text-left grow min-w-0"
      >
        <span className="font-medium block truncate">{st.name}</span>
        <span className="block text-sm text-gray-500 truncate">
          {st.tags} · {st.country}
        </span>
      </button>

      {/* favourite star */}
      <button
        onClick={() => toggleFav(st.stationuuid)}
        className={`ml-4 text-xl ${
          favs.includes(st.stationuuid)
            ? active
              ? "text-yellow-300"
              : "text-yellow-400"
            : active
            ? "text-white opacity-80"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        {favs.includes(st.stationuuid) ? "★" : "☆"}
      </button>
    </motion.li>
  );
})}

        </AnimatePresence>
      </ul>

      {/* Audio player */}
      <Player streamUrl={current.url_resolved} />
    </div>
  );

}
