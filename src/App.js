import React, { useState } from "react";
import "./App.css";

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#00FF00",
  YELLOW: "#FFFF00",
  YELLOW_FLASH: "#FFFF00",
};

function App() {
  const [displayColor, setDisplayColor] = useState(COLORS.CLEAR);
  const [isFlashing, setIsFlashing] = useState(false);

  // Flashing effect for yellow
  React.useEffect(() => {
    let interval;
    if (isFlashing) {
      interval = setInterval(() => {
        setDisplayColor((prev) =>
          prev === COLORS.YELLOW ? COLORS.CLEAR : COLORS.YELLOW
        );
      }, 500);
    } else {
      setDisplayColor(COLORS.YELLOW);
    }
    return () => clearInterval(interval);
  }, [isFlashing]);

  const handleButton = (color) => {
    setIsFlashing(color === "YELLOW_FLASH");
    if (color !== "YELLOW_FLASH") setDisplayColor(COLORS[color]);
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Left Panel */}
      <div className="flex flex-col gap-6 p-8 w-64">
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white text-2xl py-4 rounded-lg"
          onClick={() => handleButton("CLEAR")}
        >
          Clear
        </button>
        <button
          className="bg-red-600 hover:bg-red-500 text-white text-2xl py-4 rounded-lg"
          onClick={() => handleButton("RED")}
        >
          Red
        </button>
        <button
          className="bg-green-600 hover:bg-green-500 text-white text-2xl py-4 rounded-lg"
          onClick={() => handleButton("GREEN")}
        >
          Green
        </button>
        <button
          className="bg-yellow-400 hover:bg-yellow-300 text-black text-2xl py-4 rounded-lg"
          onClick={() => handleButton("YELLOW")}
        >
          Yellow
        </button>
        <button
          className="bg-yellow-400 hover:bg-yellow-300 text-black text-2xl py-4 rounded-lg border-4 border-yellow-600 animate-pulse"
          onClick={() => handleButton("YELLOW_FLASH")}
        >
          Yellow Flashing
        </button>
      </div>
      {/* Right Panel */}
      <div className="flex-1 relative">
        <div
          className="absolute top-4 right-4"
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
