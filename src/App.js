import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#66ff00",
  YELLOW: "#ffbf00",
  YELLOW_FLASH: "#ffbf00",
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

// Calculate font size based on box dimensions and text length
function calculateFontSize(boxWidth, boxHeight, textLength) {
  // Base size is reduced to fit better on x-axis
  let baseFontSize = 50; // Reduced from 80

  // Adjust based on text length
  if (textLength > 2) {
    baseFontSize = 40;
  }
  if (textLength > 4) {
    baseFontSize = 30;
  }
  if (textLength > 6) {
    baseFontSize = 22;
  }
  if (textLength > 8) {
    baseFontSize = 18;
  }

  return baseFontSize;
}

function LEDMaster() {
  // State for both statuses
  const [trafficLightAction, setTrafficLightAction] = useState("CLEAR");
  const [flagStandAction, setFlagStandAction] = useState("CLEAR");
  const [isFlashing, setIsFlashing] = useState(false);
  const [flagStandIsFlashing, setFlagStandIsFlashing] = useState(false);

  const [brightness, setBrightness] = useState(100);
  const [flagStandBrightness, setFlagStandBrightness] = useState(100);
  const [flagStandPrevBrightness, setFlagStandPrevBrightness] = useState(100);
  const [trafficLightShowChequered, setTrafficLightShowChequered] =
    useState(false);
  const [flagStandShowChequered, setFlagStandShowChequered] = useState(false);
  const [trafficLightBoxWidth, setTrafficLightBoxWidth] = useState(80);
  const [trafficLightBoxHeight, setTrafficLightBoxHeight] = useState(40);
  const [flagStandBoxWidth, setFlagStandBoxWidth] = useState(80);
  const [flagStandBoxHeight, setFlagStandBoxHeight] = useState(80);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Custom text modal states
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState("");
  const [customText, setCustomText] = useState("");
  const [currentCustomText, setCurrentCustomText] = useState("");
  const [isRotatingFlag, setIsRotatingFlag] = useState(false);
  const [showFlagInRotation, setShowFlagInRotation] = useState(true);
  const [lastEnteredTexts, setLastEnteredTexts] = useState([]);

  // For sending state only after state is updated
  const stateRef = useRef();
  stateRef.current = {
    trafficLightAction,
    flagStandAction,
    brightness,
    flagStandBrightness,
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

  // Rotating effect for custom text flags
  useEffect(() => {
    let interval;
    if (isRotatingFlag) {
      interval = setInterval(() => {
        setShowFlagInRotation((prev) => !prev);
      }, 750);
    }
    return () => clearInterval(interval);
  }, [isRotatingFlag]);

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
      if (e.key === "F10") {
        handleButton("PASSING");
        e.preventDefault();
        return;
      }
      if (e.key === "F11") {
        handleButton("RULE_INFRINGEMENT");
        e.preventDefault();
        return;
      }
      if (e.key === "F12") {
        handleButton("NOISE_FLAG");
        e.preventDefault();
        return;
      }
      if (e.key === "Insert") {
        handleButton("FIRE_FLAG");
        e.preventDefault();
        return;
      }
      if (e.key === "Delete") {
        handleButton("MECHANICAL_DEFECT");
        e.preventDefault();
        return;
      }
      if (e.key === "Home") {
        handleButton("BLACK_FLAG");
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
    // Check if this is a flag that requires custom text
    if (
      [
        "RULE_INFRINGEMENT",
        "NOISE_FLAG",
        "FIRE_FLAG",
        "BLACK_FLAG",
        "MECHANICAL_DEFECT",
      ].includes(action)
    ) {
      setSelectedFlag(action);
      setShowTextModal(true);
      return;
    }

    // Handle separate flag stand clear
    if (action === "CLEAR_FLAG_STAND") {
      setFlagStandAction("CLEAR");
      setFlagStandIsFlashing(false);
      setFlagStandShowChequered(false);
      setIsRotatingFlag(false);
      return;
    }

    // If it's a flag stand only action
    if (
      [
        "WHITE",
        "PASSING",
        "RULE_INFRINGEMENT",
        "NOISE_FLAG",
        "FIRE_FLAG",
        "MECHANICAL_DEFECT",
        "BLACK_FLAG",
      ].includes(action)
    ) {
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
      // Chequered is flag stand only now
      setFlagStandAction(action);
      setFlagStandIsFlashing(false);
      setFlagStandShowChequered(true);
      // The traffic lights remain as they are
    } else if (["YELLOW", "YELLOW_FLASH", "RED", "CLEAR"].includes(action)) {
      // These should override both traffic lights and flag stand
      setTrafficLightAction(action);
      setIsFlashing(action === "YELLOW_FLASH");
      setTrafficLightShowChequered(false);
      setFlagStandAction(action);
      setFlagStandIsFlashing(action === "YELLOW_FLASH");
      setFlagStandShowChequered(false);
    } else if (action === "GREEN") {
      // Green DOES override flag stand
      setTrafficLightAction(action);
      setIsFlashing(false);
      setTrafficLightShowChequered(false);
      // Always update flag stand to green
      setFlagStandAction(action);
      setFlagStandIsFlashing(false);
      setFlagStandShowChequered(false);
      setIsRotatingFlag(false);
    }
  };

  // Handle custom text submission
  const handleTextSubmit = () => {
    // If no text entered, just show the flag without rotation
    if (!customText.trim()) {
      setFlagStandAction(selectedFlag);
      setFlagStandIsFlashing(false);
      setFlagStandShowChequered(false);
      setIsRotatingFlag(false);

      // Close modal and reset
      setShowTextModal(false);
      setCustomText("");
      return;
    }

    // Add to last entered texts (keep last 5)
    setLastEnteredTexts((prev) => {
      const updated = [
        customText.trim(),
        ...prev.filter((t) => t !== customText.trim()),
      ];
      return updated.slice(0, 5);
    });

    // Save the custom text
    setCurrentCustomText(customText.trim());

    // Set the flag with rotation
    setFlagStandAction(selectedFlag);
    setFlagStandIsFlashing(false);
    setFlagStandShowChequered(false);
    setIsRotatingFlag(true);
    setShowFlagInRotation(true);

    // Close modal and reset
    setShowTextModal(false);
    setCustomText("");
  };

  // Handle quick select from last entered
  const handleQuickSelect = (text) => {
    // Save the custom text
    setCurrentCustomText(text);

    // Set the flag with rotation immediately
    setFlagStandAction(selectedFlag);
    setFlagStandIsFlashing(false);
    setFlagStandShowChequered(false);
    setIsRotatingFlag(true);
    setShowFlagInRotation(true);

    // Close modal
    setShowTextModal(false);
    setCustomText("");
  };

  // Handlers for brightness and box size changes
  const handleBrightnessChange = (val) => {
    setBrightness(val);
    setFlagStandBrightness(val);
  };

  // Split buttons into traffic lights and flag stand
  const trafficLightButtons = [
    "CLEAR",
    "GREEN",
    "RED",
    "YELLOW",
    "YELLOW_FLASH",
  ];
  const flagStandButtons = [
    "CLEAR_FLAG_STAND",
    "WHITE",
    "CHEQUERED",
    "PASSING",
    "RULE_INFRINGEMENT",
    "NOISE_FLAG",
    "FIRE_FLAG",
    "MECHANICAL_DEFECT",
    "BLACK_FLAG",
  ];

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
    PASSING: "F10",
    RULE_INFRINGEMENT: "F11",
    NOISE_FLAG: "F12",
    FIRE_FLAG: "Insert",
    MECHANICAL_DEFECT: "Delete",
    BLACK_FLAG: "Home",
  };

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
                  : trafficLightAction === "YELLOW"
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
                  : flagStandAction === "PASSING"
                  ? "#0000FF"
                  : flagStandAction === "RULE_INFRINGEMENT"
                  ? "#000"
                  : flagStandAction === "NOISE_FLAG"
                  ? "#ffbf00"
                  : flagStandAction === "FIRE_FLAG"
                  ? "#ffbf00"
                  : flagStandAction === "MECHANICAL_DEFECT"
                  ? "#000"
                  : flagStandAction === "BLACK_FLAG"
                  ? "#000"
                  : flagStandAction === "YELLOW_FLASH"
                  ? COLORS.YELLOW
                  : flagStandAction === "YELLOW"
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
            {flagStandAction === "PASSING" && (
              <svg
                viewBox="0 0 100 100"
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "auto",
                }}
                preserveAspectRatio="xMidYMid meet"
              >
                <rect width="100" height="100" fill="#0000FF" />
                <circle cx="50" cy="50" r="25" fill="#ffbf00" />
              </svg>
            )}
            {flagStandAction === "RULE_INFRINGEMENT" && (
              <>
                {!isRotatingFlag || showFlagInRotation ? (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke="#FFFFFF"
                      strokeWidth="10"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <text
                      x="50"
                      y="50"
                      fontSize={calculateFontSize(
                        flagStandBoxWidth,
                        flagStandBoxHeight,
                        currentCustomText.length
                      )}
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      {currentCustomText}
                    </text>
                  </svg>
                )}
              </>
            )}
            {flagStandAction === "NOISE_FLAG" && (
              <>
                {!isRotatingFlag || showFlagInRotation ? (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#ffbf00" />
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke="#000000"
                      strokeWidth="10"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#ffbf00" />
                    <text
                      x="50"
                      y="50"
                      fontSize={calculateFontSize(
                        flagStandBoxWidth,
                        flagStandBoxHeight,
                        currentCustomText.length
                      )}
                      fontWeight="bold"
                      fill="#000000"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      {currentCustomText}
                    </text>
                  </svg>
                )}
              </>
            )}
            {flagStandAction === "FIRE_FLAG" && (
              <>
                {!isRotatingFlag || showFlagInRotation ? (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#ffbf00" />
                    <line
                      x1="100"
                      y1="0"
                      x2="0"
                      y2="100"
                      stroke="#FF0000"
                      strokeWidth="10"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#ffbf00" />
                    <text
                      x="50"
                      y="50"
                      fontSize={calculateFontSize(
                        flagStandBoxWidth,
                        flagStandBoxHeight,
                        currentCustomText.length
                      )}
                      fontWeight="bold"
                      fill="#FF0000"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      {currentCustomText}
                    </text>
                  </svg>
                )}
              </>
            )}
            {flagStandAction === "MECHANICAL_DEFECT" && (
              <>
                {!isRotatingFlag || showFlagInRotation ? (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <circle cx="50" cy="50" r="25" fill="#FFFFFF" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <text
                      x="50"
                      y="50"
                      fontSize={calculateFontSize(
                        flagStandBoxWidth,
                        flagStandBoxHeight,
                        currentCustomText.length
                      )}
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      {currentCustomText}
                    </text>
                  </svg>
                )}
              </>
            )}
            {flagStandAction === "NOISE_FLAG" && (
              <svg
                viewBox="0 0 100 100"
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "auto",
                }}
                preserveAspectRatio="none"
              >
                <rect width="100" height="100" fill="#FFFF00" />
                <line
                  x1="0"
                  y1="100"
                  x2="100"
                  y2="0"
                  stroke="#000000"
                  strokeWidth="10"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
            {flagStandAction === "FIRE_FLAG" && (
              <svg
                viewBox="0 0 100 100"
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "auto",
                }}
                preserveAspectRatio="none"
              >
                <rect width="100" height="100" fill="#FFFF00" />
                <line
                  x1="0"
                  y1="100"
                  x2="100"
                  y2="0"
                  stroke="#FF0000"
                  strokeWidth="10"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
            {flagStandAction === "MECHANICAL_DEFECT" && (
              <svg
                viewBox="0 0 100 100"
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "auto",
                }}
                preserveAspectRatio="xMidYMid meet"
              >
                <rect width="100" height="100" fill="#000000" />
                <circle cx="50" cy="50" r="25" fill="#FFFFFF" />
              </svg>
            )}
            {flagStandAction === "BLACK_FLAG" && (
              <>
                {!isRotatingFlag || showFlagInRotation ? (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <text
                      x="50"
                      y="35"
                      fontSize="16"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      BLACK
                    </text>
                    <text
                      x="50"
                      y="65"
                      fontSize="16"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      FLAG
                    </text>
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <text
                      x="50"
                      y="50"
                      fontSize={calculateFontSize(
                        flagStandBoxWidth,
                        flagStandBoxHeight,
                        currentCustomText.length
                      )}
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      {currentCustomText}
                    </text>
                  </svg>
                )}
              </>
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
                    ? "hover:bg-gray-700 text-white text-lg flex items-center justify-center"
                    : action === "WHITE"
                    ? "bg-white hover:bg-gray-200 text-black text-lg flex items-center justify-center"
                    : action === "PASSING"
                    ? "hover:bg-gray-700 text-white text-lg flex items-center justify-center"
                    : action === "RULE_INFRINGEMENT"
                    ? "hover:bg-gray-700 text-white text-lg flex items-center justify-center"
                    : action === "NOISE_FLAG"
                    ? "hover:bg-gray-700 text-black text-lg flex items-center justify-center"
                    : action === "FIRE_FLAG"
                    ? "hover:bg-gray-700 text-black text-lg flex items-center justify-center"
                    : action === "MECHANICAL_DEFECT"
                    ? "hover:bg-gray-700 text-white text-lg flex items-center justify-center"
                    : action === "BLACK_FLAG"
                    ? "hover:bg-gray-700 text-white text-lg flex items-center justify-center"
                    : action === "CLEAR_FLAG_STAND"
                    ? "bg-gray-700 hover:bg-gray-600 text-white text-lg flex items-center justify-center"
                    : ""
                }
                style={{
                  borderRadius: 0,
                  width: "calc(50% - 6px)",
                  height: "96px",
                  minWidth: "140px",
                  maxWidth: "200px",
                  position: "relative",
                  overflow: "hidden",
                  background:
                    action === "CHEQUERED"
                      ? "#222"
                      : action === "PASSING"
                      ? "#0000FF"
                      : action === "RULE_INFRINGEMENT"
                      ? "#000"
                      : action === "NOISE_FLAG"
                      ? "#ffbf00"
                      : action === "FIRE_FLAG"
                      ? "#ffbf00"
                      : action === "MECHANICAL_DEFECT"
                      ? "#000"
                      : action === "BLACK_FLAG"
                      ? "#000"
                      : undefined,
                }}
                onClick={() => handleButton(action)}
              >
                {action === "CHEQUERED" && (
                  <img
                    src="/chequered.gif"
                    alt="Chequered"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      imageRendering: "pixelated",
                      opacity: 0.6,
                    }}
                  />
                )}
                {action === "PASSING" && (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: 0.7,
                    }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect width="100" height="100" fill="#0000FF" />
                    <circle cx="50" cy="50" r="25" fill="#ffbf00" />
                  </svg>
                )}
                {action === "RULE_INFRINGEMENT" && (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: 0.7,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke="#FFFFFF"
                      strokeWidth="10"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
                {action === "NOISE_FLAG" && (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: 0.7,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#ffbf00" />
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke="#000000"
                      strokeWidth="10"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
                {action === "FIRE_FLAG" && (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: 0.7,
                    }}
                    preserveAspectRatio="none"
                  >
                    <rect width="100" height="100" fill="#ffbf00" />
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke="#FF0000"
                      strokeWidth="10"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
                {action === "MECHANICAL_DEFECT" && (
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: 0.7,
                    }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect width="100" height="100" fill="#000000" />
                    <circle cx="50" cy="50" r="25" fill="#FFFFFF" />
                  </svg>
                )}
                {action === "BLACK_FLAG" && (
                  <svg
                    viewBox="0 0 200 100"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      left: 0,
                      opacity: 0.7,
                    }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect width="200" height="100" fill="#000000" />
                    <text
                      x="100"
                      y="35"
                      fontSize="32"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      BLACK
                    </text>
                    <text
                      x="100"
                      y="65"
                      fontSize="32"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="Arial, sans-serif"
                    >
                      FLAG
                    </text>
                  </svg>
                )}
                <div
                  className="flex flex-col items-center"
                  style={{ position: "relative", zIndex: 1 }}
                >
                  <span className="text-xl font-bold">
                    {action === "CHEQUERED"
                      ? "Chequered"
                      : action === "CLEAR_FLAG_STAND"
                      ? "Clear Flag Stand"
                      : action === "PASSING"
                      ? "Passing Flag"
                      : action === "RULE_INFRINGEMENT"
                      ? "Rule Infringement"
                      : action === "NOISE_FLAG"
                      ? "Noise Flag"
                      : action === "FIRE_FLAG"
                      ? "Fire Flag"
                      : action === "MECHANICAL_DEFECT"
                      ? "Mechanical Defect"
                      : action === "BLACK_FLAG"
                      ? "Black Flag"
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
      {/* Custom Text Modal */}
      {showTextModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={() => setShowTextModal(false)}
        >
          <div
            className="bg-gray-800 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: 0 }}
          >
            <h2 className="text-white text-2xl font-bold mb-4">
              Enter Text for{" "}
              {selectedFlag === "RULE_INFRINGEMENT"
                ? "Rule Infringement"
                : selectedFlag === "NOISE_FLAG"
                ? "Noise Flag"
                : selectedFlag === "FIRE_FLAG"
                ? "Fire Flag"
                : selectedFlag === "BLACK_FLAG"
                ? "Black Flag"
                : selectedFlag === "MECHANICAL_DEFECT"
                ? "Mechanical Defect"
                : "Flag"}
            </h2>

            {/* Input field */}
            <div className="mb-4">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTextSubmit();
                  }
                }}
                placeholder="e.g., V60"
                className="w-full bg-gray-700 text-white text-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderRadius: 0, textTransform: "uppercase" }}
                autoFocus
              />
            </div>

            {/* Last Entered Section */}
            {lastEnteredTexts.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white text-sm font-semibold">
                    Last Entered (Quick Select):
                  </h3>
                  <button
                    onClick={() => setLastEnteredTexts([])}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 text-xs font-bold"
                    style={{ borderRadius: 0 }}
                  >
                    Reset
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {lastEnteredTexts.map((text, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickSelect(text)}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 text-xl font-bold"
                      style={{ borderRadius: 0 }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleTextSubmit}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-6 py-3 text-lg font-bold"
                style={{ borderRadius: 0 }}
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowTextModal(false);
                  setCustomText("");
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 text-lg font-bold"
                style={{ borderRadius: 0 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LEDMaster;
