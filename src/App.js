import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#66ff00",
  YELLOW: "#FFFF00",
  YELLOW_FLASH: "#FFFF00",
  WHITE: "#FFFFFF",
  CHEQUERED: null,
};

function hexToRgb(hex) {
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

function LEDMaster() {
  // State for both statuses
  const [trafficLightAction, setTrafficLightAction] = useState("CLEAR");
  const [flagStandAction, setFlagStandAction] = useState("CLEAR");
  const [isFlashing, setIsFlashing] = useState(false);
  const [flagStandIsFlashing, setFlagStandIsFlashing] = useState(false);

  const [brightness, setBrightness] = useState(100);
  const [prevBrightness, setPrevBrightness] = useState(100);
  const [flagStandBrightness, setFlagStandBrightness] = useState(80);
  const [flagStandPrevBrightness, setFlagStandPrevBrightness] = useState(80);
  const [showChequered, setShowChequered] = useState(false);
  const [trafficLightShowChequered, setTrafficLightShowChequered] =
    useState(false);
  const [flagStandShowChequered, setFlagStandShowChequered] = useState(false);
  const [boxWidth, setBoxWidth] = useState(40);
  const [boxHeight, setBoxHeight] = useState(80);
  const [trafficLightBoxWidth, setTrafficLightBoxWidth] = useState(80);
  const [trafficLightBoxHeight, setTrafficLightBoxHeight] = useState(40);
  const [flagStandBoxWidth, setFlagStandBoxWidth] = useState(80);
  const [flagStandBoxHeight, setFlagStandBoxHeight] = useState(40);
  const [pendingTrafficLightBoxWidth, setPendingTrafficLightBoxWidth] =
    useState(trafficLightBoxWidth);
  const [pendingTrafficLightBoxHeight, setPendingTrafficLightBoxHeight] =
    useState(trafficLightBoxHeight);
  const [pendingFlagStandBoxWidth, setPendingFlagStandBoxWidth] =
    useState(flagStandBoxWidth);
  const [pendingFlagStandBoxHeight, setPendingFlagStandBoxHeight] =
    useState(flagStandBoxHeight);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // For sending state only after state is updated
  const stateRef = useRef();
  stateRef.current = {
    trafficLightAction,
    flagStandAction,
    brightness,
    flagStandBrightness,
    boxWidth,
    boxHeight,
  };

  // Flashing effect for yellow (traffic light)
  useEffect(() => {
    let interval;
    if (isFlashing) {
      interval = setInterval(() => {
        setTrafficLightAction((prev) =>
          prev === "YELLOW" ? "CLEAR" : "YELLOW"
        );
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isFlashing]);

  // Flashing effect for yellow (flag stand)
  useEffect(() => {
    let interval;
    if (flagStandIsFlashing) {
      interval = setInterval(() => {
        setFlagStandAction((prev) => (prev === "YELLOW" ? "CLEAR" : "YELLOW"));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [flagStandIsFlashing]);

  // Listen for keydown events
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Function key mappings
      if (e.key === "F1") {
        handleButton("CLEAR");
        e.preventDefault();
        return;
      }
      if (e.key === "F2") {
        handleButton("GREEN");
        e.preventDefault();
        return;
      }
      if (e.key === "F3") {
        handleButton("RED");
        e.preventDefault();
        return;
      }
      if (e.key === "F4") {
        handleButton("YELLOW");
        e.preventDefault();
        return;
      }
      if (e.key === "F5") {
        handleButton("YELLOW_FLASH");
        e.preventDefault();
        return;
      }
      if (e.key === "F6") {
        handleButton("CLEAR_FLAG_STAND");
        e.preventDefault();
        return;
      }
      if (e.key === "F7") {
        handleButton("WHITE");
        e.preventDefault();
        return;
      }
      if (e.key === "F8") {
        handleButton("CHEQUERED");
        e.preventDefault();
        return;
      }
      if (e.key === "F9") {
        setShowSettingsModal(!showSettingsModal);
        e.preventDefault();
        return;
      }
      if (e.key === "Escape" && showSettingsModal) {
        setShowSettingsModal(false);
        e.preventDefault();
        return;
      }

      // Brightness controls (NUMPAD + and -)
      if (e.code === "NumpadAdd") {
        setBrightness((b) => Math.min(100, b + 5));
        setFlagStandBrightness((b) => Math.min(100, b + 5));
        return;
      }
      if (e.code === "NumpadSubtract") {
        setBrightness((b) => Math.max(1, b - 5));
        setFlagStandBrightness((b) => Math.max(1, b - 5));
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line
  }, [showSettingsModal]);

  // Button handlers
  const handleButton = (action) => {
    // Handle separate flag stand clear
    if (action === "CLEAR_FLAG_STAND") {
      setFlagStandAction("CLEAR");
      setFlagStandIsFlashing(false);
      setFlagStandShowChequered(false);
      return;
    }

    // If it's a flag stand only action
    if (["WHITE"].includes(action)) {
      // Save previous brightness for white
      if (action === "WHITE") {
        setFlagStandPrevBrightness(flagStandBrightness);
        setFlagStandBrightness(100);
      } else if (flagStandAction === "WHITE") {
        setFlagStandBrightness(flagStandPrevBrightness);
      }
      setFlagStandAction(action);
      setFlagStandShowChequered(false);
      setFlagStandIsFlashing(false);
      // The traffic lights remain as they are
    } else if (["CHEQUERED"].includes(action)) {
      // Chequered works on both sides
      setTrafficLightAction(action);
      setIsFlashing(false);
      setTrafficLightShowChequered(true);
      setFlagStandAction(action);
      setFlagStandIsFlashing(false);
      setFlagStandShowChequered(true);
    } else if (["YELLOW", "YELLOW_FLASH", "RED", "CLEAR"].includes(action)) {
      // These should override both traffic lights and flag stand
      setTrafficLightAction(action);
      setIsFlashing(action === "YELLOW_FLASH");
      setTrafficLightShowChequered(false);
      setFlagStandAction(action);
      setFlagStandIsFlashing(action === "YELLOW_FLASH");
      setFlagStandShowChequered(false);
    } else if (action === "GREEN") {
      // Green does NOT override flag stand if it's showing a flag stand only flag
      setTrafficLightAction(action);
      setIsFlashing(false);
      setTrafficLightShowChequered(false);
      // Only update flag stand if it's not showing a flag stand only flag
      if (!["WHITE"].includes(flagStandAction)) {
        setFlagStandAction(action);
        setFlagStandIsFlashing(false);
        setFlagStandShowChequered(false);
      }
    }
  };

  // Handlers for brightness and box size changes
  const handleBrightnessChange = (val) => {
    setBrightness(val);
    setFlagStandBrightness(val);
  };
  const handleBoxWidthChange = (val) => {
    setBoxWidth(val);
  };
  const handleBoxHeightChange = (val) => {
    setBoxHeight(val);
  };
  const handleFlagStandBoxWidthChange = (val) => {
    setFlagStandBoxWidth(val);
  };
  const handleFlagStandBoxHeightChange = (val) => {
    setFlagStandBoxHeight(val);
  };

  // Split buttons into traffic lights and flag stand
  const trafficLightButtons = [
    "CLEAR",
    "GREEN",
    "RED",
    "YELLOW",
    "YELLOW_FLASH",
    "CHEQUERED",
  ];
  const flagStandButtons = ["CLEAR_FLAG_STAND", "WHITE", "CHEQUERED"];

  // Combined array for horizontal layout (kept for compatibility)
  const allButtons = [...trafficLightButtons, ...flagStandButtons];

  // Keybind mappings
  const keybindMap = {
    CLEAR: "F1",
    GREEN: "F2",
    RED: "F3",
    YELLOW: "F4",
    YELLOW_FLASH: "F5",
    CLEAR_FLAG_STAND: "F6",
    WHITE: "F7",
    CHEQUERED: "F8",
  };

  // Helper for color
  const getColor = (action) =>
    action === "RED"
      ? "#FF0000"
      : action === "GREEN"
      ? "#00FF00"
      : action === "YELLOW" || action === "YELLOW_FLASH"
      ? "#FFD600"
      : action === "WHITE"
      ? "#FFFFFF"
      : action === "CHEQUERED"
      ? "#888"
      : "#AAA";

  return (
    <div
      className="flex min-h-screen max-h-screen bg-gray-900 text-white relative overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style jsx>{`
        body::-webkit-scrollbar {
          display: none;
        }
        html {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
      {/* Reserved Output Area - 320px height */}
      <div
        className="absolute top-0 left-0 w-full h-80 bg-transparent border-b border-gray-800 led-display-area"
        style={{ cursor: "none" }}
      >
        {/* Traffic Lights Display - Top Left */}
        <div className="absolute top-0 left-0 flex flex-col items-center pointer-events-none led-display-area">
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: trafficLightBoxWidth,
              height: trafficLightBoxHeight,
              background:
                trafficLightAction === "CHEQUERED" || trafficLightShowChequered
                  ? "#222"
                  : trafficLightAction === "YELLOW_FLASH"
                  ? COLORS.YELLOW
                  : adjustBrightness(
                      COLORS[trafficLightAction] || "#000",
                      brightness
                    ),
              transition: "background 0.2s",
              imageRendering: "pixelated",
            }}
          >
            {(trafficLightAction === "CHEQUERED" ||
              trafficLightShowChequered) && (
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
          </div>
        </div>

        {/* Flag Stand Display - Top Right */}
        <div className="absolute top-0 right-0 flex flex-col items-center pointer-events-none led-display-area">
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: flagStandBoxWidth,
              height: flagStandBoxHeight,
              background:
                flagStandAction === "CHEQUERED" || flagStandShowChequered
                  ? "#222"
                  : flagStandAction === "YELLOW_FLASH"
                  ? COLORS.YELLOW
                  : adjustBrightness(
                      COLORS[flagStandAction] || "#000",
                      flagStandBrightness
                    ),
              transition: "background 0.2s",
              imageRendering: "pixelated",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {(flagStandAction === "CHEQUERED" || flagStandShowChequered) && (
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
          </div>
        </div>
      </div>{" "}
      {/* Button Area - starts below the 320px reserved area */}
      <div
        className="flex flex-col w-full"
        style={{ marginTop: "320px", padding: "16px" }}
      >
        {/* Settings Toggle Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 flex items-center justify-center"
            style={{ borderRadius: 0 }}
          >
            <span>Settings (F9)</span>
          </button>
        </div>

        {/* Horizontal Button Layout */}
        <div className="flex flex-col gap-4">
          {/* Traffic Light Buttons - First Row */}
          <div className="flex flex-wrap gap-3 justify-start">
            {trafficLightButtons.map((action) => (
              <button
                key={action}
                className={
                  action === "YELLOW_FLASH"
                    ? "bg-yellow-400 hover:bg-yellow-300 text-black text-lg border-4 border-yellow-600 flex items-center justify-center"
                    : action === "CLEAR"
                    ? "bg-gray-700 hover:bg-gray-600 text-white text-lg flex items-center justify-center"
                    : action === "RED"
                    ? "bg-red-600 hover:bg-red-500 text-white text-lg flex items-center justify-center"
                    : action === "GREEN"
                    ? "bg-green-600 hover:bg-green-500 text-white text-lg flex items-center justify-center"
                    : action === "YELLOW"
                    ? "bg-yellow-400 hover:bg-yellow-300 text-black text-lg flex items-center justify-center"
                    : ""
                }
                style={{
                  borderRadius: 0,
                  width: "calc(50% - 6px)", // Half width minus gap
                  height: "96px", // Double the current 48px height
                  minWidth: "140px", // Minimum width for readability
                  maxWidth: "200px", // Maximum width to prevent overly wide buttons
                }}
                onClick={() => handleButton(action)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">
                    {action === "YELLOW_FLASH"
                      ? "Yellow Flashing"
                      : action.charAt(0) + action.slice(1).toLowerCase()}
                  </span>
                  <span className="text-xs mt-1 opacity-75">
                    {keybindMap[action]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Flag Stand Buttons - Second Row */}
          <div className="flex flex-wrap gap-3 justify-start">
            {flagStandButtons.map((action) => (
              <button
                key={action}
                className={
                  action === "CHEQUERED"
                    ? "bg-gray-400 hover:bg-gray-300 text-black text-lg flex items-center justify-center"
                    : action === "WHITE"
                    ? "bg-white hover:bg-gray-200 text-black text-lg flex items-center justify-center"
                    : action === "CLEAR_FLAG_STAND"
                    ? "bg-gray-700 hover:bg-gray-600 text-white text-lg flex items-center justify-center"
                    : ""
                }
                style={{
                  borderRadius: 0,
                  width: "calc(50% - 6px)", // Half width minus gap
                  height: "96px", // Double the current 48px height
                  minWidth: "140px", // Minimum width for readability
                  maxWidth: "200px", // Maximum width to prevent overly wide buttons
                }}
                onClick={() => handleButton(action)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">
                    {action === "CHEQUERED"
                      ? "Chequered"
                      : action === "CLEAR_FLAG_STAND"
                      ? "Clear Flag Stand"
                      : action.charAt(0) + action.slice(1).toLowerCase()}
                  </span>
                  <span className="text-xs mt-1 opacity-75">
                    {keybindMap[action]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-gray-800 p-8 rounded max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Settings & Controls
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Traffic Light Box Size */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300">
                  Traffic Lights Size
                </h3>
                <div className="flex gap-4">
                  <label className="flex flex-col items-center text-sm text-gray-300">
                    Width
                    <input
                      type="number"
                      min={1}
                      max={320}
                      value={trafficLightBoxWidth}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setTrafficLightBoxWidth(newWidth);
                      }}
                      className="mt-1 w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex flex-col items-center text-sm text-gray-300">
                    Height
                    <input
                      type="number"
                      min={1}
                      max={320}
                      value={trafficLightBoxHeight}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setTrafficLightBoxHeight(newHeight);
                      }}
                      className="mt-1 w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Flag Stand Box Size */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300">
                  Flag Stand Size
                </h3>
                <div className="flex gap-4">
                  <label className="flex flex-col items-center text-sm text-gray-300">
                    Width
                    <input
                      type="number"
                      min={1}
                      max={320}
                      value={flagStandBoxWidth}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setFlagStandBoxWidth(newWidth);
                      }}
                      className="mt-1 w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex flex-col items-center text-sm text-gray-300">
                    Height
                    <input
                      type="number"
                      min={1}
                      max={320}
                      value={flagStandBoxHeight}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setFlagStandBoxHeight(newHeight);
                      }}
                      className="mt-1 w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Brightness Control */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300">
                  Brightness
                </h3>
                <div className="flex flex-col space-y-2">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={brightness}
                    onChange={(e) =>
                      handleBrightnessChange(Number(e.target.value))
                    }
                    className="appearance-none w-full h-4 bg-gray-700 rounded-lg outline-none"
                  />
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Brightness</span>
                    <span className="text-gray-400">{brightness}%</span>
                  </div>
                </div>
              </div>

              {/* Keybinds Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-300">
                  Keybinds
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between text-gray-300">
                      <span>Clear:</span>
                      <span className="text-blue-400">F1</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Green:</span>
                      <span className="text-blue-400">F2</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Red:</span>
                      <span className="text-blue-400">F3</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Yellow:</span>
                      <span className="text-blue-400">F4</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Settings:</span>
                      <span className="text-blue-400">F9</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-gray-300">
                      <span>Yellow Flash:</span>
                      <span className="text-blue-400">F5</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Clear Flag:</span>
                      <span className="text-blue-400">F6</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>White:</span>
                      <span className="text-blue-400">F7</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Chequered:</span>
                      <span className="text-blue-400">F8</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Brightness:</span>
                      <span className="text-blue-400">NUM +/-</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-sm"
                >
                  Close (ESC/F9)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LEDMaster;
