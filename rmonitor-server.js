const dgram = require("dgram");
const { WebSocketServer } = require("ws");

// RMonitor UDP client configuration
const RMONITOR_HOST = process.env.RMONITOR_HOST || "127.0.0.1";
const RMONITOR_PORT = parseInt(process.env.RMONITOR_PORT) || 50000;
const WS_PORT = 8080;

// Create UDP socket for RMonitor
const udpClient = dgram.createSocket("udp4");

// Create WebSocket server for browser clients
const wss = new WebSocketServer({ port: WS_PORT });

let connectedClients = new Set();
let rmonitorConnected = false;
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

        // Heartbeat with race status: $F,<lapsToGo>,<timeToGo>,<timeOfDay>,<raceTime>,<flagStatus>
        const flagStatus = parts[5] ? parts[5].trim() : "Green";
        const lapsToGo = parts[1] || "0";

        raceStatus = {
          type: "RACE_STATUS",
          time: parts[4] || "0", // raceTime
          totalLaps: lapsToGo,
          flag: flagStatus.toUpperCase(),
          timeToGo: parts[2] || "",
          timeOfDay: parts[3] || "",
        };
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

// Handle incoming UDP messages from RMonitor
udpClient.on("message", (msg, rinfo) => {
  const parsed = parseRMonitorPacket(msg);
  if (parsed) {
    console.log("RMonitor message:", parsed.type);
    lastDataReceived = Date.now();

    // Clear and reset the timeout since we received data
    if (dataReceivedTimeout) {
      clearTimeout(dataReceivedTimeout);
      dataReceivedTimeout = null;
    }

    broadcastToClients(parsed);
  }
});

udpClient.on("error", (err) => {
  console.error("UDP client error:", err);
  rmonitorConnected = false;
  broadcastToClients({
    type: "CONNECTION_STATUS",
    connected: false,
    error: err.message,
  });
});

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

        // Bind to receive broadcasts
        udpClient.bind(port, () => {
          console.log(`Listening for RMonitor on port ${port}`);
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
              udpClient.close();
              udpClient.bind(); // Rebind to a new random port
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

        udpClient.close();
        udpClient.bind(); // Rebind to a new random port
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
