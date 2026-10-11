require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const SYSTEM_PROMPT = require("./src/utils/system-prompt");

(async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const stream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL,
    contents: [
      { role: "user", parts: [{ text: "Say hello in one sentence." }] }
    ],
    config: { systemInstruction: SYSTEM_PROMPT }
  });

  let full = "";
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      full += text;
      process.stdout.write(text);
    }
  }

  console.log("\n---DONE len=" + full.length);
})().catch((error) => {
  console.error("ERR:", error);
  process.exit(1);
});