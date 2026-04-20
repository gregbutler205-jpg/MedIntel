// ─────────────────────────────────────────────────────────────────────────────
// Insina Health — Anthropic API Proxy
// Node.js / Express — deploy to Render (free tier)
//
// Responsibilities:
//  • Accepts POST /api/chat from the browser
//  • Forwards the request to Anthropic's messages API with SSE streaming
//  • Pipes the raw SSE stream back to the browser unchanged
//  • Zero-logging: no request body, no health data, no API key fragments stored
//  • Rate limiting: 20 requests per IP per hour
//  • CORS: restricted to the GitHub Pages origin
// ─────────────────────────────────────────────────────────────────────────────

import express           from "express";
import cors              from "cors";
import rateLimit         from "express-rate-limit";
import fetch             from "node-fetch";
import { createServer }  from "http";

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the GitHub Pages origin. Add localhost for local dev.
const ALLOWED_ORIGINS = [
  "https://gregb555.github.io",   // production GitHub Pages
  "http://localhost:5173",        // Vite dev server
  "http://localhost:4173",        // Vite preview
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server) only in dev
    if (!origin && process.env.NODE_ENV !== "production") return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("CORS: origin not allowed"));
  },
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "256kb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// 20 requests per hour per IP. Returns 429 when limit hit.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. You may send 20 AI requests per hour. Please try again later." },
  // Zero-logging: do not log IP in errors
  skip: () => false,
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Main proxy endpoint ────────────────────────────────────────────────────────
app.post("/api/chat", limiter, async (req, res) => {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server configuration error: missing API key." });
  }

  // Validate request shape — must have model + messages, nothing else needed
  const { model, max_tokens, system, messages, stream } = req.body;

  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: model and messages are required." });
  }

  // Only allow approved models
  const ALLOWED_MODELS = [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
  ];
  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: "Requested model is not permitted." });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        // Prompt caching beta header — required for cache_control blocks
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(max_tokens || 1024, 4096), // cap at 4096
        stream: true,
        system,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      // Forward the error status and body without logging content
      const errBody = await anthropicRes.text().catch(() => "{}");
      return res.status(anthropicRes.status).send(errBody);
    }

    // ── Stream passthrough ──────────────────────────────────────────────────
    // Pipe raw SSE bytes from Anthropic directly to the browser.
    // The browser's existing stream reader requires no changes.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering on Render

    anthropicRes.body.pipe(res);

    // Clean up if client disconnects mid-stream
    req.on("close", () => {
      anthropicRes.body.destroy();
    });

  } catch (err) {
    // Zero-logging: do NOT log err.message as it may contain request data
    if (!res.headersSent) {
      res.status(502).json({ error: "Upstream connection error." });
    }
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
createServer(app).listen(PORT, () => {
  console.log(`Insina proxy running on port ${PORT}`);
});
