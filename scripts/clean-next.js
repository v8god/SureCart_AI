const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");
if (fs.existsSync(nextDir)) {
  console.log("Removing corrupted .next cache directory...");
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log(".next cache removed successfully.");
} else {
  console.log(".next directory does not exist.");
}
