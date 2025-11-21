import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { geminiLiveService } from '../services/geminiLiveService';
import { CallLog, CallStatus, AgentToolResponse } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';

interface SimulatorProps {
  addCallLog: (log: CallLog) => void;
}

const Simulator: React.FC<SimulatorProps> = ({ addCallLog }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connected' | 'assessing' | 'finished'>('idle');
  const [assessment, setAssessment] = useState<AgentToolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio context management for output (AI voice) visualization
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isConnected) {
        handleHangUp();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAudio = async () => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: AUDIO_SAMPLE_RATE_OUTPUT,
      });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination); // Connect to speakers
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    }

    // Ensure output context is running (critical for mobile/newer chrome)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }
  };

  const handleStartCall = async () => {
    setError(null);
    setAssessment(null);
    
    // Initialize output audio first (requires user gesture)
    await initializeAudio();

    if (!audioContextRef.current) return;

    setStatus('connected');
    
    try {
      await geminiLiveService.startSession({
        onConnect: () => setIsConnected(true),
        onDisconnect: () => {
            setIsConnected(false);
            setStatus('idle');
        },
        onError: (e) => {
          setError(e.message);
          setIsConnected(false);
          setStatus('idle');
        },
        onAudioData: (buffer) => {
            // Queue audio for gapless playback
            if (!audioContextRef.current || !analyserRef.current) return;
            
            const ctx = audioContextRef.current;
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(analyserRef.current);

            const currentTime = ctx.currentTime;
            // Ensure we don't schedule in the past
            const startTime = Math.max(nextStartTimeRef.current, currentTime);
            source.start(startTime);
            
            nextStartTimeRef.current = startTime + buffer.duration;
        },
        onToolCall: (response) => {
            setAssessment(response);
            setStatus('finished');
            
            const newLog: CallLog = {
                id: Math.random().toString(36).substring(7),
                callerId: "Unknown (Simulated)",
                timestamp: Date.now(),
                duration: Math.floor(Math.random() * 60) + 30,
                status: response.verdict === 'scam' ? CallStatus.SCAM_DETECTED : CallStatus.LEGITIMATE,
                summary: response.reason,
                confidenceScore: response.confidence
            };
            addCallLog(newLog);

            // Auto hangup after decision (simulating system logic)
            setTimeout(() => handleHangUp(), 4000); // Wait a bit so user can read
        }
      }, audioContextRef.current);
    } catch (e) {
      console.error(e);
      setError("Failed to access microphone or connect to API. Please check permissions.");
      setStatus('idle');
    }
  };

  const handleHangUp = () => {
    geminiLiveService.stopSession();
    setIsConnected(false);
    setStatus('idle');
    // Reset audio timing
    nextStartTimeRef.current = 0;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Live Call Simulator</h2>
            <p className="text-sm text-gray-400">Roleplay as a caller to test the AI Guardian</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
          {isConnected ? 'LIVE RECORDING' : 'OFFLINE'}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 flex flex-col items-center justify-center min-h-[300px] relative">
        
        {/* Status Indicator / Avatar */}
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${
          status === 'connected' ? 'bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.3)]' :
          status === 'finished' ? (assessment?.verdict === 'scam' ? 'bg-red-500/10' : 'bg-green-500/10') :
          'bg-gray-800'
        }`}>
            {status === 'idle' && <Shield className="w-12 h-12 text-gray-500" />}
            {status === 'connected' && <Activity className="w-12 h-12 text-blue-400 animate-pulse" />}
            {status === 'finished' && assessment?.verdict === 'scam' && <AlertTriangle className="w-12 h-12 text-red-500" />}
            {status === 'finished' && assessment?.verdict === 'safe' && <CheckCircle className="w-12 h-12 text-green-500" />}
        </div>

        {/* Visualizer */}
        <div className="w-full max-w-md mb-8">
            <AudioVisualizer isActive={isConnected} analyser={analyserRef.current} />
        </div>

        {/* Action Info */}
        <div className="text-center mb-8 space-y-2">
            {status === 'idle' && (
                <p className="text-gray-400">Press start to simulate an incoming call. <br/> You will play the role of the caller.</p>
            )}
            {status === 'connected' && (
                <p className="text-blue-400 font-medium animate-pulse">AI is listening... Speak now.</p>
            )}
            {status === 'finished' && assessment && (
                <div className={`p-4 rounded-lg border ${assessment.verdict === 'scam' ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/50 bg-green-500/10'}`}>
                    <h3 className={`text-lg font-bold ${assessment.verdict === 'scam' ? 'text-red-400' : 'text-green-400'}`}>
                        {assessment.verdict.toUpperCase()} DETECTED
                    </h3>
                    <p className="text-gray-300 mt-1">{assessment.reason}</p>
                    <p className="text-xs text-gray-500 mt-2">Confidence: {assessment.confidence}%</p>
                </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Controls */}
        <div className="flex gap-4">
            {!isConnected ? (
                <button 
                    onClick={handleStartCall}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-green-900/20"
                >
                    <Phone className="w-5 h-5" />
                    Simulate Incoming Call
                </button>
            ) : (
                <button 
                    onClick={handleHangUp}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-900/20"
                >
                    <PhoneOff className="w-5 h-5" />
                    End Call
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default Simulator;