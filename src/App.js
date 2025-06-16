import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#00FF00",
  YELLOW: "#FFFF00",
  YELLOW_FLASH: "#FFFF00",
  WHITE: "#FFFFFF",
  CHEQUERED: null, // special case for gif
  FORM_UP: "#00BFFF",
};

const DEFAULT_KEYBINDS = {
  CLEAR: "F1",
  RED: "F2",
  GREEN: "F3",
  YELLOW: "F4",
  YELLOW_FLASH: "F5",
  WHITE: "F6",
  CHEQUERED: "F7",
  FORM_UP: "F8",
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

// --- WebSocket Master Logic ---
let ws;
function getWebSocket() {
  if (!ws || ws.readyState > 1) {
    ws = new window.WebSocket("ws://localhost:8080");
  }
  return ws;
}

function LEDMaster() {
  // State for both statuses
  const [trafficLightAction, setTrafficLightAction] = useState("CLEAR");
  const [flagStandAction, setFlagStandAction] = useState("CLEAR");
  const [isFlashing, setIsFlashing] = useState(false);
  const [flagStandIsFlashing, setFlagStandIsFlashing] = useState(false);
  const [keybinds, setKeybinds] = useState(() => {
    const saved = localStorage.getItem("keybinds");
    return saved ? JSON.parse(saved) : DEFAULT_KEYBINDS;
  });
  const [waitingForKey, setWaitingForKey] = useState(null);
  const [brightness, setBrightness] = useState(80);
  const [prevBrightness, setPrevBrightness] = useState(80);
  const [flagStandBrightness, setFlagStandBrightness] = useState(80);
  const [flagStandPrevBrightness, setFlagStandPrevBrightness] = useState(80);
  const [showChequered, setShowChequered] = useState(false);
  const [flagStandShowChequered, setFlagStandShowChequered] = useState(false);
  const [boxWidth, setBoxWidth] = useState(40);
  const [boxHeight, setBoxHeight] = useState(80);
  const [rebindMode, setRebindMode] = useState(false);
  const [trafficLightBoxWidth, setTrafficLightBoxWidth] = useState(256);
  const [trafficLightBoxHeight, setTrafficLightBoxHeight] = useState(256);
  const [flagStandBoxWidth, setFlagStandBoxWidth] = useState(256);
  const [flagStandBoxHeight, setFlagStandBoxHeight] = useState(256);
  const [pendingTrafficLightBoxWidth, setPendingTrafficLightBoxWidth] =
    useState(trafficLightBoxWidth);
  const [pendingTrafficLightBoxHeight, setPendingTrafficLightBoxHeight] =
    useState(trafficLightBoxHeight);
  const [pendingFlagStandBoxWidth, setPendingFlagStandBoxWidth] =
    useState(flagStandBoxWidth);
  const [pendingFlagStandBoxHeight, setPendingFlagStandBoxHeight] =
    useState(flagStandBoxHeight);

  // Add state for black flag number
  const [blackFlagNumber, setBlackFlagNumber] = useState("");
  const [showBlackFlag, setShowBlackFlag] = useState(false);

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

  // Send state to slave
  function sendToSlave(data) {
    const socket = getWebSocket();
    const payload = JSON.stringify({
      ...data,
      trafficLightBoxWidth,
      trafficLightBoxHeight,
      flagStandBoxWidth,
      flagStandBoxHeight,
    });
    if (socket.readyState === 1) {
      socket.send(payload);
    } else {
      socket.onopen = () => socket.send(payload);
    }
  }

  // Send state on every relevant change
  useEffect(() => {
    sendToSlave({
      trafficLightAction,
      flagStandAction,
      brightness,
      flagStandBrightness,
      boxWidth,
      boxHeight,
    });
    // eslint-disable-next-line
  }, [
    trafficLightAction,
    flagStandAction,
    brightness,
    flagStandBrightness,
    boxWidth,
    boxHeight,
  ]);

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
        setFlagStandBrightness((b) => Math.min(100, b + 5));
        return;
      }
      if (e.code === "NumpadSubtract") {
        setBrightness((b) => Math.max(1, b - 5));
        setFlagStandBrightness((b) => Math.max(1, b - 5));
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

  // Button handlers
  const handleButton = (action) => {
    if (rebindMode) {
      setWaitingForKey(action);
      return;
    }

    if (action === "BLACK_FLAG") {
      setShowBlackFlag(true);
      return;
    } else {
      setShowBlackFlag(false);
    }

    // If it's a flag stand only action
    if (["WHITE", "CHEQUERED", "FORM_UP"].includes(action)) {
      // Save previous brightness for white
      if (action === "WHITE") {
        setFlagStandPrevBrightness(flagStandBrightness);
        setFlagStandBrightness(100);
      } else if (flagStandAction === "WHITE") {
        setFlagStandBrightness(flagStandPrevBrightness);
      }
      setFlagStandAction(action);
      setFlagStandShowChequered(action === "CHEQUERED");
      setFlagStandIsFlashing(action === "YELLOW_FLASH");
      // The traffic lights remain as they are
    } else if (["YELLOW", "YELLOW_FLASH", "RED", "CLEAR"].includes(action)) {
      // These should override the flag stand if it's currently showing a
      //  only flag
      setTrafficLightAction(action);
      setIsFlashing(action === "YELLOW_FLASH");
      setFlagStandAction(action);
      setFlagStandIsFlashing(action === "YELLOW_FLASH");
      setFlagStandShowChequered(false);
    } else if (action === "GREEN") {
      // Green does NOT override flag stand if it's showing a flag stand only flag
      setTrafficLightAction(action);
      setIsFlashing(false);
      // Only update flag stand if it's not showing a flag stand only flag
      if (!["WHITE", "CHEQUERED", "FORM_UP"].includes(flagStandAction)) {
        setFlagStandAction(action);
        setFlagStandIsFlashing(false);
        setFlagStandShowChequered(false);
      }
    }
  };

  // Handlers for brightness and box size changes (send to slave)
  const handleBrightnessChange = (val) => {
    setBrightness(val);
    setFlagStandBrightness(val);
    sendToSlave({
      trafficLightAction,
      flagStandAction,
      brightness: val,
      flagStandBrightness: val,
      boxWidth,
      boxHeight,
    });
  };
  const handleBoxWidthChange = (val) => {
    setBoxWidth(val);
    sendToSlave({
      trafficLightAction,
      flagStandAction,
      brightness,
      flagStandBrightness,
      boxWidth: val,
      boxHeight,
    });
  };
  const handleBoxHeightChange = (val) => {
    setBoxHeight(val);
    sendToSlave({
      trafficLightAction,
      flagStandAction,
      brightness,
      flagStandBrightness,
      boxWidth,
      boxHeight: val,
    });
  };
  const handleFlagStandBoxWidthChange = (val) => {
    setFlagStandBoxWidth(val);
    sendToSlave({
      trafficLightAction,
      flagStandAction,
      brightness,
      flagStandBrightness,
      boxWidth,
      boxHeight,
      flagStandBoxWidth: val,
      flagStandBoxHeight,
    });
  };
  const handleFlagStandBoxHeightChange = (val) => {
    setFlagStandBoxHeight(val);
    sendToSlave({
      trafficLightAction,
      flagStandAction,
      brightness,
      flagStandBrightness,
      boxWidth,
      boxHeight,
      flagStandBoxWidth,
      flagStandBoxHeight: val,
    });
  };

  // Split buttons into columns
  const column1 = ["CLEAR", "GREEN", "RED", "YELLOW", "YELLOW_FLASH"];
  const column2 = ["WHITE", "CHEQUERED", "FORM_UP"];

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
      : action === "FORM_UP"
      ? "#00BFFF"
      : "#AAA";

  return (
    <div className="flex min-h-screen max-h-screen bg-gray-900 text-white">
      {/* Column 1 */}
      <div className="flex flex-col items-center justify-start w-1/3 p-8 border-r border-gray-800">
        <div className="mb-4 text-2xl font-extrabold text-center tracking-wide select-none text-gray-400">
          Traffic Lights
        </div>
        <div className="flex flex-col gap-6 w-full mb-8">
          {column1.map((action) => (
            <button
              key={action}
              className={
                action === "YELLOW_FLASH"
                  ? "bg-yellow-400 hover:bg-yellow-300 text-black text-2xl w-full h-24 border-4 border-yellow-600 animate-pulse flex flex-col items-center justify-center"
                  : action === "CLEAR"
                  ? "bg-gray-700 hover:bg-gray-600 text-white text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : action === "RED"
                  ? "bg-red-600 hover:bg-red-500 text-white text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : action === "GREEN"
                  ? "bg-green-600 hover:bg-green-500 text-white text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : action === "YELLOW"
                  ? "bg-yellow-400 hover:bg-yellow-300 text-black text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : ""
              }
              style={{ borderRadius: 0 }}
              onClick={() => handleButton(action)}
              disabled={waitingForKey && waitingForKey !== action}
            >
              <span>
                {action === "YELLOW_FLASH"
                  ? "Yellow Flashing"
                  : action.charAt(0) + action.slice(1).toLowerCase()}
              </span>
              <span className="text-xs mt-2 text-gray-300">
                {waitingForKey === action ? "Press key..." : keybinds[action]}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Column 2 */}
      <div className="flex flex-col items-center justify-start w-1/3 p-8 border-r border-gray-800">
        <div className="mb-4 text-2xl font-extrabold text-center tracking-wide select-none text-gray-400">
          Flag Stand
        </div>
        <div className="flex flex-col gap-2 w-full mb-8">
          {column2.map((action) => (
            <button
              key={action}
              className={
                action === "WHITE"
                  ? "bg-white hover:bg-gray-200 text-black text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : action === "CHEQUERED"
                  ? "bg-gray-400 hover:bg-gray-300 text-black text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : action === "FORM_UP"
                  ? "bg-blue-400 hover:bg-blue-300 text-black text-2xl w-full h-24 flex flex-col items-center justify-center"
                  : ""
              }
              style={{ borderRadius: 0 }}
              onClick={() => handleButton(action)}
              disabled={waitingForKey && waitingForKey !== action}
            >
              <span>
                {action === "CHEQUERED"
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
          {/* BLACK FLAG BUTTON */}
          <button
            className="bg-black hover:bg-gray-800 text-white text-2xl w-full h-24 flex flex-col items-center justify-center border-4 border-gray-700 mt-2"
            style={{ borderRadius: 0 }}
            onClick={() => handleButton("BLACK_FLAG")}
            disabled={waitingForKey && waitingForKey !== "BLACK_FLAG"}
          >
            <span>BLACK FLAG</span>
          </button>
          <div className="w-full flex flex-col items-center mt-2">
            <div className="relative w-1/2">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 select-none pointer-events-none">
                #
              </span>
              <input
                type="text"
                className="pl-7 pr-3 py-2 w-full rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                placeholder="Enter number or text"
                value={blackFlagNumber}
                onChange={(e) => setBlackFlagNumber(e.target.value)}
                maxLength={12}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Column 3: Output */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Outputs moved further up */}
        <div
          className="flex flex-col items-center justify-start gap-8 mt-8"
          style={{ flex: 1 }}
        >
          {/* Output for Traffic Light */}
          <div className="flex flex-col items-center">
            <div className="mb-2 text-xl font-bold text-gray-300 select-none">
              Traffic Lights
            </div>
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: 256,
                height: 256,
                background:
                  trafficLightAction === "FORM_UP"
                    ? "#000"
                    : trafficLightAction === "CHEQUERED"
                    ? "#222"
                    : trafficLightAction === "YELLOW_FLASH"
                    ? COLORS.YELLOW
                    : adjustBrightness(
                        COLORS[trafficLightAction] || "#000",
                        brightness
                      ),
                transition: "background 0.2s",
                imageRendering: "pixelated",
                border: "2px solid #444",
              }}
            >
              {trafficLightAction === "CHEQUERED" && (
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
              {trafficLightAction === "FORM_UP" && (
                <span
                  style={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "40px",
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
          </div>
          {/* Output for Flag Stand */}
          <div className="flex flex-col items-center">
            <div className="mb-2 text-xl font-bold text-gray-300 select-none">
              Flag stand
            </div>
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: "256px",
                height: "256px",
                background:
                  flagStandAction === "FORM_UP" || showBlackFlag
                    ? "#000"
                    : flagStandAction === "CHEQUERED"
                    ? "#222"
                    : flagStandAction === "YELLOW_FLASH"
                    ? COLORS.YELLOW
                    : adjustBrightness(
                        COLORS[flagStandAction] || "#000",
                        flagStandBrightness
                      ),
                transition: "background 0.2s",
                imageRendering: "pixelated",
                border: "2px solid #444",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {flagStandAction === "CHEQUERED" && !showBlackFlag && (
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
              {flagStandAction === "FORM_UP" && !showBlackFlag && (
                <div
                  style={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: `min(${Math.round(
                      flagStandBoxHeight * 0.4
                    )}px, ${Math.round((flagStandBoxWidth * 0.9) / 8)}px)`,
                    textShadow: "2px 2px 8px #000",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  FORM UP
                </div>
              )}
              {showBlackFlag && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: `min(${Math.round(
                        flagStandBoxHeight * 0.28
                      )}px, ${Math.round((flagStandBoxWidth * 0.9) / 8)}px)`,
                      textShadow: "2px 2px 8px #000",
                      letterSpacing: "0.1em",
                      marginBottom: "8px",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    BLACK FLAG
                  </span>
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: `min(${Math.round(
                        flagStandBoxHeight * 0.4
                      )}px, ${Math.round((flagStandBoxWidth * 0.9) / 8)}px)`,
                      textShadow: "2px 2px 8px #000",
                      letterSpacing: "0.1em",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    #{blackFlagNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Box Size Controls for both displays, centered and above brightness */}
        <div className="w-full flex flex-col items-center justify-center mt-4 gap-4">
          {/* Traffic Light Box Size */}
          <div className="flex flex-row items-center gap-4 w-auto justify-center">
            <span className="text-xs text-gray-400 mr-2">
              Traffic Lights Size:
            </span>
            <label className="flex flex-col items-center text-xs text-gray-300">
              Width
              <input
                type="number"
                min={1}
                max={500}
                value={trafficLightBoxWidth}
                onChange={(e) => {
                  const newWidth = Number(e.target.value);
                  setTrafficLightBoxWidth(newWidth);
                  sendToSlave({
                    trafficLightAction,
                    flagStandAction,
                    brightness,
                    flagStandBrightness,
                    boxWidth,
                    boxHeight,
                    trafficLightBoxWidth: newWidth,
                    trafficLightBoxHeight,
                    flagStandBoxWidth,
                    flagStandBoxHeight,
                  });
                }}
                className="mt-1 w-16 px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col items-center text-xs text-gray-300">
              Height
              <input
                type="number"
                min={1}
                max={500}
                value={trafficLightBoxHeight}
                onChange={(e) => {
                  const newHeight = Number(e.target.value);
                  setTrafficLightBoxHeight(newHeight);
                  sendToSlave({
                    trafficLightAction,
                    flagStandAction,
                    brightness,
                    flagStandBrightness,
                    boxWidth,
                    boxHeight,
                    trafficLightBoxWidth,
                    trafficLightBoxHeight: newHeight,
                    flagStandBoxWidth,
                    flagStandBoxHeight,
                  });
                }}
                className="mt-1 w-16 px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          {/* Flag Stand Box Size */}
          <div className="flex flex-row items-center gap-4 w-auto justify-center">
            <span className="text-xs text-gray-400 mr-2">Flag Stand Size:</span>
            <label className="flex flex-col items-center text-xs text-gray-300">
              Width
              <input
                type="number"
                min={1}
                max={500}
                value={flagStandBoxWidth}
                onChange={(e) => {
                  const newWidth = Number(e.target.value);
                  setFlagStandBoxWidth(newWidth);
                  sendToSlave({
                    trafficLightAction,
                    flagStandAction,
                    brightness,
                    flagStandBrightness,
                    boxWidth,
                    boxHeight,
                    trafficLightBoxWidth,
                    trafficLightBoxHeight,
                    flagStandBoxWidth: newWidth,
                    flagStandBoxHeight,
                  });
                }}
                className="mt-1 w-16 px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col items-center text-xs text-gray-300">
              Height
              <input
                type="number"
                min={1}
                max={500}
                value={flagStandBoxHeight}
                onChange={(e) => {
                  const newHeight = Number(e.target.value);
                  setFlagStandBoxHeight(newHeight);
                  sendToSlave({
                    trafficLightAction,
                    flagStandAction,
                    brightness,
                    flagStandBrightness,
                    boxWidth,
                    boxHeight,
                    trafficLightBoxWidth,
                    trafficLightBoxHeight,
                    flagStandBoxWidth,
                    flagStandBoxHeight: newHeight,
                  });
                }}
                className="mt-1 w-16 px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          {/* Horizontal Brightness Slider above the keybind button */}
          <div className="flex flex-col items-center w-2/3 py-2">
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={brightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="appearance-none w-full h-4 bg-gray-700 rounded-lg outline-none"
              style={{
                marginBottom: 4,
              }}
            />
            <div className="flex flex-row justify-between w-full text-xs text-gray-300">
              <span>Brightness</span>
              <span className="text-gray-400">{brightness}%</span>
            </div>
          </div>
        </div>
        {/* Keybind Mode Button at the bottom with pb-4 */}
        <div className="w-full flex justify-center pb-4">
          <button
            className={`w-2/3 h-12 text-lg font-bold ${
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
        </div>
      </div>
    </div>
  );
}

export default LEDMaster;
