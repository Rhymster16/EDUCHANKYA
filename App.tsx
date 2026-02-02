
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Repository } from './components/Repository';
import { FacultyNotes } from './components/FacultyNotes';
import { AdminPortal } from './components/AdminPortal';
import { IdeationHub } from './components/IdeationHub';
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
    const [activeTab, setActiveTab] = useState<'login' | 'registerInst'>('login');
    const [newName, setNewName] = useState('');
    
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
            alert('User not found. Try "u_admin" for Admin, "u2" for Faculty. Students must get ID from Admin.');
        }
    };

    const handleRegisterInstitute = async () => {
        if (!newInstName || !newInstDomain || !newName) return alert("All fields are required");
        
        const inst = await db.registerInstitution(newInstName, newInstDomain);
        
        const adminUser = await db.createUser({
            institutionId: inst.id,
            name: newName,
            email: `admin@${newInstDomain}`,
            role: 'Admin',
            avatar: ''
        });

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
                            <label className="block text-xs font-medium text-slate-400 mb-1">User ID</label>
                            <input 
                                type="text" 
                                value={loginId} 
                                onChange={(e) => setLoginId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-blue-500"
                                placeholder="Admin / Faculty / Student ID"
                            />
                             <p className="text-[10px] text-slate-500 mt-1">
                                * Obtain your User ID from your Campus Administrator.
                            </p>
                        </div>
                        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">
                            Enter Campus
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
                                placeholder="Institute Name"
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
                            <h3 className="text-white text-sm font-bold mb-2">Main Admin Details</h3>
                            <input 
                                className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 text-sm"
                                placeholder="Admin Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <button onClick={handleRegisterInstitute} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg">
                            Launch Campus
                        </button>
                    </div>
                )}
            </div>
            
            <div className="mt-8 text-center space-y-2 z-10">
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
                                Ask me about learning resources, certifications, or help with your projects.
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
    }, [activeTab, rawKey, logs]);

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
                        </div>
                    )}

                    {activeTab === 'db' && (
                        <div className="h-full flex flex-col">
                            <div className="flex space-x-2 mb-4">
                                {['educhanakya_projects', 'educhanakya_candidates', 'educhanakya_ideas', 'educhanakya_learning', 'educhanakya_messages'].map(k => (
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
                                <pre className="p-4 text-xs font-mono text-slate-300">{JSON.stringify(rawData, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'logs' && (
                        <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded p-4">
                            <h3 className="text-slate-400 text-xs font-mono mb-2 uppercase border-b border-slate-800 pb-2">Stream Logs</h3>
                            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="break-all">
                                        <span className="text-blue-300">{log}</span>
                                    </div>
                                ))}
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

    if (isConsoleMode) {
        return <BackendConsole onExit={() => setIsConsoleMode(false)} />;
    }

    if (!user) {
        return <LoginScreen onLogin={setUser} onOpenConsole={() => setIsConsoleMode(true)} />;
    }

    return (
        <Layout currentView={view} onNavigate={setView} user={user} onSignOut={handleSignOut}>
            {view === ViewState.DASHBOARD && <Dashboard user={user} />}
            {view === ViewState.REPOSITORY && <Repository user={user} />}
            {view === ViewState.NOTES && <FacultyNotes user={user} />}
            {view === ViewState.LEARNING && <LearningEngine user={user} />}
            {view === ViewState.TALENT && <TalentPortal user={user} />}
            {view === ViewState.IDEATION && <IdeationHub user={user} />}
            {view === ViewState.ADMIN && <AdminPortal user={user} />}
            <ChatWidget user={user} />
        </Layout>
    );
}

// --- Sub-Views ---

const Dashboard = ({ user }: { user: UserProfile }) => {
    const [stats, setStats] = useState({ projects: 0, candidates: 0, ideas: 0, topSkills: [] as string[] });

    useEffect(() => {
        const unsubP = db.subscribe<any>('projects', (data) => {
            const myInst = data.filter((d: any) => d.institutionId === user.institutionId);
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
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Trending Skills</h3>
                <div className="flex flex-wrap gap-2">
                    {stats.topSkills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-800">{skill}</span>
                    ))}
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
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-white font-medium mb-3">Create Custom Learning Path</h3>
                <div className="flex gap-4">
                    <input 
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4"
                        placeholder="What do you want to learn?"
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                        {loading ? 'Thinking...' : 'Generate Path'}
                    </button>
                </div>
            </div>
            <div className="grid gap-6">
                {paths.map(path => (
                    <div key={path.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">{path.goal}</h3>
                            <span className="text-xs text-slate-500">by {path.author || 'System'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {path.steps.map((step, i) => (
                                <div key={i} className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                                    <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs text-white font-bold mb-2">{i + 1}</div>
                                    <h4 className="text-blue-400 font-medium text-sm mb-1">{step.title}</h4>
                                    <p className="text-xs text-slate-400">{step.description}</p>
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
    const [usersMap, setUsersMap] = useState<UserProfile[]>([]);
    
    // Privacy check
    const canSeePrivateDetails = user.role === 'Admin' || user.role === 'Faculty';

    useEffect(() => {
        db.getUsersByInstitution(user.institutionId).then(setUsersMap);
        return db.subscribe<Candidate>('candidates', (data) => {
            setCandidates(data.filter(c => c.institutionId === user.institutionId));
        });
    }, [user.institutionId]);

    const getFullProfile = (candidateId: string) => usersMap.find(u => u.id === candidateId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Talent Portal</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map(candidate => {
                    const profile = getFullProfile(candidate.id);
                    return (
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
                        
                        {/* Privacy Block: Only visible to Faculty/Admin */}
                        {canSeePrivateDetails && profile ? (
                            <div className="bg-slate-900/50 p-3 rounded mb-4 text-xs space-y-1 border border-blue-900/30">
                                <p className="text-slate-400"><span className="text-slate-500 uppercase font-bold mr-2">Email:</span>{profile.email}</p>
                                <p className="text-slate-400"><span className="text-slate-500 uppercase font-bold mr-2">Phone:</span>{profile.phoneNumber || 'N/A'}</p>
                                <p className="text-slate-400"><span className="text-slate-500 uppercase font-bold mr-2">Batch:</span>{profile.batch || 'N/A'}</p>
                                <p className="text-slate-400"><span className="text-slate-500 uppercase font-bold mr-2">Year:</span>{profile.year || 'N/A'}</p>
                            </div>
                        ) : (
                            <div className="bg-slate-900/30 p-2 rounded mb-4 text-xs text-slate-500 italic text-center">
                                Contact details private.
                            </div>
                        )}

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {candidate.skills.map(skill => (
                                    <span key={skill} className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded">{skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};
