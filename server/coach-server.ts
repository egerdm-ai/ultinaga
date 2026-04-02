import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "512kb" }));

app.post("/api/coach", async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    res.status(503).json({ error: "OPENAI_API_KEY not set" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const system =
    "You are a mixed ultimate frisbee coach assistant. You ONLY comment on the legally computed line recommendations provided in JSON. Never invent player rosters or claim someone can play if they violated consecutive rules. Be concise: three short sections: (1) why the best line fits, (2) underplayed players warning, (3) coaching advice for the next point. Plain text.";
  const user = JSON.stringify(body, null, 2);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      res.status(502).json({ error: errText });
      return;
    }
    const data = (await r.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    res.json({
      explanation: text,
      underplayedWarnings: "",
      coachingAdvice: "",
    });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Coach request failed",
    });
  }
});

const port = Number(process.env.COACH_PORT ?? 8787);
app.listen(port, () => {
  console.log(`Coach server on http://127.0.0.1:${port}`);
});
