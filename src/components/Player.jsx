import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

function isHls(url) {
  return /\.m3u8($|\?)/i.test(url);
}

export default function Player({ streamUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setPlaying] = useState(false);

  /* load / reload when streamUrl changes */
  useEffect(() => {
    if (!audioRef.current || !streamUrl) return;

    let hls; // will hold an Hls.js instance if we create one

    // Cleanup any previous Hls.js instance before loading new source
    const cleanup = () => hls && hls.destroy();

    cleanup(); // in case an old one is still attached

    if (isHls(streamUrl) && Hls.isSupported()) {
      // Use Hls.js for adaptive streams on browsers that need it
      hls = new Hls({ enableWorker: false }); // worker off = fewer Edge issues
      hls.loadSource(streamUrl);
      hls.attachMedia(audioRef.current);
    } else {
      // Direct MP3/AAC/OGG stream
      audioRef.current.src = streamUrl;
    }

    /* 🔊 AUTOPLAY right after source loads */
    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(err => {
        // Autoplay may be blocked until the user interacts with the page
        console.warn("Autoplay blocked:", err);
        setPlaying(false);
      });

    // Tidy up on component unmount or when streamUrl changes
    return cleanup;
  }, [streamUrl]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 mt-6">
      <button
        onClick={toggle}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
    </div>
  );
}
