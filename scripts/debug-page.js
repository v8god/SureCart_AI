const http = require("http");

http.get("http://localhost:3000", (res) => {
  let data = "";
  console.log("Status Code:", res.statusCode);
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log("Response Body (first 1000 chars):");
    console.log(data.substring(0, 1000));
  });
}).on("error", (err) => {
  console.error("HTTP GET error:", err.message);
});
