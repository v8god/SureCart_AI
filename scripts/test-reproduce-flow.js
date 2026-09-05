const { runAgentOrchestrator } = require("../src/lib/agent/orchestrator");

async function test() {
  const sessionId = "test_sess_1";
  const userMsg = "I want to order Aura Wireless Noise-Cancelling Earbuds from Croma (Infiniti Retail (Tata Group)) for ₹2,499.";
  console.log("Running orchestrator with message:", userMsg);

  try {
    const result = await runAgentOrchestrator(sessionId, userMsg, []);
    console.log("Orchestrator result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Orchestrator threw error:", err);
  }
}

test();
