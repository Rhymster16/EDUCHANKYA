import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Repository } from './components/Repository';
import { ViewState, UserProfile, LearningPath, Candidate, Idea, Institution } from './types';
import { db } from './services/db';
import { initializeGemini, checkApiKey, generateCurriculum, generateCandidateBio, analyzeIdeaSkills, chatWithAssistant } from './services/gemini';

// --- Login Component ---
const LoginScreen = ({ onLogin, onOpenConsole }: { onLogin: (user: UserProfile) => void, onOpenConsole: () => void }) => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedInst, setSelectedInst] = useState('');
    
    // Login State
    const [loginId, setLoginId] = useState('');
    
    // Registration State
    const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'registerInst'>('login');
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    
    // Institute Registration
    const [newInstName, setNewInstName] = useState('');
    const [newInstDomain, setNewInstDomain] = useState('');

    useEffect(() => {
        const fetchInst = async () => {
            const data = await db.getInstitutions();
            setInstitutions(data);
            if (data.length > 0 && !selectedInst) setSelectedInst(data[0].id);
        };
        fetchInst();
    }, []);

    const handleLogin = async () => {
        if (!selectedInst) return alert("Select an Institution");
        if (!loginId) return alert("Enter User ID or Name");

        const user = await db.login(selectedInst, loginId);
        if (user) {
            onLogin(user);
        } else {
            alert('User not found. Try "u1" for IIT Bombay, or Sign Up to create a new user.');
        }
    };

    const handleStudentSignUp = async () => {
        if (!selectedInst || !newName || !newEmail) return alert("All fields are required");
        
        const newUser = await db.createUser({
            institutionId: selectedInst,
            name: newName,
            email: newEmail,
            role: 'Student',
            avatar: '' // generated in db
        });
        
        onLogin(newUser);
    };

    const handleRegisterInstitute = async () => {
        if (!newInstName || !newInstDomain || !newName) return alert("All fields are required");
        
        // 1. Create Institute
        const inst = await db.registerInstitution(newInstName, newInstDomain);
        
        // 2. Create Admin/Faculty User automatically
        const adminUser = await db.createUser({
            institutionId: inst.id,
            name: newName,
            email: `admin@${newInstDomain}`,
            role: 'Faculty',
            avatar: ''
        });

        // 3. Login
        onLogin(adminUser);
    };

    return (
        <div className="min-h-screen bg-edu-dark flex flex-col items-center justify-center p-4 relative">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto flex items-center justify-center text-white text-xl font-bold mb-4">E</div>
                    <h1 className="text-2xl font-bold text-white">EduChanakya</h1>
                    <p className="text-slate-400">Virtual College OS</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
                    <button 
                        onClick={() => setActiveTab('login')}
                        className={`flex-1 py-2 text-xs font-bold rounded ${activeTab === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => setActiveTab('signup')}
                        className={`flex-1 py-2 text-xs font-bold rounded ${activeTab === 'signup' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Student Sign Up
                    </button>
                    <button 
                        onClick={() => setActiveTab('registerInst')}
                        className={`flex-1 py-2 text-xs font-bold rounded ${activeTab === 'registerInst' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        New Campus
                    </button>
                </div>

                {/* LOGIN FORM */}
                {activeTab === 'login' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Select Campus</label>
                            <select 
                                value={selectedInst} 
                                onChange={(e) => setSelectedInst(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500"
                            >
                                <option value="" disabled>Choose Institution</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">User ID or Name</label>
                            <input 
                                type="text" 
                                value={loginId} 
                                onChange={(e) => setLoginId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500"
                                placeholder="Enter ID provided by admin"
                            />
                        </div>
                        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">
                            Enter Campus
                        </button>
                    </div>
                )}

                {/* SIGN UP FORM */}
                {activeTab === 'signup' && (
                    <div className="space-y-4">
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Join Campus</label>
                            <select 
                                value={selectedInst} 
                                onChange={(e) => setSelectedInst(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 outline-none"
                            >
                                <option value="" disabled>Choose Institution</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                        <input 
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 outline-none"
                            placeholder="Full Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <input 
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 outline-none"
                            placeholder="Email Address"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <button onClick={handleStudentSignUp} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg">
                            Create Student ID & Login
                        </button>
                    </div>
                )}

                {/* REGISTER INSTITUTE FORM */}
                {activeTab === 'registerInst' && (
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <h3 className="text-white text-sm font-bold mb-2">Campus Details</h3>
                            <input 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 mb-2 text-sm"
                                placeholder="Institute Name (e.g. MIT Virtual)"
                                value={newInstName}
                                onChange={(e) => setNewInstName(e.target.value)}
                            />
                            <input 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm"
                                placeholder="Domain (e.g. mit.edu)"
                                value={newInstDomain}
                                onChange={(e) => setNewInstDomain(e.target.value)}
                            />
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <h3 className="text-white text-sm font-bold mb-2">Administrator Details</h3>
                            <input 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm"
                                placeholder="Your Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <button onClick={handleRegisterInstitute} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg">
                            Launch Campus & Login
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-8 text-center space-y-2 z-10">
                <p className="text-slate-500 text-xs">Protected by EduChanakya Secure Gateway</p>
                <button 
                    onClick={onOpenConsole}
                    className="text-[10px] text-slate-600 hover:text-blue-500 font-mono border-b border-dashed border-slate-700 pb-0.5 transition-colors"
                >
                    [ Access Developer Cloud Console ]
                </button>
            </div>
        </div>
    );
};

// --- Chat Assistant ---
const ChatWidget = ({ user }: { user: UserProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, parts: m.text })); 
            const response = await chatWithAssistant(userMsg, history);
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting to the global network." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-80 h-96 mb-4 flex flex-col overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            EduChanakya Assistant
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/90">
                        {messages.length === 0 && (
                            <p className="text-xs text-slate-500 text-center mt-10">
                                Ask me about learning resources, certifications, or help with your projects. I search the world for you.
                            </p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                    m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="text-slate-500 text-xs">EduChanakya is thinking...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 bg-slate-800 border-t border-slate-700 flex">
                        <input 
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-l-lg px-3 text-sm text-white focus:outline-none"
                            placeholder="Ask global resources..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={handleSend} className="bg-blue-600 text-white px-3 rounded-r-lg hover:bg-blue-500">
                            →
                        </button>
                    </div>
                </div>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </button>
        </div>
    );
};

// --- Backend Console (Full Screen) ---
const BackendConsole = ({ onExit }: { onExit: () => void }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'db' | 'auth' | 'logs'>('overview');
    const [logs, setLogs] = useState<string[]>([]);
    const [rawKey, setRawKey] = useState('educhanakya_projects');
    const [rawData, setRawData] = useState<any[]>([]);

    useEffect(() => {
        return db.subscribeLogs((newLogs) => setLogs(newLogs));
    }, []);

    useEffect(() => {
        if (activeTab === 'db' || activeTab === 'auth') {
            const data = db.getRawData(rawKey);
            setRawData(data);
        }
    }, [activeTab, rawKey, logs]); // Updates when logs update (data changes)

    const ConsoleNavItem = ({ id, label, icon }: any) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
        >
            {icon}
            <span className="font-mono text-sm">{label}</span>
        </button>
    );

    return (
        <div className="h-screen bg-black text-slate-200 flex flex-col overflow-hidden">
            {/* Console Header */}
            <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950">
                <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center font-bold text-white text-xs">C</div>
                    <span className="font-mono text-sm font-bold text-slate-300">EduCloud Platform Console</span>
                    <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-400">us-central-1</span>
                </div>
                <button 
                    onClick={onExit}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-700 flex items-center"
                >
                    <span className="mr-2">←</span> Return to App
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Console Sidebar */}
                <div className="w-64 bg-slate-950 border-r border-slate-800 p-4 space-y-1">
                    <ConsoleNavItem id="overview" label="Overview" icon={<span className="text-lg">📊</span>} />
                    <ConsoleNavItem id="db" label="Firestore DB" icon={<span className="text-lg">🗄️</span>} />
                    <ConsoleNavItem id="auth" label="Authentication" icon={<span className="text-lg">🔐</span>} />
                    <ConsoleNavItem id="logs" label="System Logs" icon={<span className="text-lg">📜</span>} />
                </div>

                {/* Console Main */}
                <div className="flex-1 p-6 overflow-y-auto bg-black">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white mb-4">Project Overview</h2>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                                    <p className="text-xs text-slate-500 uppercase">Status</p>
                                    <p className="text-green-500 font-bold">● Healthy</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                                    <p className="text-xs text-slate-500 uppercase">Uptime</p>
                                    <p className="text-white font-bold">99.99%</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                                    <p className="text-xs text-slate-500 uppercase">Active Connections</p>
                                    <p className="text-blue-400 font-bold">3</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded">
                                    <p className="text-xs text-slate-500 uppercase">Last Deploy</p>
                                    <p className="text-slate-300 font-mono text-xs">2 mins ago</p>
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded h-64 flex items-center justify-center text-slate-600 font-mono text-sm">
                                [ Traffic Visualization Placeholder ]
                            </div>
                        </div>
                    )}

                    {activeTab === 'db' && (
                        <div className="h-full flex flex-col">
                            <div className="flex space-x-2 mb-4">
                                {['educhanakya_projects', 'educhanakya_candidates', 'educhanakya_ideas', 'educhanakya_learning', 'educhanakya_institutions'].map(k => (
                                    <button 
                                        key={k} 
                                        onClick={() => setRawKey(k)} 
                                        className={`px-3 py-1 text-xs rounded border ${rawKey === k ? 'bg-blue-900/50 border-blue-500 text-blue-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                                    >
                                        {k.replace('educhanakya_', '')}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 border border-slate-800 rounded bg-slate-900 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-mono sticky top-0">
                                        <tr>
                                            <th className="p-3 border-b border-slate-800">ID</th>
                                            <th className="p-3 border-b border-slate-800">Data Preview</th>
                                            <th className="p-3 border-b border-slate-800 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono text-xs text-slate-300">
                                        {rawData.map((item: any) => (
                                            <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                <td className="p-3 text-blue-400">{item.id}</td>
                                                <td className="p-3 opacity-80 truncate max-w-xl">{JSON.stringify(item)}</td>
                                                <td className="p-3 text-right">
                                                    <button className="text-red-500 hover:text-red-400">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'auth' && (
                        <div className="h-full flex flex-col">
                            <h2 className="text-xl font-bold text-white mb-4">User Authentication</h2>
                            <div className="flex-1 border border-slate-800 rounded bg-slate-900 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-mono sticky top-0">
                                        <tr>
                                            <th className="p-3 border-b border-slate-800">UID</th>
                                            <th className="p-3 border-b border-slate-800">Name</th>
                                            <th className="p-3 border-b border-slate-800">Email</th>
                                            <th className="p-3 border-b border-slate-800">Role</th>
                                            <th className="p-3 border-b border-slate-800">Institution</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono text-xs text-slate-300">
                                        {db.getRawData('educhanakya_users').map((u: any) => (
                                            <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                <td className="p-3 text-purple-400">{u.id}</td>
                                                <td className="p-3 font-bold text-white">{u.name}</td>
                                                <td className="p-3 text-slate-400">{u.email}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded ${u.role === 'Faculty' ? 'bg-amber-900/50 text-amber-500' : 'bg-blue-900/50 text-blue-500'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-500">{u.institutionId}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded p-4">
                            <h3 className="text-slate-400 text-xs font-mono mb-2 uppercase border-b border-slate-800 pb-2">Stream Logs</h3>
                            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="break-all">
                                        {log.includes('[ERROR]') ? <span className="text-red-500">{log}</span> : 
                                         log.includes('[AUTH]') ? <span className="text-yellow-500">{log}</span> :
                                         log.includes('[WRITE]') ? <span className="text-green-500">{log}</span> :
                                         <span className="text-blue-300">{log}</span>}
                                    </div>
                                ))}
                                <div className="animate-pulse text-slate-600">_</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main App Components ---

export default function App() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
    const [isConsoleMode, setIsConsoleMode] = useState(false);

    useEffect(() => {
        initializeGemini();
    }, []);

    const handleSignOut = () => {
        setUser(null);
        setView(ViewState.DASHBOARD);
    };

    // --- FULL SCREEN BACKEND CONSOLE MODE ---
    if (isConsoleMode) {
        return <BackendConsole onExit={() => setIsConsoleMode(false)} />;
    }

    if (!user) {
        return <LoginScreen onLogin={setUser} onOpenConsole={() => setIsConsoleMode(true)} />;
    }

    // --- STANDARD LMS APP LAYOUT ---
    return (
        <Layout currentView={view} onNavigate={setView} user={user} onSignOut={handleSignOut}>
            {view === ViewState.DASHBOARD && <Dashboard user={user} />}
            {view === ViewState.REPOSITORY && <Repository user={user} />}
            {view === ViewState.LEARNING && <LearningEngine user={user} />}
            {view === ViewState.TALENT && <TalentPortal user={user} />}
            {view === ViewState.IDEATION && <IdeationHub user={user} />}
            <ChatWidget user={user} />
        </Layout>
    );
}

// --- Sub-Views ---

const Dashboard = ({ user }: { user: UserProfile }) => {
    const [stats, setStats] = useState({ projects: 0, candidates: 0, ideas: 0, topSkills: [] as string[] });

    useEffect(() => {
        // Aggregate data
        const unsubP = db.subscribe<any>('projects', (data) => {
            const myInst = data.filter((d: any) => d.institutionId === user.institutionId);
            // Extract top skills
            const skillsMap = new Map<string, number>();
            myInst.forEach((p: any) => p.tags.forEach((t: string) => skillsMap.set(t, (skillsMap.get(t) || 0) + 1)));
            const sortedSkills = Array.from(skillsMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

            setStats(prev => ({ ...prev, projects: myInst.length, topSkills: sortedSkills }));
        });
        const unsubC = db.subscribe<Candidate>('candidates', (data) => {
            setStats(prev => ({ ...prev, candidates: data.filter(d => d.institutionId === user.institutionId).length }));
        });
        const unsubI = db.subscribe<Idea>('ideas', (data) => {
            setStats(prev => ({ ...prev, ideas: data.filter(d => d.institutionId === user.institutionId).length }));
        });

        return () => { unsubP(); unsubC(); unsubI(); };
    }, [user.institutionId]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6">Campus Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-sm font-medium uppercase">Active Projects</h3>
                    <p className="text-4xl font-bold text-white mt-2">{stats.projects}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-sm font-medium uppercase">Talent Pool</h3>
                    <p className="text-4xl font-bold text-blue-400 mt-2">{stats.candidates}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-slate-400 text-sm font-medium uppercase">Open Ideas</h3>
                    <p className="text-4xl font-bold text-purple-400 mt-2">{stats.ideas}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-4">Trending Skills on Campus</h3>
                    <div className="flex flex-wrap gap-2">
                        {stats.topSkills.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-800">
                                {skill}
                            </span>
                        ))}
                        {stats.topSkills.length === 0 && <p className="text-slate-500">No project data yet.</p>}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">Global Certification Hub</h3>
                        <p className="text-slate-400 text-sm mt-1">Connect your campus to world-class learning.</p>
                    </div>
                    <button className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm">Explore</button>
                </div>
            </div>
        </div>
    );
};

const LearningEngine = ({ user }: { user: UserProfile }) => {
    const [paths, setPaths] = useState<LearningPath[]>([]);
    const [goal, setGoal] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return db.subscribe<LearningPath>('learning', (data) => {
            // Show global paths (no instId) and own inst paths
            setPaths(data.filter(p => !p.institutionId || p.institutionId === user.institutionId));
        });
    }, [user.institutionId]);

    const handleGenerate = async () => {
        if (!goal) return;
        setLoading(true);
        try {
            const steps = await generateCurriculum(goal);
            const newPath: LearningPath = {
                id: '',
                institutionId: user.institutionId,
                goal,
                author: user.name,
                steps
            };
            await db.addCollectionItem('learning', newPath);
            setGoal('');
        } catch (e) {
            alert('AI Generation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white">Learning Engine</h2>
                    <p className="text-slate-400">AI-Generated Curriculums & Global Certifications</p>
                </div>
            </div>

            {/* Global Banner */}
            <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-600/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">🎓</span>
                    <div>
                        <h3 className="font-bold text-amber-500">Global Certifications Coming Soon</h3>
                        <p className="text-xs text-amber-200/70">Verified courses from Harvard, MIT, and Google will be integrated directly here.</p>
                    </div>
                </div>
            </div>

            {/* Generator */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-white font-medium mb-3">Create a Custom Learning Path</h3>
                <div className="flex gap-4">
                    <input 
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Become an Autonomous Vehicle Engineer..."
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                        {loading ? 'Designing...' : 'Generate Path'}
                    </button>
                </div>
            </div>

            {/* Paths List */}
            <div className="grid gap-6">
                {paths.map(path => (
                    <div key={path.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">{path.goal}</h3>
                            <span className="text-xs text-slate-500">by {path.author || 'System'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {path.steps.map((step, i) => (
                                <div key={i} className="bg-slate-900 p-4 rounded-lg border border-slate-800 relative">
                                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold border-4 border-slate-900">
                                        {i + 1}
                                    </div>
                                    <h4 className="text-blue-400 font-medium text-sm mb-1 mt-2">{step.title}</h4>
                                    <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{step.estimatedHours} Hours</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TalentPortal = ({ user }: { user: UserProfile }) => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loadingBio, setLoadingBio] = useState<string | null>(null);
    
    // Admin Enrollment State
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollName, setEnrollName] = useState('');
    const [enrollEmail, setEnrollEmail] = useState('');

    useEffect(() => {
        return db.subscribe<Candidate>('candidates', (data) => {
            setCandidates(data.filter(c => c.institutionId === user.institutionId));
        });
    }, [user.institutionId]);

    const handleGenerateBio = async (candidate: Candidate) => {
        setLoadingBio(candidate.id);
        try {
            const bio = await generateCandidateBio(candidate.name, candidate.skills);
            await db.updateCollectionItem<Candidate>('candidates', candidate.id, { bio });
        } catch (e) {
            alert('Bio generation failed');
        } finally {
            setLoadingBio(null);
        }
    };
    
    const handleEnrollStudent = async () => {
        if(!enrollName) return alert("Student Name Required");
        
        // 1. Create Login User
        const newUser = await db.createUser({
            institutionId: user.institutionId,
            name: enrollName,
            email: enrollEmail || `${enrollName.replace(' ', '').toLowerCase()}@campus.edu`,
            role: 'Student',
            avatar: ''
        });

        // 2. Create Candidate Profile
        await db.addCollectionItem('candidates', { 
            id: newUser.id, // Link IDs
            institutionId: user.institutionId, 
            name: enrollName, 
            role: "Freshman", 
            skills: [], 
            projectCount: 0, 
            avgScore: 0 
        });

        alert(`Student Enrolled Successfully!\n\nLOGIN CREDENTIAL:\nUser ID: ${newUser.id}\n\nPlease share this User ID with the student.`);
        setIsEnrolling(false);
        setEnrollName('');
        setEnrollEmail('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Talent Portal</h2>
                {user.role === 'Faculty' && (
                     <button 
                        onClick={() => setIsEnrolling(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center"
                    >
                        <span className="text-lg mr-2">+</span> Enroll New Student
                    </button>
                )}
            </div>
            
            {isEnrolling && (
                <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <svg className="w-32 h-32 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                    </div>
                    <h3 className="text-white font-bold mb-4 relative z-10">Admin Enrollment Console</h3>
                    <div className="flex gap-4 relative z-10">
                        <input 
                            value={enrollName}
                            onChange={(e) => setEnrollName(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm"
                            placeholder="Student Name"
                        />
                        <input 
                            value={enrollEmail}
                            onChange={(e) => setEnrollEmail(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm"
                            placeholder="Email (Optional)"
                        />
                        <button onClick={handleEnrollStudent} className="bg-green-600 hover:bg-green-500 text-white px-6 rounded font-bold text-sm">
                            Generate Credentials
                        </button>
                        <button onClick={() => setIsEnrolling(false)} className="text-slate-400 hover:text-white px-4">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map(candidate => (
                    <div key={candidate.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 bg-slate-700 rounded-full overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`} alt={candidate.name} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{candidate.name}</h3>
                                <p className="text-sm text-blue-400">{candidate.role}</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {candidate.skills.map(skill => (
                                    <span key={skill} className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded">{skill}</span>
                                ))}
                                {candidate.skills.length === 0 && <span className="text-xs text-slate-600">No skills tagged yet</span>}
                            </div>
                            
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                {candidate.bio ? (
                                    <p className="text-xs text-slate-400 italic leading-relaxed">"{candidate.bio}"</p>
                                ) : (
                                    <div className="text-center">
                                        <button 
                                            onClick={() => handleGenerateBio(candidate)}
                                            disabled={!!loadingBio}
                                            className="text-xs text-emerald-500 hover:text-emerald-400 underline"
                                        >
                                            {loadingBio === candidate.id ? 'Writing Bio...' : 'Generate Professional Bio with AI'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between text-sm text-slate-500">
                            <span>{candidate.projectCount} Projects</span>
                            <span className="text-white font-bold">{candidate.avgScore}% Avg Score</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const IdeationHub = ({ user }: { user: UserProfile }) => {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        return db.subscribe<Idea>('ideas', (data) => {
            setIdeas(data.filter(i => i.institutionId === user.institutionId));
        });
    }, [user.institutionId]);

    const handleSubmit = async () => {
        if (!title || !desc) return;
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeIdeaSkills(desc);
            const newIdea: Idea = {
                id: '',
                institutionId: user.institutionId,
                title,
                description: desc,
                requiredSkills: analysis.skills,
                openRoles: analysis.roles,
                applicants: [],
                createdAt: new Date().toISOString(),
                authorName: user.name
            };
            await db.addCollectionItem('ideas', newIdea);
            setTitle('');
            setDesc('');
        } catch (e) {
            alert('Failed to analyze idea');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleJoin = async (idea: Idea) => {
        if (idea.applicants.includes(user.name)) return;
        const updated = [...idea.applicants, user.name];
        await db.updateCollectionItem<Idea>('ideas', idea.id, { applicants: updated });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-3xl font-bold text-white">Ideation Hub</h2>
                <div className="grid gap-4">
                    {ideas.map(idea => (
                        <div key={idea.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{idea.title}</h3>
                                    <p className="text-sm text-slate-500 mb-2">Posted by {idea.authorName} • {new Date(idea.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button 
                                    onClick={() => handleJoin(idea)}
                                    disabled={idea.applicants.includes(user.name)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                        idea.applicants.includes(user.name) 
                                        ? 'bg-green-900/30 text-green-500 cursor-default' 
                                        : 'bg-blue-600 text-white hover:bg-blue-500'
                                    }`}
                                >
                                    {idea.applicants.includes(user.name) ? 'Applied' : 'Join Team'}
                                </button>
                            </div>
                            <p className="text-slate-300 mb-4">{idea.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-lg">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Required Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {idea.requiredSkills.map(s => (
                                            <span key={s} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{s}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Open Roles</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {idea.openRoles.map(r => (
                                            <span key={r} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-800">{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {idea.applicants.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-700">
                                    <p className="text-xs text-slate-500">Applicants: {idea.applicants.join(', ')}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-fit sticky top-6">
                <h3 className="text-lg font-bold text-white mb-4">Submit New Idea</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Project Title</label>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm"
                            placeholder="e.g. Campus Navigation App"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Description</label>
                        <textarea 
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm h-32"
                            placeholder="Describe your vision..."
                        />
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={isAnalyzing}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                        {isAnalyzing ? 'Analyzing with AI...' : 'Analyze & Post Idea'}
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                        Gemini will automatically detect required skills and define team roles.
                    </p>
                </div>
            </div>
        </div>
    );
};