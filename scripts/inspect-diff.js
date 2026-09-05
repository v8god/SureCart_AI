const { execSync } = require("child_process");
const fs = require("fs");

try {
  const diff = execSync("git diff origin/main src/app/page.tsx src/components/ChatPanel.tsx", { encoding: "utf8" });
  fs.writeFileSync("scripts/diff_output.txt", diff);
  console.log("Diff written, length:", diff.length);
} catch (e) {
  console.error("Error running git diff:", e.message);
}
