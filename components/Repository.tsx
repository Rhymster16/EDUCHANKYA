
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, UserProfile, LearningPath, ProjectStatus, Message, ProjectCritique } from '../types';
import { db } from '../services/db';
import { analyzeProjectFile, critiqueProject } from '../services/gemini';

interface RepositoryProps {
    user: UserProfile;
}

export const Repository: React.FC<RepositoryProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [facultyList, setFacultyList] = useState<UserProfile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  
  // Handover state
  const [isEditingHandover, setIsEditingHandover] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const [selectedPathId, setSelectedPathId] = useState('');
  const [resourceLink, setResourceLink] = useState('');

  // Chat State
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Status Confirmation State
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadParentIdRef = useRef<string | undefined>(undefined);

  // Subscribe to Projects
  useEffect(() => {
    return db.subscribe<Project>('projects', (data) => {
        const instituteProjects = data
            .filter(p => p.institutionId === user.institutionId);
        setProjects(instituteProjects);
    });
  }, [user.institutionId]);

  // Subscribe to Messages
  useEffect(() => {
      return db.subscribe<Message>('messages', (data) => {
          setMessages(data.filter(m => m.institutionId === user.institutionId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      });
  }, [user.institutionId]);

  // Fetch Faculty for assignment
  useEffect(() => {
      if (user.role === 'Admin') {
          db.getUsersByInstitution(user.institutionId).then(users => {
              setFacultyList(users.filter(u => u.role === 'Faculty'));
          });
      }
  }, [user.role, user.institutionId]);

  useEffect(() => {
    return db.subscribe<LearningPath>('learning', (data) => {
        setLearningPaths(data.filter(p => !p.institutionId || p.institutionId === user.institutionId));
    });
  }, [user.institutionId]);

  useEffect(() => {
    if (selectedProject) {
        setHandoverText(selectedProject.handoverNote || '');
        setSelectedPathId(selectedProject.recommendedPathId || '');
        // Auto-refresh selected project if it updates in background
        const live = projects.find(p => p.id === selectedProject.id);
        if (live && live !== selectedProject) setSelectedProject(live);
    }
  }, [selectedProject, projects]);

  // Group Projects into Lineages
  const lineages = useMemo(() => {
    const groups: Project[][] = [];
    const visited = new Set<string>();
    
    // Find all roots (no parent or parent not accessible)
    const roots = projects.filter(p => !p.parentId || !projects.find(parent => parent.id === p.parentId));
    
    roots.forEach(root => {
        if (visited.has(root.id)) return;
        const lineage = [root];
        visited.add(root.id);
        
        // BFS for descendants
        const queue = [root];
        while(queue.length) {
           const curr = queue.shift()!;
           const children = projects.filter(p => p.parentId === curr.id);
           children.forEach(c => {
               if(!visited.has(c.id)) {
                   visited.add(c.id);
                   lineage.push(c);
                   queue.push(c);
               }
           });
        }
        
        // Sort by upload time
        lineage.sort((a,b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        groups.push(lineage);
    });
    
    // Sort groups by latest activity
    return groups.sort((a,b) => {
        const lastA = a[a.length-1];
        const lastB = b[b.length-1];
        return new Date(lastB.uploadedAt).getTime() - new Date(lastA.uploadedAt).getTime();
    });
  }, [projects]);

  const handleUploadClick = (parentId?: string) => {
      uploadParentIdRef.current = parentId;
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset
          fileInputRef.current.click();
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const parentId = uploadParentIdRef.current;

    try {
      const metadata = await analyzeProjectFile(file.name, file.size);
      
      const newProject: Project = {
        id: '', // DB generates this
        institutionId: user.institutionId,
        parentId,
        title: metadata.title || file.name,
        description: metadata.description || '',
        complexity: metadata.complexity || 0,
        tags: metadata.tags || [],
        filename: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        authorName: user.name,
        authorId: user.id,
        status: 'Pending'
      };

      // Also sync tags to student profile
      if (user.role === 'Student') {
          await db.appendUserSkills(user.id, newProject.tags);
      }

      const newId = await db.addCollectionItem('projects', newProject);
      
      // Auto-create chatroom welcome message
      const welcomeMsg: Omit<Message, 'id'> & { id?: string } = {
          institutionId: user.institutionId,
          projectId: newId,
          senderId: 'system',
          senderName: 'System',
          text: `Project ingestion complete. Chatroom created for ${newProject.title} (v${parentId ? 'Next' : '1'}).`,
          timestamp: new Date().toISOString()
      };
      await db.addCollectionItem('messages', welcomeMsg);

    } catch (err) {
      alert("Failed to process file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCritique = async (project: Project) => {
    setCritiqueLoading(true);
    try {
      const result = await critiqueProject(project);
      await db.updateCollectionItem<Project>('projects', project.id, { critique: result });
    } catch (err) {
      alert("Critique generation failed.");
    } finally {
      setCritiqueLoading(false);
    }
  };

  const saveHandover = async () => {
    if (!selectedProject) return;
    const updates: Partial<Project> = { 
        handoverNote: handoverText,
        recommendedPathId: selectedPathId,
    };
    if (resourceLink) {
        updates.sharedResources = [...(selectedProject.sharedResources || []), resourceLink];
    }
    await db.updateCollectionItem<Project>('projects', selectedProject.id, updates);
    setResourceLink('');
    setIsEditingHandover(false);
  };

  const handleStatusChange = async (status: ProjectStatus) => {
      if (!selectedProject) return;
      if (status === 'Completed') {
          setShowCompletionModal(true);
          return;
      }
      await db.updateCollectionItem<Project>('projects', selectedProject.id, { status });
  };

  const confirmCompletion = async () => {
      if (selectedProject) {
          await db.updateCollectionItem<Project>('projects', selectedProject.id, { status: 'Completed' });
      }
      setShowCompletionModal(false);
  };

  const handleAssignFaculty = async (facultyId: string) => {
      if (selectedProject) {
          await db.updateCollectionItem<Project>('projects', selectedProject.id, { assignedFacultyId: facultyId });
      }
  };

  const handleSendMessage = async () => {
      if (!newMessage || !selectedProject) return;
      
      const msg: Omit<Message, 'id'> & { id?: string } = {
          institutionId: user.institutionId,
          projectId: selectedProject.id,
          senderId: user.id,
          senderName: user.name,
          text: newMessage,
          timestamp: new Date().toISOString()
      };

      await db.addCollectionItem('messages', msg);
      setNewMessage('');
  };

  const projectMessages = selectedProject ? messages.filter(m => m.projectId === selectedProject.id) : [];

  // Should user see contact details?
  const canSeeAuthorDetails = (authorId: string) => {
      if (user.role === 'Admin' || user.role === 'Faculty') return true; // Teachers see all
      if (user.id === authorId) return true; // Self
      // If student is in the chat (implicit "team"), maybe? For now strict:
      return false;
  };

  return (
    <div className="flex h-full gap-6">
      <input 
         type="file" 
         ref={fileInputRef}
         onChange={handleFileUpload} 
         className="hidden" 
      />

      {/* Left: Timeline List */}
      <div className="w-1/2 flex flex-col space-y-6 overflow-hidden">
         <div className="flex justify-between items-center px-1">
            <div>
                <h2 className="text-2xl font-bold text-white">Project Repository</h2>
                <p className="text-xs text-slate-400">Track project lineage and iterations</p>
            </div>
            <button 
                onClick={() => handleUploadClick(undefined)}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center text-sm"
            >
                {isUploading ? 'Uploading...' : '+ New Project'}
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-20">
             {lineages.length === 0 && (
                 <div className="text-center text-slate-500 mt-20 italic">No projects yet. Upload one to start!</div>
             )}
             {lineages.map((lineage, idx) => (
                <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 relative">
                    <h3 className="text-lg font-bold text-white mb-6 pl-2 border-l-4 border-blue-500 ml-[-24px] rounded-r bg-slate-800/80 py-1 pr-4 inline-block shadow">
                        {lineage[0].title}
                    </h3>

                    <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                        {lineage.map((proj, i) => (
                            <div key={proj.id} className="relative group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[21px] top-4 w-4 h-4 rounded-full border-2 border-slate-900 z-10 ${
                                    proj.status === 'Completed' ? 'bg-green-500' : 
                                    proj.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-500'
                                }`}></div>

                                {/* Connector Line for Handover */}
                                {i < lineage.length - 1 && (
                                    <div className="absolute -left-[14px] top-8 bottom-[-32px] w-0.5 bg-slate-700"></div>
                                )}
                                
                                {/* Card */}
                                <div 
                                    onClick={() => setSelectedProject(proj)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        selectedProject?.id === proj.id 
                                            ? 'bg-blue-900/20 border-blue-500 shadow-blue-900/20 shadow-lg' 
                                            : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-bold text-white text-sm">{proj.title}</h4>
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">v{i + 1}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">by {proj.authorName} • {new Date(proj.uploadedAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                            proj.status === 'Completed' ? 'bg-green-900/50 text-green-400 border border-green-900' : 
                                            proj.status === 'In Progress' ? 'bg-blue-900/50 text-blue-400 border border-blue-900' : 
                                            'bg-slate-700/50 text-slate-400 border border-slate-600'
                                        }`}>{proj.status}</span>
                                    </div>

                                    {/* Handover Note Visualization */}
                                    {proj.handoverNote && (
                                        <div className="mt-3 text-xs bg-amber-900/10 border border-amber-900/30 p-2 rounded flex items-start text-amber-200/80">
                                            <span className="mr-2 text-lg leading-none">📝</span>
                                            <div className="flex-1">
                                                <span className="font-bold uppercase text-[9px] opacity-70 block mb-0.5 text-amber-500">Faculty Handover Note</span>
                                                <p className="italic line-clamp-2">{proj.handoverNote}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* Start Next Iteration Button */}
                        <div className="relative pl-0 pt-2">
                            <div className="absolute -left-[20px] top-3.5 w-3 h-3 bg-slate-700 rounded-full z-10 border border-slate-800"></div>
                            <button 
                                onClick={() => handleUploadClick(lineage[lineage.length-1].id)}
                                disabled={isUploading}
                                className="group flex items-center text-sm text-slate-500 hover:text-blue-400 transition-colors ml-[-4px]"
                            >
                                <span className="w-8 h-[1px] bg-slate-700 mr-2 group-hover:bg-blue-500/50 transition-colors"></span>
                                <span className="font-bold border border-dashed border-slate-600 px-3 py-1.5 rounded-lg group-hover:border-blue-500 group-hover:bg-blue-500/10">
                                    + Start Next Iteration
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
             ))}
         </div>
      </div>

      {/* Right: Selected Project Details (Sticky) */}
      <div className="w-1/2 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
         {selectedProject ? (
             <>
                 {/* Header */}
                 <div className="p-6 border-b border-slate-700 bg-slate-900/50">
                     <div className="flex justify-between items-start mb-4">
                         <div>
                             <h2 className="text-xl font-bold text-white">{selectedProject.title}</h2>
                             <div className="flex items-center space-x-2 mt-1">
                                <span className="text-sm text-slate-400">Uploaded by</span>
                                <div className="flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                    <span className="text-sm font-medium text-white">{selectedProject.authorName}</span>
                                    {/* Author Details Popover (Simplified) */}
                                    {canSeeAuthorDetails(selectedProject.authorId) && (
                                        <span className="text-[10px] text-blue-400 ml-1 cursor-help" title="Contact info visible to Faculty/Admin">
                                            (View Profile)
                                        </span>
                                    )}
                                </div>
                             </div>
                         </div>
                         {(user.role === 'Admin' || user.role === 'Faculty') && (
                            <select 
                                value={selectedProject.status}
                                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                                className="bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1 outline-none focus:border-blue-500"
                            >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>
                         )}
                     </div>

                     <div className="flex space-x-4 text-sm mt-4">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`pb-2 border-b-2 font-medium transition-colors ${activeTab === 'details' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            Overview & Critique
                        </button>
                        <button 
                            onClick={() => setActiveTab('chat')}
                            className={`pb-2 border-b-2 font-medium transition-colors ${activeTab === 'chat' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
                        >
                            Project Chat
                        </button>
                     </div>
                 </div>

                 {/* Content Area */}
                 <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'details' && (
                        <div className="space-y-8">
                            {/* Handover Note Display */}
                            {selectedProject.handoverNote && !isEditingHandover && (
                                <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-4">
                                    <h4 className="text-amber-500 font-bold text-xs uppercase mb-2 flex items-center">
                                        <span className="mr-2 text-lg">📝</span> Faculty Handover Note
                                    </h4>
                                    <p className="text-amber-100 text-sm whitespace-pre-wrap">{selectedProject.handoverNote}</p>
                                    {selectedProject.recommendedPathId && (
                                        <div className="mt-3 pt-3 border-t border-amber-500/20">
                                            <span className="text-xs text-amber-500/70 uppercase font-bold mr-2">Prerequisite Path:</span>
                                            <span className="text-sm text-amber-200 underline cursor-pointer">
                                                {learningPaths.find(l => l.id === selectedProject.recommendedPathId)?.goal || 'Linked Curriculum'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Complexity</p>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${selectedProject.complexity}%` }}></div>
                                        </div>
                                        <span className="text-white font-mono text-sm">{selectedProject.complexity}/100</span>
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Assigned Faculty</p>
                                    {selectedProject.assignedFacultyId ? (
                                        <p className="text-white text-sm">{facultyList.find(f => f.id === selectedProject.assignedFacultyId)?.name || 'Unknown'}</p>
                                    ) : (
                                        user.role === 'Admin' ? (
                                            <select 
                                                className="w-full bg-slate-800 text-xs text-white p-1 rounded border border-slate-600"
                                                onChange={(e) => handleAssignFaculty(e.target.value)}
                                            >
                                                <option value="">Assign Faculty...</option>
                                                {facultyList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        ) : <p className="text-slate-500 text-sm italic">Unassigned</p>
                                    )}
                                </div>
                            </div>

                            {/* Tech Stack */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2">Tech Stack</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedProject.tags.map(t => (
                                        <span key={t} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs border border-slate-600">{t}</span>
                                    ))}
                                </div>
                            </div>

                            {/* AI Critique Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-white">AI Code Architect Review</h3>
                                    {!selectedProject.critique && (
                                        <button 
                                            onClick={() => selectedProject && handleCritique(selectedProject)}
                                            disabled={critiqueLoading}
                                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded flex items-center"
                                        >
                                            {critiqueLoading ? (
                                                <span className="animate-pulse">Analyzing...</span>
                                            ) : (
                                                <>Run Analysis <span className="ml-1">✨</span></>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {selectedProject.critique ? (
                                    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                        <div className="p-4 border-b border-slate-800">
                                            <p className="text-sm text-slate-300 italic">{selectedProject.critique.summary}</p>
                                        </div>
                                        <div className="p-4 grid gap-4">
                                            <div>
                                                <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Weaknesses</h4>
                                                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                                                    {selectedProject.critique.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-green-400 uppercase mb-2">Refactoring Suggestions</h4>
                                                <div className="space-y-3">
                                                    {selectedProject.critique.refactoringSuggestions?.map((s, i) => (
                                                        <div key={i} className="bg-black/30 p-3 rounded border border-slate-800">
                                                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                                                                <span>{s.file}</span>
                                                                <span className="text-yellow-500">{s.issue}</span>
                                                            </div>
                                                            <pre className="text-[10px] text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap">
                                                                {s.suggestedCode}
                                                            </pre>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/30 border border-dashed border-slate-700 rounded-lg p-6 text-center">
                                        <p className="text-slate-500 text-xs">Run AI analysis to get architectural feedback and code improvements.</p>
                                    </div>
                                )}
                            </div>

                            {/* Faculty Handover Editing */}
                            {(user.role === 'Faculty' || user.role === 'Admin') && (
                                <div className="border-t border-slate-700 pt-6">
                                    <button 
                                        onClick={() => setIsEditingHandover(!isEditingHandover)}
                                        className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider mb-4 flex items-center"
                                    >
                                        {isEditingHandover ? 'Cancel Editing' : 'Edit Faculty Handover Note'}
                                        <span className="ml-2">✎</span>
                                    </button>
                                    
                                    {isEditingHandover && (
                                        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 animate-fade-in">
                                            <textarea 
                                                className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded p-3 focus:border-amber-500 outline-none"
                                                rows={4}
                                                placeholder="Write instructions for the next student..."
                                                value={handoverText}
                                                onChange={(e) => setHandoverText(e.target.value)}
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Link Prerequisite Path</label>
                                                    <select 
                                                        className="w-full bg-slate-800 border border-slate-600 text-white text-xs rounded p-2"
                                                        value={selectedPathId}
                                                        onChange={(e) => setSelectedPathId(e.target.value)}
                                                    >
                                                        <option value="">Select Learning Path...</option>
                                                        {learningPaths.map(p => <option key={p.id} value={p.id}>{p.goal}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-slate-400 mb-1 uppercase">Add Resource Link</label>
                                                    <input 
                                                        className="w-full bg-slate-800 border border-slate-600 text-white text-xs rounded p-2"
                                                        placeholder="https://..."
                                                        value={resourceLink}
                                                        onChange={(e) => setResourceLink(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <button 
                                                    onClick={saveHandover}
                                                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-xs font-bold"
                                                >
                                                    Save Handover Note
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                                {projectMessages.length === 0 && (
                                    <div className="text-center text-slate-500 text-xs italic mt-10">
                                        No messages yet. Start the discussion for {selectedProject.title}.
                                    </div>
                                )}
                                {projectMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-lg p-3 ${
                                            msg.senderId === 'system' ? 'bg-slate-800/50 text-slate-500 text-[10px] w-full text-center italic border border-slate-700/50' :
                                            msg.senderId === user.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
                                        }`}>
                                            {msg.senderId !== 'system' && (
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="text-[10px] font-bold opacity-75">{msg.senderName}</span>
                                                    <span className="text-[8px] opacity-50 ml-2">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            )}
                                            <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-auto">
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
             </>
         ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                 <p className="text-sm">Select a project node from the timeline to view details.</p>
             </div>
         )}
      </div>

      {/* Confirmation Modal */}
      {showCompletionModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-2">Confirm Completion</h3>
                  <p className="text-slate-400 text-sm mb-6">
                      Are you sure you want to mark <span className="text-white font-bold">{selectedProject?.title}</span> as Completed?
                      <br/><br/>
                      This indicates the project is ready for the next iteration or final submission.
                  </p>
                  <div className="flex justify-end space-x-3">
                      <button 
                        onClick={() => setShowCompletionModal(false)}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmCompletion}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                      >
                          Yes, Mark Completed
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
