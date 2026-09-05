const { execSync } = require("child_process");

try {
  console.log("Killing process on port 3000 (PID 3904)...");
  execSync("taskkill /F /PID 3904", { stdio: "inherit" });
  console.log("Killed PID 3904 successfully.");
} catch (e) {
  console.log("Error killing PID 3904 or already dead:", e.message);
}
