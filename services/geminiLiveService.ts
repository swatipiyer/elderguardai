import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION, AUDIO_SAMPLE_RATE_OUTPUT } from "../constants";
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from "./audioUtils";
import { AgentToolResponse } from "../types";

interface LiveSessionCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onAudioData: (audioBuffer: AudioBuffer) => void;
  onToolCall: (response: AgentToolResponse) => void;
  onError: (error: Error) => void;
}

export class GeminiLiveService {
  private client: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private isActive: boolean = false;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY not found in environment variables");
    }
    this.client = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async startSession(callbacks: LiveSessionCallbacks, outputAudioContext: AudioContext) {
    if (this.isActive) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create AudioContext without forcing sample rate (uses system default, e.g., 44100 or 48000)
      // This fixes issues where specific hardware fails to initialize at 16000Hz
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Ensure context is running (browsers often suspend it)
      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }

      // Capture actual sample rate to tell the API what we are sending
      const actualSampleRate = this.inputAudioContext.sampleRate;

      // Tool Definition
      const reportOutcomeTool: FunctionDeclaration = {
        name: 'report_outcome',
        description: 'Finalize the call assessment. Call this when you have determined if the caller is a scammer or legitimate.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, enum: ['scam', 'safe'], description: 'The final verdict.' },
            reason: { type: Type.STRING, description: 'A brief summary of why this decision was made.' },
            confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 100.' }
          },
          required: ['verdict', 'reason', 'confidence']
        }
      };

      const sessionPromise = this.client.live.connect({
        model: GEMINI_MODEL,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [reportOutcomeTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
          }
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            this.isActive = true;
            callbacks.onConnect();

            // Start Audio Streaming
            if (!this.inputAudioContext || !this.stream) return;
            
            this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
            this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
              if (!this.isActive) return;
              const inputData = e.inputBuffer.getChannelData(0);
              // Use actual sample rate in MIME type so the model processes it correctly
              const pcmBlob = createPcmBlob(inputData, actualSampleRate);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            this.inputSource.connect(this.processor);
            this.processor.connect(this.inputAudioContext.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Response
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const buffer = await decodeAudioData(
                base64ToUint8Array(audioData),
                outputAudioContext,
                AUDIO_SAMPLE_RATE_OUTPUT,
                1
              );
              callbacks.onAudioData(buffer);
            }

            // Handle Tool Calls (The "Brain" of the Scam detection)
            if (msg.toolCall) {
              for (const call of msg.toolCall.functionCalls) {
                if (call.name === 'report_outcome') {
                  const args = call.args as unknown as AgentToolResponse;
                  callbacks.onToolCall(args);
                  
                  // Acknowledge tool execution to model
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: call.id,
                        name: call.name,
                        response: { result: "Assessment Logged" }
                      }
                    });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Session Closed");
            callbacks.onDisconnect();
            this.cleanup();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            callbacks.onError(new Error("Connection error"));
            this.cleanup();
          }
        }
      });

      this.session = await sessionPromise;

    } catch (error) {
      console.error("Failed to start session:", error);
      callbacks.onError(error instanceof Error ? error : new Error("Unknown error"));
      this.cleanup();
    }
  }

  async stopSession() {
    if (this.session) {
        // Try closing cleanly if supported
        try {
            // @ts-ignore
            if(this.session.close) this.session.close();
        } catch (e) {
            console.warn("Could not strictly close session", e);
        }
    }
    this.cleanup();
  }

  private cleanup() {
    this.isActive = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.processor && this.inputSource) {
      this.inputSource.disconnect();
      this.processor.disconnect();
    }
    
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
  }
}

export const geminiLiveService = new GeminiLiveService();