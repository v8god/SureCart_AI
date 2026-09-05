const { execSync } = require("child_process");
const fs = require("fs");

try {
  const content = execSync("git --no-pager show 7e66432:src/app/page.tsx", { encoding: "utf8" });
  fs.writeFileSync("scripts/initial_page.tsx", content);
  console.log("Successfully wrote initial_page.tsx, length:", content.length);
} catch (e) {
  console.error("Error:", e.message);
}
