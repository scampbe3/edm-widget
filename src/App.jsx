import { useState, useEffect, useMemo } from "react";
import { RadioBrowserApi } from "radio-browser-api";   // ← named import
import Player from "./components/Player";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";

/* ------------------------------------------------------------------ */
/* 1.  INITIALISE THE API CLIENT                                      */
/* ------------------------------------------------------------------ */
const api = new RadioBrowserApi("edm-widget"); // optional user-agent string

/* ------------------------------------------------------------------ */
/*  Tiny floating panel for favourites                               */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Floating favourites panel                                         */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Floating favourites panel                                         */
/* ------------------------------------------------------------------ */
function FavoritesPanel({
  favStations,
  current,
  setCurrent,
  toggleFav,
  favs,
  open,
  onClose,
}) {
  if (!open || !favStations.length) return null;

  return (
    <div
      className="fixed top-0 right-1
                 w-[33vw] sm:w-72 md:w-64
                 max-h-[33vh] bg-gray-900/90 backdrop-blur-xl
                 rounded-lg shadow-lg p-0 text-sm z-50 overflow-hidden
                 flex flex-col"
    >
      {/* ── panel header stays visible during scroll ── */}
      <div className="sticky top-0 flex items-center justify-between
                      px-3 py-2 bg-gray-900/90 backdrop-blur-xl z-10">
        <h2 className="text-gray-200 font-semibold">★ Favorites</h2>

        {/* mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-gray-200"
          aria-label="Close favourites"
        >
          ×
        </button>
      </div>

      {/* ── scrollable list ── */}
      <div className="overflow-auto px-3 pb-3 space-y-2">
        {favStations.map(st => {
          const active = st.stationuuid === current?.stationuuid;
          return (
            <div
              key={st.stationuuid}
              onClick={() => setCurrent(st)}
              className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer
                ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
            >
              <span className="truncate">{st.name}</span>

              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleFav(st.stationuuid);
                }}
                className={`ml-2 ${
                  favs.includes(st.stationuuid)
                    ? "text-yellow-300"
                    : "text-gray-400"
                }`}
              >
                ★
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}




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
// mobile-panel toggle + viewport tracker
const [showFav , setShowFav ] = useState(false);
const [desktop , setDesktop ] = useState(window.innerWidth >= 768);

useEffect(() => {
  const onResize = () => setDesktop(window.innerWidth >= 768);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);


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
    return <p className="p-6">Radio is loading...</p>;
  }

  if (!current) return <p className="p-6">Loading stations…</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
{/* ────────────────── HEADER BAR (sticky) ────────────────── */}
<header
  className="sticky top-0 z-10
             bg-gray-900/80 backdrop-blur-md
             p-4 pb-6 mb-6 rounded-b-lg space-y-4"
>
  <h1 className="text-3xl font-bold">EDM Radio Demo</h1>

  {/* Search */}
  <input
    placeholder="Search stations…"
    value={query}
    onChange={e => setQuery(e.target.value)}
    className="w-full p-2 border rounded"
  />

  {/* Play / Pause */}
  <div className="flex md:justify-start">
    <Player streamUrl={current.url_resolved} />
  </div>

  {/* ★ favourites toggle – shares header stacking-context */}
  <button
    onClick={() => setShowFav(!showFav)}
    className="absolute top-0 right-4 md:hidden p-2 rounded-full shadow
               bg-gray-800 text-yellow-300"
    title="Favorites"
  >
    ★
  </button>

</header>



      {/* Station list */}
{/* ---------- FAVOURITES (if any) ---------- */}


{/* ---------- MAIN LIST (search-filtered) ---------- */}
<ul className="space-y-2">
  <AnimatePresence initial={false}>
    {list.map(st => {
      const active = st.stationuuid === current.stationuuid;
      return (
        <motion.li
          key={st.stationuuid}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className={`relative flex items-center justify-between p-3 rounded shadow
            ${
              active
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-200 hover:bg-gray-700"
            }`}
        >
          {active && (
            <span className="absolute left-0 top-0 h-full w-1 bg-yellow-300 rounded-l" />
          )}
          <button
            onClick={() => setCurrent(st)}
            className="text-left grow min-w-0"
          >
            <span className="font-medium block truncate">{st.name}</span>
            <span className="block text-sm opacity-80 truncate">
              {st.tags} · {st.country}
            </span>
          </button>
          <button
            onClick={() => toggleFav(st.stationuuid)}
            className={`ml-4 text-xl ${
              favs.includes(st.stationuuid)
                ? active
                  ? "text-yellow-300"
                  : "text-yellow-400"
                : "text-gray-400"
            }`}
          >
            {favs.includes(st.stationuuid) ? "★" : "☆"}
          </button>
        </motion.li>
      );
    })}
  </AnimatePresence>
</ul>

{/* mobile toggle ★ – always on top */}


<FavoritesPanel
  favStations={favStations}
  current={current}
  setCurrent={setCurrent}
  toggleFav={toggleFav}
  favs={favs}
  open={desktop || showFav}              /* open by default on ≥768 px */
  onClose={() => setShowFav(false)}      /* close handler for × */
/>







      {/* Audio player */}
    </div>
  );

}
