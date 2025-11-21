
import React from 'react';
import { Server, Copy, Check, Terminal, Globe, Phone } from 'lucide-react';

const SERVER_CODE = `import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import http from "http";

const PORT = process.env.PORT || 8080;
const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";
const API_KEY = process.env.API_KEY;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const client = new GoogleGenAI({ apiKey: API_KEY });

// Twilio Webhook
app.post("/incoming", (req, res) => {
  const host = req.headers.host;
  res.type("text/xml");
  res.send(\`
    <Response>
      <Say>Connecting to ScamGuard AI...</Say>
      <Connect><Stream url="wss://\${host}/media-stream" /></Connect>
    </Response>
  \`);
});

// WebSocket Handler (Audio Bridge)
wss.on("connection", async (ws) => {
  // Connection logic to bridge Twilio <-> Gemini
  // See backend/twilio-server.ts for full transcoding implementation
});

server.listen(PORT, () => console.log(\`Listening on \${PORT}\`));`;

const ProductionGuide: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    // In a real scenario we would copy the full file content
    navigator.clipboard.writeText(SERVER_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
                <Server className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Go Live with Twilio</h2>
        </div>
        <p className="text-gray-400 text-lg max-w-3xl">
          To connect a real phone number, you need to deploy a backend server that bridges the Twilio telephony network with the Gemini Live API.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Instructions */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Step 1 */}
          <div className="relative pl-8 border-l-2 border-gray-800">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-gray-950"></div>
            <h3 className="text-lg font-semibold text-white mb-2">1. Get the Server Code</h3>
            <p className="text-gray-400 text-sm mb-4">
              We have generated a complete Node.js server for you in the file 
              <code className="mx-1 px-1.5 py-0.5 bg-gray-800 rounded text-blue-300 font-mono text-xs">backend/twilio-server.ts</code>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative pl-8 border-l-2 border-gray-800">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 border-4 border-gray-950"></div>
            <h3 className="text-lg font-semibold text-white mb-2">2. Deploy Server</h3>
            <p className="text-gray-400 text-sm mb-3">
              Deploy the code to a service like Render, Fly.io, or Heroku.
            </p>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Environment Variables</p>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-300">API_KEY</span>
                  <span className="text-gray-500">Your Gemini Key</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">PORT</span>
                  <span className="text-gray-500">8080</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative pl-8 border-l-2 border-gray-800">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-600 border-4 border-gray-950"></div>
            <h3 className="text-lg font-semibold text-white mb-2">3. Configure Twilio</h3>
            <p className="text-gray-400 text-sm mb-3">
              In your Twilio Console, set the Voice Webhook for your phone number.
            </p>
            <div className="p-3 bg-black rounded border border-gray-800 font-mono text-xs text-gray-300 break-all">
              https://your-app-url.com/incoming
            </div>
          </div>

        </div>

        {/* Right Column: Code Preview */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">backend/twilio-server.ts</span>
              </div>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-black/50">
              <pre className="font-mono text-xs text-blue-100 leading-relaxed">
                {`// FULL IMPLEMENTATION IS IN backend/twilio-server.ts

import { GoogleGenAI } from "@google/genai";
import WebSocket from "ws";
import express from "express";

// 1. Transcoding (G.711 Mulaw <-> PCM 16kHz)
// Twilio sends 8kHz Mulaw. Gemini wants 16kHz+ PCM.
function decodeMulaw(buffer) { /* ... bitwise decompression ... */ }
function encodeMulaw(buffer) { /* ... bitwise compression ... */ }

// 2. WebSocket Bridge
wss.on("connection", async (ws) => {
  const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Connect to Gemini Live
  const session = await client.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    callbacks: {
      onmessage: (msg) => {
        // Receive Audio from Gemini -> Transcode -> Send to Twilio
        const pcm = msg.serverContent.modelTurn.parts[0].inlineData.data;
        const mulaw = encodeMulaw(pcm);
        ws.send(JSON.stringify({ event: "media", media: { payload: mulaw } }));
      }
    }
  });

  // Receive Audio from Twilio -> Transcode -> Send to Gemini
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.event === "media") {
      const pcm = decodeMulaw(msg.media.payload);
      session.sendRealtimeInput({ media: { data: pcm, mimeType: "audio/pcm" } });
    }
  });
});`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionGuide;
