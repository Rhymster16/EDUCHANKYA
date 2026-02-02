
import React, { useState, useEffect } from 'react';
import { Idea, UserProfile, Message } from '../types';
import { db } from '../services/db';
import { analyzeIdeaSkills } from '../services/gemini';

interface IdeationHubProps {
    user: UserProfile;
}

export const IdeationHub: React.FC<IdeationHubProps> = ({ user }) => {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newIdeaDesc, setNewIdeaDesc] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    
    // Detailed User Map for Applicant Info
    const [userMap, setUserMap] = useState<Map<string, UserProfile>>(new Map());

    // Chat State
    const [chatIdea, setChatIdea] = useState<Idea | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        return db.subscribe<Idea>('ideas', (data) => {
            setIdeas(data.filter(i => i.institutionId === user.institutionId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
    }, [user.institutionId]);

    useEffect(() => {
        // Fetch all users to show applicant details
        db.getUsersByInstitution(user.institutionId).then(users => {
            const map = new Map<string, UserProfile>();
            users.forEach(u => map.set(u.id, u));
            setUserMap(map);
        });
    }, [user.institutionId]);

    // Chat Subscription
    useEffect(() => {
        if (!chatIdea) return;
        return db.subscribe<Message>('messages', (data) => {
            setMessages(data.filter(m => m.projectId === chatIdea.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        });
    }, [chatIdea]);

    const handleCreateIdea = async () => {
        if (!newIdeaDesc) return;
        setAnalyzing(true);
        
        try {
            const analysis = await analyzeIdeaSkills(newIdeaDesc);
            
            const idea: Idea = {
                id: '',
                institutionId: user.institutionId,
                title: 'New Project Idea', // Can be refined
                description: newIdeaDesc,
                requiredSkills: analysis.skills,
                openRoles: analysis.roles,
                applicants: [],
                team: [user.id], // Owner is first team member
                status: 'Open',
                createdAt: new Date().toISOString(),
                authorName: user.name,
                authorId: user.id
            };

            await db.addCollectionItem('ideas', idea);
            setIsCreating(false);
            setNewIdeaDesc('');
        } catch (e) {
            alert('AI Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleJoin = async (idea: Idea) => {
        if (idea.applicants.includes(user.id) || idea.team.includes(user.id)) return;
        const updated = { ...idea, applicants: [...idea.applicants, user.id] };
        await db.updateCollectionItem('ideas', idea.id, updated);
    };

    const handleApprove = async (idea: Idea, applicantId: string) => {
        const updated = {
            ...idea,
            applicants: idea.applicants.filter(id => id !== applicantId),
            team: [...idea.team, applicantId]
        };
        await db.updateCollectionItem('ideas', idea.id, updated);
        
        // Notify via System Message in Team Chat
        await db.addCollectionItem('messages', {
            id: '',
            institutionId: user.institutionId,
            projectId: idea.id,
            senderId: 'system',
            senderName: 'System',
            text: `${userMap.get(applicantId)?.name} has joined the team!`,
            timestamp: new Date().toISOString()
        });
    };

    const handleSendMessage = async () => {
        if (!newMessage || !chatIdea) return;
        const msg: Omit<Message, 'id'> & { id?: string } = {
            institutionId: user.institutionId,
            projectId: chatIdea.id,
            senderId: user.id,
            senderName: user.name,
            text: newMessage,
            timestamp: new Date().toISOString()
        };
        await db.addCollectionItem('messages', msg);
        setNewMessage('');
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">Ideation Hub</h2>
                    <p className="text-slate-400">Collaborate, Form Teams, Innovate</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-purple-900/20"
                >
                    + Post New Idea
                </button>
            </header>

            {isCreating && (
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl mb-8 animate-fade-in">
                    <h3 className="text-white font-bold mb-4">Describe your idea</h3>
                    <textarea 
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded p-4 h-32 mb-4"
                        placeholder="e.g. A mobile app that uses AI to detect plant diseases..."
                        value={newIdeaDesc}
                        onChange={(e) => setNewIdeaDesc(e.target.value)}
                    />
                    <div className="flex justify-end space-x-4">
                        <button onClick={() => setIsCreating(false)} className="text-slate-400">Cancel</button>
                        <button 
                            onClick={handleCreateIdea}
                            disabled={analyzing}
                            className="bg-green-600 text-white px-6 py-2 rounded font-bold"
                        >
                            {analyzing ? 'AI Analyzing Skills...' : 'Launch Idea'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {ideas.map(idea => (
                    <div key={idea.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{idea.description.substring(0, 60)}...</h3>
                                <p className="text-xs text-slate-500">Posted by {idea.authorName} • {new Date(idea.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${idea.status === 'Open' ? 'bg-green-900 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {idea.status}
                                </span>
                                {idea.team.includes(user.id) && (
                                    <button 
                                        onClick={() => setChatIdea(idea)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full"
                                        title="Open Team Chat"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="text-slate-300 text-sm mb-4">{idea.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-900/50 p-3 rounded">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Required Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {idea.requiredSkills.map(s => <span key={s} className="px-2 py-1 bg-purple-900/30 text-purple-300 rounded text-xs border border-purple-800/30">{s}</span>)}
                                </div>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Open Roles</h4>
                                <div className="flex flex-wrap gap-2">
                                    {idea.openRoles.map(r => <span key={r} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs border border-blue-800/30">{r}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Team Section */}
                        <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                            <div className="flex -space-x-2">
                                {idea.team.map(memberId => (
                                    <div key={memberId} className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-800 flex items-center justify-center text-[10px] text-white font-bold" title={userMap.get(memberId)?.name}>
                                        {userMap.get(memberId)?.name.charAt(0)}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Action Buttons */}
                            {idea.authorId === user.id ? (
                                <div className="text-sm">
                                    {idea.applicants.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-400 font-bold">Applicants:</p>
                                            {idea.applicants.map(appId => {
                                                const applicant = userMap.get(appId);
                                                return (
                                                    <div key={appId} className="flex items-center space-x-3 bg-slate-900 p-2 rounded">
                                                        <span className="text-white text-xs">{applicant?.name}</span>
                                                        <span className="text-[10px] text-slate-500">{applicant?.batch} / {applicant?.year}</span>
                                                        <button 
                                                            onClick={() => handleApprove(idea, appId)}
                                                            className="text-[10px] bg-green-600 text-white px-2 py-1 rounded"
                                                        >
                                                            Accept
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-500">No pending applicants</span>
                                    )}
                                </div>
                            ) : (
                                !idea.team.includes(user.id) && (
                                    idea.applicants.includes(user.id) ? (
                                        <span className="text-xs text-yellow-500 font-bold">Request Pending</span>
                                    ) : (
                                        <button 
                                            onClick={() => handleJoin(idea)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold"
                                        >
                                            Request to Join
                                        </button>
                                    )
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Modal */}
            {chatIdea && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-lg h-[600px] rounded-2xl flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h3 className="text-white font-bold">Team Chat: {chatIdea.title}</h3>
                            <button onClick={() => setChatIdea(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                                        msg.senderId === 'system' ? 'bg-slate-800 text-slate-400 text-center w-full italic text-xs' :
                                        msg.senderId === user.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
                                    }`}>
                                        {msg.senderId !== 'system' && <p className="text-[10px] font-bold opacity-70 mb-1">{msg.senderName}</p>}
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                            <input 
                                className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                                placeholder="Message team..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage} className="bg-blue-600 text-white px-4 rounded-lg text-sm">Send</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
