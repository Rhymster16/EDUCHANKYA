
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db } from '../services/db';

interface AdminPortalProps {
    user: UserProfile;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ user }) => {
    const [csvData, setCsvData] = useState('');
    const [createdUsers, setCreatedUsers] = useState<UserProfile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // State for Master List
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        fetchAllUsers();
    }, [user.institutionId, createdUsers]); // Refresh when new users are added

    const fetchAllUsers = async () => {
        const users = await db.getUsersByInstitution(user.institutionId);
        // Sort by Role (Admin -> Faculty -> Student) then Name
        const sorted = users.sort((a, b) => {
            const roleOrder = { 'Admin': 0, 'Faculty': 1, 'Student': 2 };
            if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
            return a.name.localeCompare(b.name);
        });
        setAllUsers(sorted);
    };

    const handleBulkUpload = async () => {
        if (!csvData.trim()) return;
        setIsProcessing(true);
        setCreatedUsers([]);

        // Parse CSV-like text
        // Format expected: Name, Role (Student/Faculty), Email, Batch/Subjects, Course/Dept, Year, Phone
        const lines = csvData.split('\n').filter(line => line.trim().length > 0);
        const usersToCreate: Partial<UserProfile>[] = lines.map(line => {
            const [name, roleRaw, email, col4, col5, year, phone] = line.split(',').map(s => s.trim());
            
            // Normalize Role
            let role: 'Student' | 'Faculty' | 'Admin' = 'Student';
            if (roleRaw?.toLowerCase().includes('fac') || roleRaw?.toLowerCase().includes('teach')) role = 'Faculty';
            if (roleRaw?.toLowerCase().includes('admin')) role = 'Admin';

            // Column Mapping logic based on Role
            // For Student: col4 = Batch, col5 = Course
            // For Faculty: col4 = Subjects (semicolon separated), col5 = Department/Course
            
            let batch: string | undefined = undefined;
            let subjects: string[] | undefined = undefined;
            const course = col5;

            if (role === 'Faculty') {
                subjects = col4 ? col4.split(';').map(s => s.trim()) : [];
            } else {
                batch = col4;
            }

            return {
                name,
                role,
                email,
                batch,
                course,
                year,
                phoneNumber: phone,
                subjects
            };
        });

        try {
            const results = await db.bulkCreateUsers(user.institutionId, usersToCreate);
            setCreatedUsers(results);
            setCsvData('');
            fetchAllUsers(); // Refresh master list
        } catch (e) {
            alert("Error processing data. Please check format.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <header>
                <h2 className="text-3xl font-bold text-white">Administration Portal</h2>
                <p className="text-slate-400">User Management & Bulk Ingestion</p>
            </header>

            {/* Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Bulk User Creation (Excel Mode)</h3>
                    <p className="text-xs text-slate-400 mb-4">
                        Paste your Excel data here (Comma Separated).<br/>
                        <span className="font-mono text-blue-400">Format: Name, Role, Email, Batch/Subjects, Course/Dept, Year, Phone</span>
                    </p>
                    
                    <div className="bg-slate-900 p-3 rounded mb-4 text-xs font-mono text-slate-500 space-y-2">
                        <div>
                            <span className="text-slate-300 font-bold">Student Ex:</span><br/>
                            John Doe, Student, john@college.edu, 2024, CS, 1st Year, 9988776655
                        </div>
                        <div>
                            <span className="text-slate-300 font-bold">Faculty Ex:</span><br/>
                            Prof. Smith, Faculty, smith@college.edu, Algorithms;Data Structures, CS Dept, , 8877665544
                        </div>
                    </div>

                    <textarea 
                        className="w-full h-48 bg-slate-900 border border-slate-600 rounded p-4 text-sm text-white font-mono"
                        placeholder="Paste data here..."
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                    />

                    <button 
                        onClick={handleBulkUpload}
                        disabled={isProcessing}
                        className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg flex justify-center items-center"
                    >
                        {isProcessing ? (
                            <span className="animate-pulse">Processing...</span>
                        ) : (
                            <>
                                <span className="mr-2">⚡</span> Upload & Generate IDs
                            </>
                        )}
                    </button>
                </div>

                {/* Recent Results Section */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-4">Recently Generated Credentials</h3>
                    {createdUsers.length > 0 ? (
                        <div className="flex-1 overflow-y-auto bg-slate-900 rounded border border-slate-700 max-h-[400px]">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800 text-slate-500 font-bold uppercase text-xs sticky top-0">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Login ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {createdUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-800/50">
                                            <td className="p-3">
                                                <div className="font-medium">{u.name}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${u.role === 'Faculty' ? 'bg-amber-900 text-amber-400' : 'bg-blue-900 text-blue-400'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-green-400 font-bold select-all cursor-pointer" title="Click to copy">
                                                {u.id}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic border-2 border-dashed border-slate-700 rounded">
                            Upload data to see new credentials here.
                        </div>
                    )}
                    {createdUsers.length > 0 && (
                        <div className="mt-4 p-3 bg-green-900/20 text-green-400 text-xs rounded text-center">
                            Successfully created {createdUsers.length} users.
                        </div>
                    )}
                </div>
            </div>

            {/* MASTER DIRECTORY */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                 <h3 className="text-xl font-bold text-white mb-4">Master User Registry (All Users)</h3>
                 <div className="overflow-x-auto rounded border border-slate-700">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">User ID (Login)</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Academic Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                            {allUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-medium text-white">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                                {u.avatar && <img src={u.avatar} alt="av" />}
                                            </div>
                                            <span>{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            u.role === 'Admin' ? 'bg-purple-900 text-purple-300' :
                                            u.role === 'Faculty' ? 'bg-amber-900 text-amber-300' :
                                            'bg-blue-900 text-blue-300'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-green-400 select-all font-bold">
                                        {u.id}
                                    </td>
                                    <td className="p-4 text-xs text-slate-400">
                                        <div>{u.email}</div>
                                        <div>{u.phoneNumber}</div>
                                    </td>
                                    <td className="p-4 text-xs text-slate-400">
                                        {u.role === 'Student' && (
                                            <>
                                                <div>{u.course}</div>
                                                <div>{u.batch} • {u.year}</div>
                                            </>
                                        )}
                                        {u.role === 'Faculty' && (
                                            <div className="text-amber-500/80">
                                                {u.subjects?.join(', ')}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};
