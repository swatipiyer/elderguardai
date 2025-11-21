
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import http from "http";

// --- Configuration ---
const PORT = process.env.PORT || 8080;
const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Error: API_KEY environment variable not set");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const client = new GoogleGenAI({ apiKey: API_KEY });

// --- Audio Transcoding Utils (Twilio 8kHz Mulaw <-> Gemini 24kHz PCM) ---

// Mu-law decoding table (simplified for performance)
const MU_LAW_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let sign = i & 0x80 ? -1 : 1;
  let exponent = (i >> 4) & 0x07;
  let mantissa = i & 0x0f;
  let sample = (((mantissa << 3) + 0x84) << exponent) - 0x84;
  MU_LAW_TABLE[i] = sign * sample;
}

function decodeMulaw(data: Buffer): Int16Array {
  const samples = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    samples[i] = MU_LAW_TABLE[data[i]];
  }
  return samples;
}

function encodeMulaw(pcmData: Int16Array): Buffer {
  const buffer = Buffer.alloc(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    let sample = pcmData[i];
    // Clamp
    if (sample < -32768) sample = -32768;
    if (sample > 32767) sample = 32767;
    
    const sign = (sample < 0) ? 0x80 : 0;
    if (sample < 0) sample = -sample;
    sample += 0x84;
    
    let exponent = 7;
    for (let exp = 0; exp < 8; exp++) {
        if (sample < (1 << (exp + 3))) {
            exponent = exp;
            break;
        }
    }
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    buffer[i] = ~(sign | (exponent << 4) | mantissa);
  }
  return buffer;
}

// Resampling (Simple Linear Interpolation / Decimation)
// Twilio (8kHz) -> Gemini (16kHz recommended for input)
function resample8kTo16k(input: Int16Array): Int16Array {
  const output = new Int16Array(input.length * 2);
  for (let i = 0; i < input.length; i++) {
    output[i * 2] = input[i];
    output[i * 2 + 1] = input[i]; // Zero-order hold (duplication) is often fine for speech
  }
  return output;
}

// Gemini (24kHz) -> Twilio (8kHz)
function resample24kTo8k(input: Int16Array): Int16Array {
  const output = new Int16Array(Math.floor(input.length / 3));
  for (let i = 0; i < output.length; i++) {
    output[i] = input[i * 3]; // Simple decimation
  }
  return output;
}

// --- Express Routes ---

// Twilio Webhook
app.post("/incoming", (req, res) => {
  const host = req.headers.host;
  res.type("text/xml");
  res.send(`
    <Response>
      <Say>Connecting you to Scam Guard AI. Please wait.</Say>
      <Connect>
        <Stream url="wss://${host}/media-stream" />
      </Connect>
    </Response>
  `);
});

// --- WebSocket Server ---

wss.on("connection", async (ws) => {
  console.log("New Twilio Connection");
  
  let streamSid = "";
  let geminiSession: any = null;

  // Connect to Gemini Live
  try {
    const sessionPromise = client.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: "You are ScamGuard. Analyze the caller. If scam, say 'Scam detected, hanging up' and call report_outcome tool.",
        tools: [{ 
            functionDeclarations: [{
                name: 'report_outcome',
                description: 'Report if the call is a scam or safe.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        verdict: { type: Type.STRING, enum: ['scam', 'safe'] }
                    },
                    required: ['verdict']
                }
            }] 
        }]
      },
      callbacks: {
        onopen: () => console.log("Gemini Connected"),
        onmessage: (msg: LiveServerMessage) => {
            // Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                const pcm24k = new Int16Array(Buffer.from(audioData, 'base64').buffer);
                const pcm8k = resample24kTo8k(pcm24k);
                const mulaw = encodeMulaw(pcm8k);
                
                const payload = {
                    event: "media",
                    streamSid: streamSid,
                    media: { payload: mulaw.toString("base64") }
                };
                ws.send(JSON.stringify(payload));
            }

            // Tool Handling (Hangup logic)
            if (msg.toolCall) {
                console.log("Tool Call:", msg.toolCall);
                // In a real app, you would log to Redis here
                // And then hang up Twilio
                // ws.close(); // Close Twilio connection
            }
        },
        onclose: () => console.log("Gemini Closed"),
        onerror: (e) => console.error("Gemini Error", e)
      }
    });
    
    geminiSession = await sessionPromise;

  } catch (e) {
    console.error("Failed to connect to Gemini", e);
    ws.close();
    return;
  }

  ws.on("message", (message) => {
    const msg = JSON.parse(message.toString());

    if (msg.event === "start") {
      streamSid = msg.start.streamSid;
      console.log(`Stream started: ${streamSid}`);
    } 
    else if (msg.event === "media") {
      if (geminiSession) {
        const mulaw = Buffer.from(msg.media.payload, "base64");
        const pcm8k = decodeMulaw(mulaw);
        const pcm16k = resample8kTo16k(pcm8k);
        
        // Convert to Float32 for Live API compatibility if needed, 
        // but checking the previous simulator code, we sent base64 PCM.
        // The Live API Node SDK expects base64 raw PCM.
        
        // Helper to create blob (Live API expects Base64 PCM string in inlineData)
        // We can send Int16 buffer directly if we specify mimeType correctly?
        // SDK `sendRealtimeInput` takes `Content` or `Blob`.
        
        const b64 = Buffer.from(pcm16k.buffer).toString("base64");
        
        geminiSession.sendRealtimeInput({
            media: {
                mimeType: "audio/pcm;rate=16000",
                data: b64
            }
        });
      }
    }
    else if (msg.event === "stop") {
      console.log("Stream stopped");
      geminiSession?.close();
    }
  });

  ws.on("close", () => {
    console.log("Twilio Disconnected");
    geminiSession?.close();
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
