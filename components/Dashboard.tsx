
import React, { useState, useEffect } from 'react';
import { ShieldAlert, PhoneForwarded, PhoneOff, BarChart3, Database, Rocket } from 'lucide-react';
import StatsCard from './StatsCard';
import { CallLog, CallStatus, DashboardStats } from '../types';
import Simulator from './Simulator';
import ProductionGuide from './ProductionGuide';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const MOCK_INITIAL_LOGS: CallLog[] = [
  { id: '1', callerId: '+1 (555) 012-3456', timestamp: Date.now() - 3600000, duration: 45, status: CallStatus.SCAM_DETECTED, summary: "Caller claimed to be IRS demanding gift cards.", confidenceScore: 98 },
  { id: '2', callerId: '+1 (555) 987-6543', timestamp: Date.now() - 7200000, duration: 120, status: CallStatus.LEGITIMATE, summary: "Caller identified as Dr. Smith's office confirming appointment.", confidenceScore: 95 },
  { id: '3', callerId: '+1 (555) 456-7890', timestamp: Date.now() - 86400000, duration: 15, status: CallStatus.SCAM_DETECTED, summary: "Robocall about car warranty extension.", confidenceScore: 99 },
];

const Dashboard: React.FC = () => {
  const [logs, setLogs] = useState<CallLog[]>(MOCK_INITIAL_LOGS);
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 142,
    scamsBlocked: 89,
    callsForwarded: 53,
    avgThreatLevel: 62
  });

  const [view, setView] = useState<'dashboard' | 'simulator' | 'architecture' | 'production'>('dashboard');

  const addCallLog = (log: CallLog) => {
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs);
    
    // Update mock stats
    setStats(prev => ({
      totalCalls: prev.totalCalls + 1,
      scamsBlocked: log.status === CallStatus.SCAM_DETECTED ? prev.scamsBlocked + 1 : prev.scamsBlocked,
      callsForwarded: log.status === CallStatus.LEGITIMATE ? prev.callsForwarded + 1 : prev.callsForwarded,
      avgThreatLevel: prev.avgThreatLevel // Simplified
    }));
  };

  // Chart Data
  const chartData = [
    { name: 'Mon', scams: 12, legitimate: 8 },
    { name: 'Tue', scams: 19, legitimate: 12 },
    { name: 'Wed', scams: 15, legitimate: 10 },
    { name: 'Thu', scams: 22, legitimate: 9 },
    { name: 'Fri', scams: 21, legitimate: 14 },
    { name: 'Sat', scams: 8, legitimate: 5 },
    { name: 'Sun', scams: 5, legitimate: 3 },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar / Nav */}
      <nav className="fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6 hidden md:block z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ScamGuard AI</h1>
        </div>

        <div className="space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setView('simulator')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'simulator' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <PhoneForwarded className="w-5 h-5" />
            Call Simulator
          </button>
          <button 
            onClick={() => setView('architecture')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'architecture' ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <Database className="w-5 h-5" />
            Architecture
          </button>
          <button 
            onClick={() => setView('production')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'production' ? 'bg-green-600/10 text-green-400' : 'hover:bg-gray-800 text-gray-400'}`}
          >
            <Rocket className="w-5 h-5" />
            Go Live
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Redis Connection</h4>
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Connected
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-8 min-h-screen">
        {/* Top Bar Mobile */}
        <div className="md:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-blue-500" />
                <h1 className="text-xl font-bold">ScamGuard</h1>
            </div>
        </div>

        {view === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <header>
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              <p className="text-gray-400">Real-time call monitoring and threat detection statistics.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard 
                title="Calls Screened" 
                value={stats.totalCalls} 
                change="+12%" 
                trend="up" 
                icon={PhoneForwarded} 
                colorClass="bg-blue-500" 
              />
              <StatsCard 
                title="Scams Blocked" 
                value={stats.scamsBlocked} 
                change="+5%" 
                trend="up" 
                icon={ShieldAlert} 
                colorClass="bg-green-500" 
              />
              <StatsCard 
                title="Rejected Calls" 
                value={stats.totalCalls - stats.callsForwarded} 
                icon={PhoneOff} 
                colorClass="bg-red-500" 
              />
              <StatsCard 
                title="Avg Threat Score" 
                value={`${stats.avgThreatLevel}/100`} 
                change="-2%" 
                trend="down" 
                icon={BarChart3} 
                colorClass="bg-orange-500" 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Section */}
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Threat Activity (Last 7 Days)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                      <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} 
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="scams" name="Scams" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="legitimate" name="Safe" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Logs Section */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Logs</h3>
                <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-mono text-gray-300">{log.callerId}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.status === CallStatus.SCAM_DETECTED 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {log.status === CallStatus.SCAM_DETECTED ? 'SCAM' : 'SAFE'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(log.timestamp).toLocaleTimeString()} • {log.duration}s
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {log.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'simulator' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <header className="mb-8">
              <h2 className="text-2xl font-bold text-white">Call Simulator</h2>
              <p className="text-gray-400">Test the AI agent logic by simulating an incoming call.</p>
            </header>
            <Simulator addCallLog={addCallLog} />
          </div>
        )}

        {view === 'architecture' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
             <header className="mb-8">
              <h2 className="text-2xl font-bold text-white">System Architecture</h2>
              <p className="text-gray-400">How the production system works (The Blueprint).</p>
            </header>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-8">
                {/* Diagram Step 1 */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">1</div>
                        <div className="w-0.5 h-full bg-gray-800 my-2"></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">User Calls Twilio Number</h3>
                        <p className="text-gray-400 mt-1">The PSTN call hits the Twilio Voice API. A Webhook is triggered to your backend server.</p>
                        <div className="mt-3 p-3 bg-black rounded-lg font-mono text-xs text-green-400 border border-gray-700">
                            POST https://api.scamguard.com/incoming
                        </div>
                    </div>
                </div>

                {/* Diagram Step 2 */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">2</div>
                        <div className="w-0.5 h-full bg-gray-800 my-2"></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Media Stream > Gemini AI</h3>
                        <p className="text-gray-400 mt-1">
                            Server upgrades HTTP to WebSocket. Audio is streamed bidirectionally between Twilio and Gemini Live API.
                            The AI (System Instruction: "Scam Detector") engages the caller.
                        </p>
                        <div className="mt-3 p-3 bg-black rounded-lg font-mono text-xs text-purple-400 border border-gray-700">
                            Audio Transcoding: Mulaw (8k) ↔ PCM (16k)
                        </div>
                    </div>
                </div>

                {/* Diagram Step 3 */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold">3</div>
                        <div className="w-0.5 h-full bg-gray-800 my-2"></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Decision & Redis Logging</h3>
                        <p className="text-gray-400 mt-1">
                            Gemini triggers a Function Call <code>report_outcome(verdict)</code>. 
                            The backend captures this, stores metadata in Redis for future training, and hangs up (if scam) or forwards (if safe).
                        </p>
                        <div className="mt-3 p-3 bg-black rounded-lg font-mono text-xs text-blue-400 border border-gray-700">
                            redis.set(`call:${'{uuid}'}`, JSON.stringify(verdict));
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {view === 'production' && (
          <ProductionGuide />
        )}

      </main>
    </div>
  );
};

export default Dashboard;
