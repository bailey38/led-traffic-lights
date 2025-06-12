import React, { useState, useEffect } from "react";
import "./App.css";

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#00FF00",
  YELLOW: "#FFFF00",
  YELLOW_FLASH: "#FFFF00",
};

const DEFAULT_KEYBINDS = {
  CLEAR: "F1",
  RED: "F2",
  GREEN: "F3",
  YELLOW: "F4",
  YELLOW_FLASH: "F5",
};

function App() {
  const [displayColor, setDisplayColor] = useState(COLORS.CLEAR);
  const [isFlashing, setIsFlashing] = useState(false);
  const [keybinds, setKeybinds] = useState(() => {
    const saved = localStorage.getItem("keybinds");
    return saved ? JSON.parse(saved) : DEFAULT_KEYBINDS;
  });
  const [waitingForKey, setWaitingForKey] = useState(null);

  // Flashing effect for yellow
  useEffect(() => {
    let interval;
    if (isFlashing) {
      interval = setInterval(() => {
        setDisplayColor((prev) =>
          prev === COLORS.YELLOW ? COLORS.CLEAR : COLORS.YELLOW
        );
      }, 500);
    } else if (
      displayColor === COLORS.YELLOW ||
      displayColor === COLORS.CLEAR
    ) {
      setDisplayColor(COLORS.YELLOW);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [isFlashing]);

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
    // eslint-disable-next-line
  }, [keybinds, waitingForKey]);

  const handleButton = (color) => {
    setIsFlashing(color === "YELLOW_FLASH");
    if (color !== "YELLOW_FLASH") setDisplayColor(COLORS[color]);
  };

  return (
    <div className="flex min-h-screen max-h-screen bg-gray-900 text-white">
      {/* Left Panel */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(COLORS).map(([action, color]) => (
            <button
              key={action}
              className={
                action === "YELLOW_FLASH"
                  ? "bg-yellow-400 hover:bg-yellow-300 text-black text-2xl w-64 h-48 border-4 border-yellow-600 animate-pulse flex flex-col items-center justify-center"
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
            >
              <span>
                {action
                  .replace("_FLASH", " Flashing")
                  .replace("_", " ")
                  .toLowerCase()
                  .replace(/^\w/, (c) => c.toUpperCase())}
              </span>
              <span className="text-xs mt-2 text-gray-300">
                {keybinds[action]}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Right Panel */}
      <div className="flex-1 relative">
        <div
          className="absolute top-0 right-0 flex items-center justify-center"
          style={{
            width: 40,
            height: 80,
            background: displayColor,
            transition: "background 0.2s",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}

export default App;
