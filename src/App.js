import React, { useState, useEffect } from "react";
import "./App.css";

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#00FF00",
  YELLOW: "#FFFF00",
  YELLOW_FLASH: "#FFFF00",
  WHITE: "#FFFFFF",
  CHEQUERED: null, // special case for gif
  FORM_UP: "#00BFFF", // Add a color for FORM UP (DeepSkyBlue)
};

const DEFAULT_KEYBINDS = {
  CLEAR: "F1",
  RED: "F2",
  GREEN: "F3",
  YELLOW: "F4",
  YELLOW_FLASH: "F5",
  WHITE: "F6",
  CHEQUERED: "F7",
  FORM_UP: "F8", // Add a default keybind for FORM UP
};

function hexToRgb(hex) {
  // Remove hash if present
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex([r, g, b]) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function adjustBrightness(hex, brightness) {
  if (hex === "#000000") return hex;
  const rgb = hexToRgb(hex);
  const adjusted = rgb.map((c) => Math.round((c * brightness) / 100));
  return rgbToHex(adjusted);
}

function App() {
  const [displayColor, setDisplayColor] = useState(COLORS.CLEAR);
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastAction, setLastAction] = useState("CLEAR");
  const [keybinds, setKeybinds] = useState(() => {
    const saved = localStorage.getItem("keybinds");
    return saved ? JSON.parse(saved) : DEFAULT_KEYBINDS;
  });
  const [waitingForKey, setWaitingForKey] = useState(null);
  const [brightness, setBrightness] = useState(80); // Default to 80%
  const [prevBrightness, setPrevBrightness] = useState(80); // Default to 80%
  const [showChequered, setShowChequered] = useState(false);
  const [prevShowChequered, setPrevShowChequered] = useState(false);
  const [boxWidth, setBoxWidth] = useState(40);
  const [boxHeight, setBoxHeight] = useState(80);
  const [rebindMode, setRebindMode] = useState(false);

  // Flashing effect for yellow
  useEffect(() => {
    let interval;
    if (isFlashing) {
      interval = setInterval(() => {
        setDisplayColor((prev) =>
          prev === COLORS.YELLOW ? COLORS.CLEAR : COLORS.YELLOW
        );
      }, 500);
    } else if (lastAction === "YELLOW_FLASH") {
      setDisplayColor(COLORS.YELLOW);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [isFlashing, lastAction]);

  // Listen for keydown events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (waitingForKey) {
        // Set new keybind
        const newKeybinds = {
          ...keybinds,
          [waitingForKey]: e.key.toUpperCase(),
        };
        setKeybinds(newKeybinds);
        localStorage.setItem("keybinds", JSON.stringify(newKeybinds));
        setWaitingForKey(null);
        e.preventDefault();
        return;
      }
      // Brightness controls (NUMPAD + and -)
      if (e.code === "NumpadAdd") {
        setBrightness((b) => Math.min(100, b + 5));
        e.preventDefault();
        return;
      }
      if (e.code === "NumpadSubtract") {
        setBrightness((b) => Math.max(1, b - 5));
        e.preventDefault();
        return;
      }
      // Trigger button if key matches
      const action = Object.keys(keybinds).find(
        (k) => keybinds[k] === e.key.toUpperCase()
      );
      if (action) {
        handleButton(action);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keybinds, waitingForKey]);

  // Modified handleButton to support rebind mode
  const handleButton = (color) => {
    if (rebindMode) {
      setWaitingForKey(color);
      return;
    }
    setLastAction(color);
    setIsFlashing(color === "YELLOW_FLASH");

    // Handle Chequered
    if (color === "CHEQUERED") {
      setPrevShowChequered(showChequered);
      setShowChequered(true);
    } else {
      if (lastAction === "CHEQUERED") {
        setShowChequered(prevShowChequered);
      } else {
        setShowChequered(false);
      }
    }

    // Handle White
    if (color === "WHITE") {
      setPrevBrightness(brightness);
      setBrightness(100);
      setDisplayColor(COLORS.WHITE);
    } else {
      if (lastAction === "WHITE") {
        setBrightness(prevBrightness);
      }
      if (color !== "YELLOW_FLASH" && color !== "CHEQUERED") {
        setDisplayColor(COLORS[color]);
      }
    }
  };

  return (
    <div className="flex min-h-screen max-h-screen bg-gray-900 text-white">
      {/* Left Panel */}
      <div className="p-8">
        <button
          className={`mb-6 w-full h-12 text-lg font-bold ${
            rebindMode
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-200 hover:bg-gray-600"
          }`}
          style={{ borderRadius: 0 }}
          onClick={() => {
            setRebindMode((v) => !v);
            setWaitingForKey(null);
          }}
        >
          {rebindMode ? "Exit Keybind Mode" : "Keybind Mode"}
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(COLORS).map(([action, color]) => (
            <button
              key={action}
              className={
                action === "YELLOW_FLASH"
                  ? "bg-yellow-400 hover:bg-yellow-300 text-black text-2xl w-64 h-48 border-4 border-yellow-600 animate-pulse flex flex-col items-center justify-center"
                  : action === "WHITE"
                  ? "bg-white hover:bg-gray-200 text-black text-2xl w-64 h-48 flex flex-col items-center justify-center"
                  : action === "CHEQUERED"
                  ? "bg-gray-400 hover:bg-gray-300 text-black text-2xl w-64 h-48 flex flex-col items-center justify-center"
                  : action === "FORM_UP"
                  ? "bg-blue-400 hover:bg-blue-300 text-black text-2xl w-64 h-48 flex flex-col items-center justify-center"
                  : `text-2xl w-64 h-48 flex flex-col items-center justify-center ${
                      action === "CLEAR"
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : action === "RED"
                        ? "bg-red-600 hover:bg-red-500 text-white"
                        : action === "GREEN"
                        ? "bg-green-600 hover:bg-green-500 text-white"
                        : action === "YELLOW"
                        ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                        : ""
                    }`
              }
              style={{ borderRadius: 0 }}
              onClick={() => handleButton(action)}
              disabled={waitingForKey && waitingForKey !== action}
            >
              <span>
                {action === "YELLOW_FLASH"
                  ? "Yellow Flashing"
                  : action === "CHEQUERED"
                  ? "Chequered"
                  : action === "FORM_UP"
                  ? "FORM UP"
                  : action.charAt(0) + action.slice(1).toLowerCase()}
              </span>
              <span className="text-xs mt-2 text-gray-300">
                {waitingForKey === action ? "Press key..." : keybinds[action]}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Right Panel */}
      <div className="flex-1 relative flex flex-col items-center justify-center">
        <div
          className="absolute top-0 right-0 flex items-center justify-center overflow-hidden"
          style={{
            width: boxWidth,
            height: boxHeight,
            background:
              lastAction === "FORM_UP"
                ? "#000" // Black background for FORM UP
                : showChequered
                ? "#222"
                : isFlashing
                ? displayColor
                : adjustBrightness(displayColor, brightness),
            transition: "background 0.2s",
            imageRendering: "pixelated",
          }}
        >
          {showChequered && (
            <img
              src="/chequered.gif"
              alt="Chequered"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "pixelated",
              }}
            />
          )}
          {/* Show "FORM UP" text if FORM_UP is active */}
          {lastAction === "FORM_UP" && (
                        <span
              style={{
                color: "#fff",
                fontWeight: "bold",
                // Responsive font size: 60% of box height, but max 90% of box width divided by 8 (letters in "FORM UP")
                fontSize: `min(${Math.round(boxHeight * 0.6)}px, ${Math.round(
                  (boxWidth * 0.9) / 8
                )}px)`,
                textShadow: "2px 2px 8px #000",
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
                textAlign: "center",
                width: "100%",
                lineHeight: 1,
              }}
            >
              FORM UP
            </span>
          )}
        </div>
        {/* Vertical Brightness Slider */}
        <div className="absolute top-0 right-16 flex flex-col items-center h-full justify-center">
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="appearance-none w-8 h-48 bg-gray-700 rounded-lg outline-none"
            style={{
              writingMode: "bt-lr",
              WebkitAppearance: "slider-vertical",
            }}
          />
          <span className="mt-4 text-xs text-gray-300">Brightness</span>
          <span className="text-xs text-gray-400">{brightness}%</span>
          {/* Box Size Controls */}
          <form className="mt-8 flex flex-col items-center gap-2 w-24">
            <label className="flex flex-col items-center text-xs text-gray-300 w-full">
              Width
              <input
                type="number"
                min={1}
                max={500}
                value={boxWidth}
                onChange={(e) => setBoxWidth(Number(e.target.value))}
                className="mt-1 w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-gray-400">px</span>
            </label>
            <label className="flex flex-col items-center text-xs text-gray-300 w-full">
              Height
              <input
                type="number"
                min={1}
                max={500}
                value={boxHeight}
                onChange={(e) => setBoxHeight(Number(e.target.value))}
                className="mt-1 w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-gray-400">px</span>
            </label>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
