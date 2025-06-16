/* eslint-disable no-undef */
import { useEffect, useRef, useState } from "https://esm.sh/react";
import { createRoot } from "https://esm.sh/react-dom/client";

// -----  CONFIG  -----
const WS_URL = "ws://localhost:8080"; // <- change if needed
const CHEQUERED_GIF = "chequered.gif"; // 64×64 or whatever you have
// ---------------------

const COLORS = {
  CLEAR: "#000000",
  RED: "#FF0000",
  GREEN: "#00FF00",
  YELLOW: "#FFFF00",
  YELLOW_FLASH: "#FFFF00",
  WHITE: "#FFFFFF",
  CHEQUERED: null, // handled as a special case
  FORM_UP: "#00BFFF",
};

// --- helpers ---------------------------------------------------------------
const hexToRgb = (hex) => {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const rgbToHex = ([r, g, b]) =>
  "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");

const adjustBrightness = (hex, pct) => {
  if (hex === "#000000" || hex === null) return hex;
  const rgb = hexToRgb(hex).map((c) => Math.round((c * pct) / 100));
  return rgbToHex(rgb);
};
// ---------------------------------------------------------------------------

function SlaveDisplay() {
  const [state, setState] = useState({
    action: "CLEAR",
    brightness: 80,
    boxWidth: 40,
    boxHeight: 80,
  });

  const [flashOn, setFlashOn] = useState(false);
  const flashTimer = useRef(null);

  // Connect once
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setState((s) => ({ ...s, ...msg }));
      } catch (_) {
        /* ignore malformed messages */
      }
    };

    ws.onclose = () => {
      console.warn("WS closed – retrying in 2 s");
      setTimeout(() => window.location.reload(), 2000);
    };

    return () => ws.close();
  }, []);

  // Handle yellow flashing
  useEffect(() => {
    if (state.action === "YELLOW_FLASH") {
      flashTimer.current = setInterval(() => setFlashOn((f) => !f), 500);
    } else {
      clearInterval(flashTimer.current);
      setFlashOn(false);
    }
    return () => clearInterval(flashTimer.current);
  }, [state.action]);

  // Work out what colour/background we should show now
  const background = (() => {
    const { action, brightness } = state;

    if (action === "YELLOW_FLASH") {
      return flashOn ? COLORS.YELLOW : COLORS.CLEAR;
    }
    if (action === "CHEQUERED") return null; // will show GIF instead
    if (action === "FORM_UP") return "#000"; // black bg, text overlay

    return adjustBrightness(COLORS[action] || COLORS.CLEAR, brightness);
  })();

  return (
    <div
      id="screen"
      style={{
        width: state.boxWidth,
        height: state.boxHeight,
        background,
        imageRendering: "pixelated",
      }}
    >
      {/* Chequered flag (animated GIF covering the whole area) */}
      {state.action === "CHEQUERED" && (
        <img
          src={CHEQUERED_GIF}
          alt="Chequered"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* FORM UP text, centred & scaled */}
      {state.action === "FORM_UP" && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            fontWeight: "900",
            fontSize: `min(${state.boxHeight * 0.6}px, ${
              (state.boxWidth * 0.9) / 8
            }px)`,
            color: "#fff",
            letterSpacing: "0.08em",
            textShadow: "2px 2px 8px #000",
            userSelect: "none",
          }}
        >
          FORM&nbsp;UP
        </span>
      )}
    </div>
  );
}

// Mount ↓
createRoot(document.getElementById("root")).render(<SlaveDisplay />);
