import React, { useState, useEffect } from 'react';
import { Project, UserProfile, LearningPath } from '../types';
import { db } from '../services/db';
import { analyzeProjectFile, critiqueProject } from '../services/gemini';

interface RepositoryProps {
    user: UserProfile;
}

export const Repository: React.FC<RepositoryProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  
  // Handover state
  const [isEditingHandover, setIsEditingHandover] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const [selectedPathId, setSelectedPathId] = useState('');

  // Subscribe to Projects
  useEffect(() => {
    return db.subscribe<Project>('projects', (data) => {
        // Filter by Institution and Sort
        const instituteProjects = data
            .filter(p => p.institutionId === user.institutionId)
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setProjects(instituteProjects);
    });
  }, [user.institutionId]);

  // Subscribe to Learning Paths (for Dropdown)
  useEffect(() => {
    return db.subscribe<LearningPath>('learning', (data) => {
        setLearningPaths(data.filter(p => !p.institutionId || p.institutionId === user.institutionId));
    });
  }, [user.institutionId]);

  useEffect(() => {
    if (selectedProject) {
        setHandoverText(selectedProject.handoverNote || '');
        setSelectedPathId(selectedProject.recommendedPathId || '');
    }
  }, [selectedProject]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, parentId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const metadata = await analyzeProjectFile(file.name, file.size);
      
      const newProject: Project = {
        id: '', // DB will assign
        institutionId: user.institutionId,
        parentId,
        title: metadata.title || file.name,
        description: metadata.description || '',
        complexity: metadata.complexity || 0,
        tags: metadata.tags || [],
        filename: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        authorName: user.name
      };

      await db.addCollectionItem('projects', newProject);
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
      if (selectedProject?.id === project.id) {
        setSelectedProject({ ...project, critique: result });
      }
    } catch (err) {
      alert("Critique generation failed.");
    } finally {
      setCritiqueLoading(false);
    }
  };

  const saveHandover = async () => {
    if (!selectedProject) return;
    await db.updateCollectionItem<Project>('projects', selectedProject.id, { 
        handoverNote: handoverText,
        recommendedPathId: selectedPathId
    });
    setSelectedProject({ 
        ...selectedProject, 
        handoverNote: handoverText,
        recommendedPathId: selectedPathId
    });
    setIsEditingHandover(false);
  };

  // Derived state for lineage view
  const rootProjects = projects.filter(p => !p.parentId);
  const getChildren = (id: string) => projects.filter(p => p.parentId === id);

  // Helper to get path name
  const getRecommendedPathName = () => {
      return learningPaths.find(p => p.id === selectedProject?.recommendedPathId)?.goal || 'Unknown Path';
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Project Repository</h2>
          <p className="text-slate-400">Institutional Archives & Student Work</p>
        </div>
        <div className="relative group">
            <input 
                type="file" 
                onChange={(e) => handleFileUpload(e)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
            />
            <button className={`px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center space-x-2 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                {isUploading ? (
                    <span>Analyzing...</span>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span>Ingest New Project</span>
                    </>
                )}
            </button>
        </div>
      </header>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rootProjects.length === 0 && (
            <div className="col-span-3 text-center py-20 border-2 border-dashed border-slate-700 rounded-2xl">
                <p className="text-slate-500 text-lg">No projects uploaded to this institution yet.</p>
                <p className="text-slate-600">Be the first to contribute.</p>
            </div>
        )}
        {rootProjects.map(project => (
            <div key={project.id} className="bg-edu-surface border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-colors cursor-pointer group relative shadow-lg" onClick={() => setSelectedProject(project)}>
                {project.handoverNote && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                        <span className="bg-amber-600 text-white text-[10px] px-2 py-1 rounded-full uppercase font-bold shadow-lg flex items-center">
                             <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                            Recommended
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-start mb-3">
                    <div className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded font-mono border border-blue-900/50">
                        {project.complexity}/100 Score
                    </div>
                    {getChildren(project.id).length > 0 && (
                        <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-1 rounded flex items-center border border-purple-900/50">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            {getChildren(project.id).length} Iterations
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">{project.title}</h3>
                <p className="text-xs text-slate-500 mb-2">by {project.authorName || 'Anonymous'}</p>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                    {project.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{tag}</span>
                    ))}
                </div>
            </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{selectedProject.title}</h2>
                        <p className="text-slate-400 font-mono text-sm">
                            {selectedProject.filename} • {(selectedProject.sizeBytes / 1024).toFixed(1)} KB • Author: {selectedProject.authorName}
                        </p>
                    </div>
                    <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-white">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-12 gap-8">
                    {/* Left: Info, Handover & Lineage */}
                    <div className="col-span-12 lg:col-span-5 space-y-6">
                        <section>
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Description</h4>
                            <p className="text-slate-300 leading-relaxed text-sm">{selectedProject.description}</p>
                        </section>

                        <section className="bg-amber-900/10 border border-amber-700/30 p-4 rounded-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <svg className="w-20 h-20 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" /></svg>
                            </div>
                            <div className="flex justify-between items-center mb-2 relative z-10">
                                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                    Faculty / Senior Handover
                                </h4>
                                {(user.role === 'Faculty' || !isEditingHandover) && (
                                    <button onClick={() => setIsEditingHandover(true)} className="text-xs text-amber-500 hover:text-white underline">Edit Note</button>
                                )}
                            </div>
                            
                            {isEditingHandover ? (
                                <div className="space-y-3 relative z-10">
                                    <textarea 
                                        value={handoverText}
                                        onChange={(e) => setHandoverText(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 p-2 rounded text-sm text-white"
                                        placeholder="Add a note for future students..."
                                        rows={3}
                                    />
                                    <div>
                                        <label className="block text-xs text-amber-500/80 mb-1 font-bold">Recommended Learning Path</label>
                                        <select 
                                            value={selectedPathId}
                                            onChange={(e) => setSelectedPathId(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded p-2"
                                        >
                                            <option value="">-- No specific recommendation --</option>
                                            {learningPaths.map(path => (
                                                <option key={path.id} value={path.id}>{path.goal}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => setIsEditingHandover(false)} className="text-xs text-slate-400">Cancel</button>
                                        <button onClick={saveHandover} className="text-xs bg-amber-600 text-white px-3 py-1 rounded">Save Handover</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 space-y-3">
                                    <p className="text-slate-300 text-sm italic">{selectedProject.handoverNote || "No handover note added yet. This project is open for anyone to pick up."}</p>
                                    {selectedProject.recommendedPathId && (
                                        <div className="bg-amber-950/40 border border-amber-900/50 rounded p-2 flex items-center space-x-2">
                                            <span className="text-xs text-amber-500 font-bold uppercase">Prerequisite:</span>
                                            <span className="text-xs text-white truncate">{getRecommendedPathName()}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section>
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Lineage & Iterations</h4>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        onChange={(e) => handleFileUpload(e, selectedProject.id)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <button className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded border border-slate-600 flex items-center">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Start Next Iteration
                                    </button>
                                </div>
                             </div>
                             
                             <div className="space-y-4 relative pl-4 border-l-2 border-slate-700 ml-2">
                                {/* Parent */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-900"></div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-blue-500/30">
                                        <div className="flex justify-between">
                                            <p className="font-medium text-white text-sm">Version 1.0 (Root)</p>
                                            <span className="text-xs text-slate-500">by {selectedProject.parentId ? 'Parent Author' : selectedProject.authorName}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(selectedProject.uploadedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {/* Children */}
                                {getChildren(selectedProject.id).map((child, idx) => (
                                    <div key={child.id} className="relative">
                                        <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full bg-slate-600 ring-4 ring-slate-900"></div>
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setSelectedProject(child)}>
                                            <div className="flex justify-between">
                                                <p className="font-medium text-slate-200 text-sm">Iteration {idx + 1}: {child.title}</p>
                                                <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400">{child.complexity} pts</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-xs text-slate-500">by {child.authorName}</span>
                                                <span className="text-xs text-slate-600">{new Date(child.uploadedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </section>
                    </div>

                    {/* Right: AI Critique & Code */}
                    <div className="col-span-12 lg:col-span-7 bg-slate-800/30 rounded-xl p-6 border border-slate-700 h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                AI Code Architect Review
                            </h4>
                            <button 
                                onClick={() => handleCritique(selectedProject)}
                                disabled={critiqueLoading}
                                className="text-xs text-emerald-400 hover:text-emerald-300 underline disabled:opacity-50"
                            >
                                {critiqueLoading ? 'Generating Analysis...' : 'Generate / Refresh Critique'}
                            </button>
                        </div>

                        {selectedProject.critique ? (
                            <div className="space-y-6">
                                {/* Summary Box */}
                                <div className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-emerald-500">
                                    <p className="text-slate-200 font-medium italic text-sm">"{selectedProject.critique.summary}"</p>
                                    <div className="mt-3 flex items-center space-x-4 text-xs">
                                        <span className="text-slate-400">Current Score: <span className="text-white font-bold">{selectedProject.complexity}</span></span>
                                        <span className="text-emerald-400">Potential Score: <span className="font-bold">{selectedProject.critique.revisedComplexity}</span></span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-red-400 font-bold text-xs uppercase mb-2">Critical Weaknesses</p>
                                        <ul className="space-y-1">
                                            {selectedProject.critique.weaknesses.map((w, i) => (
                                                <li key={i} className="text-xs text-slate-300 flex items-start">
                                                    <span className="text-red-500 mr-2">•</span>{w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="text-blue-400 font-bold text-xs uppercase mb-2">Recommended Next Step</p>
                                        <p className="text-xs text-slate-300">{selectedProject.critique.nextSteps}</p>
                                    </div>
                                </div>

                                {/* Code Refactoring Section */}
                                {selectedProject.critique.refactoringSuggestions && selectedProject.critique.refactoringSuggestions.length > 0 && (
                                    <div className="mt-6">
                                        <p className="text-emerald-400 font-bold text-xs uppercase mb-3">Suggested Refactoring & Improvements</p>
                                        <div className="space-y-4">
                                            {selectedProject.critique.refactoringSuggestions.map((suggestion, idx) => (
                                                <div key={idx} className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                                                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                                                        <span className="font-mono text-xs text-blue-300">{suggestion.file}</span>
                                                        <span className="text-xs text-slate-500">{suggestion.issue}</span>
                                                    </div>
                                                    <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                                                        <code>{suggestion.suggestedCode}</code>
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 rounded-lg">
                                <p className="text-slate-500 mb-2 text-sm">No AI critique generated yet.</p>
                                <button 
                                    onClick={() => handleCritique(selectedProject)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    Analyze Codebase
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};