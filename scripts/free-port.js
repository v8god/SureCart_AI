const { execSync } = require("child_process");

function freePort(port) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const lines = stdout.trim().split("\n");
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid) && pid !== "0") {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      console.log(`Killing process on port ${port} (PID ${pid})...`);
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`Killed PID ${pid}.`);
      } catch (e) {
        console.log(`Could not kill PID ${pid}: ${e.message}`);
      }
    }
    if (pids.size === 0) {
      console.log(`Port ${port} is clean.`);
    }
  } catch (e) {
    console.log(`Port ${port} is clean (no process listening).`);
  }
}

freePort(3000);
freePort(3001);
freePort(3002);
