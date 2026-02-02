import React, { useState, useEffect } from 'react';
import { Resource, UserProfile } from '../types';
import { db } from '../services/db';

interface FacultyNotesProps {
    user: UserProfile;
}

export const FacultyNotes: React.FC<FacultyNotesProps> = ({ user }) => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    
    // New Resource State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [link, setLink] = useState('');

    useEffect(() => {
        return db.subscribe<Resource>('resources', (data) => {
            setResources(data.filter(r => r.institutionId === user.institutionId));
        });
    }, [user.institutionId]);

    const handleCreate = async () => {
        if (!title || !desc) return alert("Title and Description required");
        
        const newResource: Resource = {
            id: '',
            institutionId: user.institutionId,
            title,
            description: desc,
            link,
            authorName: user.name,
            postedAt: new Date().toISOString()
        };

        await db.addCollectionItem('resources', newResource);
        setIsCreating(false);
        setTitle('');
        setDesc('');
        setLink('');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Faculty Notes & Resources</h2>
                    <p className="text-slate-400">Classroom materials and shared documents.</p>
                </div>
                {(user.role === 'Faculty' || user.role === 'Admin') && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center"
                    >
                        <span className="text-xl mr-2">+</span> Share New Note
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl animate-fade-in">
                    <h3 className="text-white font-bold mb-4">Post New Resource</h3>
                    <div className="space-y-4">
                        <input 
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2"
                            placeholder="Title (e.g., Week 4: Data Structures)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <textarea 
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2 h-24"
                            placeholder="Description or Note Content..."
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                        />
                        <input 
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded p-2"
                            placeholder="External Link (Optional - Drive/Dropbox URL)"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                        />
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleCreate} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">Post</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {resources.length === 0 && <p className="text-slate-500 italic">No resources shared yet.</p>}
                {resources.map(res => (
                    <div key={res.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-blue-400">{res.title}</h3>
                            <span className="text-xs text-slate-500">{new Date(res.postedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300 mt-2 whitespace-pre-wrap text-sm">{res.description}</p>
                        
                        {res.link && (
                            <div className="mt-4 pt-3 border-t border-slate-700/50">
                                <a href={res.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    Open External Resource
                                </a>
                            </div>
                        )}
                        <p className="text-xs text-slate-600 mt-2">Posted by {res.authorName}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};