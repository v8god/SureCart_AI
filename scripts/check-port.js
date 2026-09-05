const { execSync } = require("child_process");

try {
  const out = execSync("netstat -ano | findstr :3000", { encoding: "utf8" });
  console.log("Port 3000 listeners:\n", out);
} catch (e) {
  console.log("No process on port 3000 or error:", e.message);
}
