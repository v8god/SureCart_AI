const http = require("http");

http.get("http://localhost:3000", (res) => {
  console.log(`Server responded with status: ${res.statusCode}`);
  process.exit(0);
}).on("error", (err) => {
  console.log(`Server not responding yet: ${err.message}`);
  process.exit(1);
});
