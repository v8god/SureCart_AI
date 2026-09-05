const http = require("http");
const fs = require("fs");

const postData = JSON.stringify({
  sessionId: "test_repro_session_123",
  message: "I want to order Aura Wireless Noise-Cancelling Earbuds from Croma (Infiniti Retail (Tata Group)) for ₹2,499.",
  history: []
});

const req = http.request(
  {
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/chat",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  },
  (res) => {
    let rawData = "";
    res.on("data", (chunk) => {
      rawData += chunk;
    });
    res.on("end", () => {
      fs.writeFileSync("scripts/chat_response.json", rawData, "utf8");
      console.log("Written chat_response.json, length:", rawData.length);
      process.exit(0);
    });
  }
);

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();
