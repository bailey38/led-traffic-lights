const net = require("net");
const { WebSocketServer } = require("ws");

// RMonitor TCP client configuration
const RMONITOR_HOST = process.env.RMONITOR_HOST || "127.0.0.1";
const RMONITOR_PORT = parseInt(process.env.RMONITOR_PORT) || 50000;
const WS_PORT = 8080;

// Create WebSocket server for browser clients
const wss = new WebSocketServer({ port: WS_PORT });

let connectedClients = new Set();
let rmonitorConnected = false;
let tcpClient = null;
let lapData = {};
let raceStatus = {};
let dataReceivedTimeout = null;
let lastDataReceived = null;

// Parse RMonitor packet
function parseRMonitorPacket(buffer) {
  try {
    const message = buffer.toString("utf8").trim();

    // RMonitor uses $ as delimiter
    if (!message.startsWith("$")) return null;

    const parts = message.substring(1).split(",");
    if (parts.length < 2) return null;

    const messageType = parts[0];

    // Handle different message types
    switch (messageType) {
      case "COMP":
        // Competition info: $COMP,<description>,<type>,<practice/race>,<session time>
        return {
          type: "RACE_INFO",
          description: parts[1] || "",
          raceType: parts[2] || "",
          session: parts[3] || "",
          sessionTime: parts[4] || "",
        };

      case "RACE":
        // Race status: $RACE,<time>,<laps>,<flag>
        raceStatus = {
          type: "RACE_STATUS",
          time: parts[1] || "0",
          totalLaps: parts[2] || "0",
          flag: parts[3] || "GREEN",
        };
        return raceStatus;

      case "PASSING":
        // Passing info: $PASSING,<time>,<number>,<lap>,<position>
        const carNumber = parts[2];
        const lap = parseInt(parts[3]) || 0;
        const position = parseInt(parts[4]) || 0;

        if (!lapData[carNumber]) {
          lapData[carNumber] = {
            number: carNumber,
            laps: 0,
            position: 0,
            lastTime: null,
          };
        }

        lapData[carNumber].laps = lap;
        lapData[carNumber].position = position;
        lapData[carNumber].lastTime = parts[1];

        return {
          type: "PASSING",
          time: parts[1],
          number: carNumber,
          lap: lap,
          position: position,
          allLaps: lapData,
        };

      case "HEARTBEAT":
        // Heartbeat: $HEARTBEAT
        return { type: "HEARTBEAT" };

      case "F":
        // Heartbeat with race status: $F,<lapsToGo>,<timeToGo>,<timeOfDay>,<raceTime>,<flagStatus>
        // Remove quotes and trim the flag status
        const flagStatus = parts[5] ? parts[5].replace(/"/g, '').trim() : "Green";
        const lapsToGo = parts[1] || "0";

        raceStatus = {
          type: "RACE_STATUS",
          time: parts[4] ? parts[4].replace(/"/g, '') : "0", // raceTime
          totalLaps: lapsToGo,
          flag: flagStatus.toUpperCase(),
          timeToGo: parts[2] ? parts[2].replace(/"/g, '') : "",
          timeOfDay: parts[3] ? parts[3].replace(/"/g, '') : "",
        };
        console.log("Flag status:", flagStatus.toUpperCase());
        return raceStatus;

      default:
        return null;
    }
  } catch (error) {
    console.error("Error parsing RMonitor packet:", error);
    return null;
  }
}

// Broadcast to all connected WebSocket clients
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      client.send(message);
    }
  });
}

// WebSocket server for browser clients
wss.on("connection", (ws) => {
  console.log("Client connected");
  connectedClients.add(ws);

  // Send connection status
  ws.send(
    JSON.stringify({
      type: "CONNECTION_STATUS",
      connected: rmonitorConnected,
      host: RMONITOR_HOST,
      port: RMONITOR_PORT,
    })
  );

  // Send current lap data
  if (Object.keys(lapData).length > 0) {
    ws.send(
      JSON.stringify({
        type: "PASSING",
        allLaps: lapData,
      })
    );
  }

  // Send current race status
  if (raceStatus.type) {
    ws.send(JSON.stringify(raceStatus));
  }

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "CONNECT") {
        const host = data.host || RMONITOR_HOST;
        const port = data.port || RMONITOR_PORT;

        console.log(`Connecting to RMonitor at ${host}:${port}`);

        // Clear any existing timeout
        if (dataReceivedTimeout) {
          clearTimeout(dataReceivedTimeout);
          dataReceivedTimeout = null;
        }

        // Close existing socket if it exists
        if (tcpClient) {
          try {
            tcpClient.destroy();
          } catch (e) {
            // Ignore errors on close
          }
        }

        // Create new TCP socket
        tcpClient = new net.Socket();
        let buffer = "";

        // Set up data handler
        tcpClient.on("data", (data) => {
          buffer += data.toString("utf8");
          
          // Split by newlines to handle multiple messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          lines.forEach((line) => {
            if (line.trim()) {
              console.log("Raw message:", line.trim());
              const parsed = parseRMonitorPacket(Buffer.from(line.trim()));
              if (parsed) {
                console.log("RMonitor message:", parsed.type);
                lastDataReceived = Date.now();

                // Clear and reset the timeout since we received data
                if (dataReceivedTimeout) {
                  clearTimeout(dataReceivedTimeout);
                  dataReceivedTimeout = null;
                }

                // Broadcast to all connected clients
                broadcastToClients(parsed);
              }
            }
          });
        });

        tcpClient.on("error", (err) => {
          console.error("TCP client error:", err);
          rmonitorConnected = false;
          broadcastToClients({
            type: "CONNECTION_STATUS",
            connected: false,
            error: err.message,
          });
        });

        tcpClient.on("close", () => {
          console.log("TCP connection closed");
          rmonitorConnected = false;
          broadcastToClients({
            type: "CONNECTION_STATUS",
            connected: false,
          });
        });

        // Connect to RMonitor
        tcpClient.connect(port, host, () => {
          console.log(`Connected to RMonitor at ${host}:${port}`);
          rmonitorConnected = true;
          lastDataReceived = null;

          broadcastToClients({
            type: "CONNECTION_STATUS",
            connected: true,
            host: host,
            port: port,
          });

          // Start 10-second timeout to check for data
          dataReceivedTimeout = setTimeout(() => {
            if (!lastDataReceived) {
              console.log(
                "No data received from RMonitor within 10 seconds, disconnecting"
              );

              // Disconnect
              if (tcpClient) {
                try {
                  tcpClient.destroy();
                } catch (e) {
                  // Ignore errors
                }
                tcpClient = null;
              }
              rmonitorConnected = false;
              lapData = {};
              raceStatus = {};
              dataReceivedTimeout = null;
              lastDataReceived = null;

              broadcastToClients({
                type: "CONNECTION_STATUS",
                connected: false,
                error:
                  "No data received from RMonitor server within 10 seconds. Check if the server is broadcasting and the IP/port are correct.",
              });
            }
          }, 10000);
        });
      } else if (data.type === "DISCONNECT") {
        // Clear timeout on manual disconnect
        if (dataReceivedTimeout) {
          clearTimeout(dataReceivedTimeout);
          dataReceivedTimeout = null;
        }

        if (tcpClient) {
          try {
            tcpClient.destroy();
          } catch (e) {
            // Ignore errors
          }
          tcpClient = null;
        }
        rmonitorConnected = false;
        lapData = {};
        raceStatus = {};
        lastDataReceived = null;

        broadcastToClients({
          type: "CONNECTION_STATUS",
          connected: false,
        });
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    connectedClients.delete(ws);
  });
});

console.log(`WebSocket server listening on port ${WS_PORT}`);
console.log(
  `Ready to connect to RMonitor at ${RMONITOR_HOST}:${RMONITOR_PORT}`
);
