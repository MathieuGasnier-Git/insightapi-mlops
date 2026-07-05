// Minimal stand-in for ml-service's FastAPI app, used only by the e2e test.
// Running the real model (MLflow/DagsHub download, scikit-learn inference)
// in CI would be slow and require external credentials, so this returns a
// fixed, deterministic response matching the real /predict contract.
const http = require("http");

const port = process.env.STUB_ML_PORT || 8010;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.method === "POST" && req.url === "/predict") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          sentiment: "positive",
          confidence: 0.87,
          model_version: "e2e-stub",
          model_stage: "Test",
        })
      );
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`stub ml-service listening on port ${port}`);
});
