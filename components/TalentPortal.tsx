
import React, { useState, useEffect } from 'react';
import { Candidate, UserProfile } from '../types';
import { db } from '../services/db';

interface TalentPortalProps {
    user: UserProfile;
}

export const TalentPortal: React.FC<TalentPortalProps> = ({ user }) => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [usersMap, setUsersMap] = useState<UserProfile[]>([]);
    const [facultyMembers, setFacultyMembers] = useState<UserProfile[]>([]);
    
    // Privacy check
    const isAdmin = user.role === 'Admin';
    const canSeePrivateDetails = isAdmin || user.role === 'Faculty';

    useEffect(() => {
        // Fetch User Map for details
        db.getUsersByInstitution(user.institutionId).then((allUsers) => {
            setUsersMap(allUsers);
            // If Admin, filter faculty
            if (isAdmin) {
                setFacultyMembers(allUsers.filter(u => u.role === 'Faculty'));
            }
        });

        // Subscribe to Candidates (Students)
        return db.subscribe<Candidate>('candidates', (data) => {
            setCandidates(data.filter(c => c.institutionId === user.institutionId));
        });
    }, [user.institutionId, isAdmin]);

    const getFullProfile = (candidateId: string) => usersMap.find(u => u.id === candidateId);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Talent & Faculty Portal</h2>
            </div>
            
            {/* FACULTY DIRECTORY (Admin Only) */}
            {isAdmin && facultyMembers.length > 0 && (
                <div className="mb-8 border-b border-slate-700 pb-8">
                     <h3 className="text-xl font-bold text-amber-500 mb-4 flex items-center">
                        <span className="mr-2 text-2xl">🎓</span> Faculty Directory
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {facultyMembers.map(fac => (
                            <div key={fac.id} className="bg-slate-800/50 border border-amber-900/30 rounded-xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-amber-900/50 text-amber-200 text-[10px] px-2 py-1 rounded-bl">FACULTY</div>
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="w-12 h-12 bg-amber-900/20 rounded-full overflow-hidden border border-amber-700/50">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${fac.name}`} alt={fac.name} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{fac.name}</h3>
                                        <p className="text-sm text-amber-500/80">{fac.course || 'Professor'}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 space-y-2">
                                    <div className="bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-500 uppercase font-bold block mb-1">Teaches</span>
                                        <div className="text-slate-200">
                                            {fac.subjects && fac.subjects.length > 0 ? fac.subjects.join(', ') : 'General Faculty'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 uppercase font-bold mr-2">Email:</span> {fac.email}
                                    </div>
                                    <div>
                                        <span className="text-slate-500 uppercase font-bold mr-2">Phone:</span> {fac.phoneNumber || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="text-slate-500 uppercase font-bold mr-2">Login ID:</span> <span className="font-mono text-green-500">{fac.id}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            )}

            {/* STUDENT CANDIDATES */}
            <div>
                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
                    <span className="mr-2 text-2xl">👨‍🎓</span> Student Talent Pool
                </h3>
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
                                <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-700">
                                    <span>Projects: {candidate.projectCount}</span>
                                    <span>Score: {candidate.avgScore}</span>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
};
