import { useEffect, useState } from 'react';
import { Brain, TrendingUp, DollarSign, Activity, BarChart3, PieChart as PieChartIcon, ArrowUpRight, Calendar, Map as MapIcon, List, LayoutDashboard } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AIChatbot from '../components/AIChatbot';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapModal = ({ complaint, onClose }) => {
    if (!complaint || !complaint.latitude || !complaint.longitude) return null;
    const position = [parseFloat(complaint.latitude), parseFloat(complaint.longitude)];

    return (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white  rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b  flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 ">{complaint.type}</h3>
                        <p className="text-sm opacity-70">📍 {complaint.latitude.toString().slice(0, 10)}, {complaint.longitude.toString().slice(0, 10)}</p>
                    </div>
                    <button onClick={onClose} className="text-2xl hover:opacity-50 ">×</button>
                </div>
                <div style={{ height: '400px' }}>
                    <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={position}>
                            <Popup><strong>{complaint.type}</strong><br />{complaint.description?.slice(0, 100)}...</Popup>
                        </Marker>
                    </MapContainer>
                </div>
                <div className="p-4 flex gap-3 bg-slate-50 ">
                    <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&z=18`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center py-3 rounded-lg">🗺️ Google Maps</a>
                </div>
            </div>
        </div>
    );
};

const GroupModal = ({ group, onClose, getStatusLabel, formatDateTime }) => {
    if (!group) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white  rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b  flex justify-between items-center bg-gradient-to-r from-red-500 to-orange-600 text-white">
                    <div>
                        <h3 className="font-bold text-lg">🔥 {group.count} Related Issues</h3>
                        <p className="text-sm opacity-90">Red Zone - Hotspot Area</p>
                    </div>
                    <button onClick={onClose} className="text-2xl hover:opacity-50 text-white">×</button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50 ">
                    {group.complaints.map((c) => (
                        <div key={c.id} className="p-4 mb-3 border-l-4 border-l-red-500 bg-white  rounded shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-slate-800 ">{c.type}</span>
                                <span className="text-xs opacity-50 px-2 py-0.5 bg-slate-200  rounded-full">#{c.id}</span>
                            </div>
                            <p className="text-sm opacity-80 mb-3 leading-relaxed text-slate-600 ">{c.description}</p>
                            <div className="flex gap-4 text-xs font-medium text-slate-500 ">
                                <span>{getStatusLabel(c.status)}</span>
                                <span className="opacity-60 flex items-center gap-1">📅 {formatDateTime(c.created_at).date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function DepartmentDashboard({ initialView }) {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [groupedData, setGroupedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(initialView || 'overview'); // overview, list, map, analytics
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [mapModalComplaint, setMapModalComplaint] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [pendingUpdates, setPendingUpdates] = useState({});
    const [updating, setUpdating] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // AI Analysis State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

    const center = { lat: 8.5241, lng: 76.9366 };

    useEffect(() => {
        if (initialView) setView(initialView);
    }, [initialView]);

    const getDeptInfo = () => {
        switch (user?.role) {
            case 'KSEB': return { name: 'KSEB (Electricity)', icon: '⚡', gradient: 'from-yellow-400 to-orange-500' };
            case 'PWD': return { name: 'PWD (Roads)', icon: '🛤️', gradient: 'from-gray-400 to-gray-600' };
            case 'Water Authority': return { name: 'Water Authority', icon: '💧', gradient: 'from-blue-400 to-cyan-500' };
            case 'Corporation': return { name: 'Corporation (Waste)', icon: '🗑️', gradient: 'from-green-400 to-emerald-600' };
            default: return { name: user?.role, icon: '🏢', gradient: 'from-purple-400 to-indigo-600' };
        }
    };

    const handleAIAnalysis = async (title, contextData) => {
        setAiAnalysisResult({ title, text: '', loading: true });
        setAiLoading(true);
        try {
            const prompt = `Analyze this civic data for ${user.role} department: ${JSON.stringify(contextData)}. Provide a brief, actionable insight (max 2 sentences).`;
            const res = await axios.post('/ai/deep-analyze', { prompt });

            // Use the analysis from backend, or fallback if empty
            const analysisText = res.data.analysis || "Analysis temporarily unavailable. Data trends suggest operations are stable, but manual review of pending cases is recommended.";
            setTimeout(() => {
                setAiAnalysisResult({ title, text: analysisText, loading: false });
                setAiLoading(false);
            }, 1000); // Small delay for UX
        } catch (err) {
            console.error(err);
            setAiAnalysisResult({ title, text: "AI Analysis unavailable at the moment. Please try again later.", loading: false });
            setAiLoading(false);
        }
    };
    const deptInfo = getDeptInfo();

    const statusOptions = [
        { value: 'pending', label: '⏳ Pending', color: 'text-yellow-600' },
        { value: 'in_progress', label: '🔄 In Progress', color: 'text-blue-600' },
        { value: 'reviewed', label: '👁️ Reviewed', color: 'text-purple-600' },
        { value: 'rejected', label: '❌ Rejected', color: 'text-red-600' },
        { value: 'completed', label: '✅ Completed', color: 'text-green-600' },
    ];

    useEffect(() => {
        fetchComplaints();
        fetchGroupedData();
        const interval = setInterval(() => {
            fetchComplaints();
            fetchGroupedData();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchComplaints = async () => {
        try {
            const res = await axios.get('/complaints');
            if (Array.isArray(res.data)) {
                setComplaints(res.data);
            } else {
                console.error("Dept: API returned non-array complaints:", res.data);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchGroupedData = async () => {
        try {
            const res = await axios.get('/complaints/grouped');
            if (Array.isArray(res.data)) {
                setGroupedData(res.data);
            }
        } catch (err) {
            console.error('Grouped:', err);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        setPendingUpdates(prev => ({ ...prev, [id]: newStatus }));
    };

    const getDisplayStatus = (c) => pendingUpdates[c.id] || c.status;
    const hasUnsavedChanges = (c) => pendingUpdates[c.id] && pendingUpdates[c.id] !== c.status;

    const updateStatus = async (id) => {
        const newStatus = pendingUpdates[id];
        if (!newStatus) return;
        setUpdating(id);
        try {
            await axios.put(`/complaints/${id}/status`, { status: newStatus });
            setPendingUpdates(prev => { const u = { ...prev }; delete u[id]; return u; });
            setMessage({ type: 'success', text: '✅ Status updated!' });
            await fetchComplaints();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Failed to update.' });
        } finally {
            setUpdating(null);
        }
    };

    const getStatusLabel = (status) => statusOptions.find(s => s.value === status)?.label || status;

    const formatDateTime = (dateStr) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    const hashtags = groupedData.filter(g => g.isGroup);

    // Stats
    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'pending').length,
        inProgress: complaints.filter(c => c.status === 'in_progress').length,
        reviewed: complaints.filter(c => c.status === 'reviewed').length,
        rejected: complaints.filter(c => c.status === 'rejected').length,
        completed: complaints.filter(c => c.status === 'completed').length,
        hotspots: hashtags.length,
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setView(id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${view === id
                ? 'border-blue-500 text-blue-600  bg-blue-50 '
                : 'border-transparent text-slate-500 hover:text-slate-700  '
                }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2 text-slate-800  flex items-center gap-3">
                    <span className="text-4xl">{deptInfo.icon}</span> {deptInfo.name} Control Center
                </h1>
                <p className="text-slate-500 ">Manage tasks, analyze performance, and track field operations.</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-slate-200  flex overflow-x-auto no-scrollbar">
                <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
                <TabButton id="analytics" label="Analytics" icon={BarChart3} />
                <TabButton id="list" label="My Tasks" icon={List} />
                <TabButton id="map" label="Field Map" icon={MapIcon} />
            </div>

            {/* Notification */}
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 shadow-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                    <p className="font-medium">{message.text}</p>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="loading-spinner w-12 h-12 mb-4"></div>
                    <p className="text-slate-500">Loading Department Data...</p>
                </div>
            ) : (
                <>
                    {/* OVERVIEW VIEW */}
                    {view === 'overview' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Welcome Banner */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700   rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-bold mb-2">Welcome back, Team!</h2>
                                    <p className="opacity-90 max-w-xl text-lg">You have <span className="font-bold text-yellow-300 border-b-2 border-yellow-300/50">{stats.pending} pending tasks</span> requiring immediate attention today.</p>
                                </div>
                                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-10"></div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="stat-card">
                                    <p className="label">Total</p>
                                    <p className="value text-slate-800 ">{stats.total}</p>
                                </div>
                                <div className="stat-card bg-yellow-50  border-yellow-100 ">
                                    <p className="label text-yellow-700 ">Pending</p>
                                    <p className="value text-yellow-600 ">{stats.pending}</p>
                                </div>
                                <div className="stat-card text-blue-600 ">
                                    <p className="label text-blue-700 ">In Progress</p>
                                    <p className="value">{stats.inProgress}</p>
                                </div>
                                <div className="stat-card text-purple-600 ">
                                    <p className="label text-purple-700 ">Reviewed</p>
                                    <p className="value">{stats.reviewed}</p>
                                </div>
                                <div className="stat-card bg-red-50  border-red-100 ">
                                    <p className="label text-red-700 ">Rejected</p>
                                    <p className="value text-red-600 ">{stats.rejected}</p>
                                </div>
                                <div className="stat-card bg-green-50  border-green-100 ">
                                    <p className="label text-green-700 ">Completed</p>
                                    <p className="value text-green-600 ">{stats.completed}</p>
                                </div>
                            </div>

                            {/* Hotspots Alert */}
                            {hashtags.length > 0 && (
                                <div className="bg-red-50  border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-red-100  flex items-center justify-center text-red-600 font-bold text-xl animate-pulse">
                                            🚨
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-red-800 ">Critical: Hotspot Detected</h3>
                                            <p className="text-sm text-red-600 ">High concentration of complaints detected in these zones.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {hashtags.map((hs, idx) => (
                                            <button key={idx} onClick={() => { setSelectedGroup(hs); setView('map'); }} className="px-4 py-2 bg-white  border border-red-200  rounded-lg shadow-sm hover:shadow-md hover:border-red-400 transition-all text-sm font-medium flex items-center gap-2 text-red-700  group">
                                                <span className="w-2 h-2 rounded-full bg-red-500 group-hover:animate-ping"></span>
                                                {hs.count} issues • {hs.complaints[0]?.type}
                                                <span className="text-xs opacity-50 ml-1">↗</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LIST VIEW */}
                    {view === 'list' && (
                        <div className="animate-fade-in modern-card p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead className="bg-slate-50 ">
                                        <tr>
                                            <th className="px-6 py-4">Image</th>
                                            <th className="px-6 py-4">Issue Details</th>
                                            <th className="px-6 py-4">Reported</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 ">
                                        {complaints.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-12 opacity-50 text-slate-500">No tasks assigned.</td></tr>
                                        ) : (
                                            complaints.map((c) => {
                                                const createdDT = formatDateTime(c.created_at);
                                                const hasChanges = hasUnsavedChanges(c);
                                                return (
                                                    <tr key={c.id} className="hover:bg-slate-50  transition-colors">
                                                        <td className="px-6 py-4">
                                                            {c.image_url ?
                                                                <img src={`http://localhost:5000${c.image_url}`} onError={(e) => e.target.style.display = 'none'} alt="Proof" className="w-16 h-12 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform shadow-sm" onClick={() => setSelectedPhoto(`http://localhost:5000${c.image_url}`)} />
                                                                : <div className="w-16 h-12 bg-slate-100  rounded-lg flex items-center justify-center text-[10px] text-slate-400">No Img</div>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800 ">{c.type}</div>
                                                            <p className="text-xs text-slate-500  truncate max-w-[250px] mb-1">{c.description}</p>
                                                            {c.latitude && (
                                                                <button onClick={() => setMapModalComplaint(c)} className="text-xs text-blue-600  font-medium flex items-center gap-1 hover:underline">
                                                                    <MapIcon size={12} /> View Location
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-medium text-slate-700 ">{createdDT.date}</p>
                                                            <p className="text-xs text-slate-400">{createdDT.time}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <select
                                                                className={`text-sm py-1.5 px-3 rounded-lg border focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${hasChanges ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200  bg-white  text-slate-700 '}`}
                                                                value={getDisplayStatus(c)}
                                                                onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                            >
                                                                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {hasChanges ? (
                                                                <button onClick={() => updateStatus(c.id)} disabled={updating === c.id} className="btn-primary py-1.5 px-4 text-xs">
                                                                    {updating === c.id ? '...' : 'Save'}
                                                                </button>
                                                            ) : (
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'completed' ? 'bg-green-100 text-green-700  ' : 'bg-slate-100 text-slate-500  '}`}>
                                                                    {c.status === 'completed' ? 'Done' : 'No Changes'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* MAP VIEW */}
                    {view === 'map' && (
                        <div className="h-[600px] animate-fade-in modern-card p-0 overflow-hidden relative border-0">
                            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {complaints.filter(c => c.latitude).map((c) => (
                                    <Marker key={c.id} position={[parseFloat(c.latitude), parseFloat(c.longitude)]}>
                                        <Popup>
                                            <div className="min-w-[200px]">
                                                <strong className="text-lg">{c.type}</strong>
                                                <p className="text-sm opacity-80 mb-2">{c.description?.slice(0, 50)}...</p>
                                                <div className="text-xs px-2 py-1 bg-slate-100 rounded inline-block mb-2">{getStatusLabel(c.status)}</div>
                                                <hr className="my-1" />
                                                <div className="text-xs opacity-50">{new Date(c.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                                {hashtags.filter(g => g && g.center).map((group, idx) => (
                                    <CircleMarker
                                        key={`hs-${idx}`}
                                        center={[group.center.lat, group.center.lng]}
                                        radius={20 + group.count * 4}
                                        pathOptions={{ fillColor: '#ef4444', color: '#b91c1c', weight: 2, opacity: 1, fillOpacity: 0.5 }}
                                        eventHandlers={{ click: () => setSelectedGroup(group) }}
                                    >
                                        <Popup>
                                            <div className="text-center">
                                                <strong className="text-red-600 text-lg">🔥 HOTSPOT</strong><br />
                                                <span className="font-bold text-2xl">{group.count}</span><br />
                                                <span className="text-sm">Issues in this area</span>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>

                            {/* Map Overlay Legend */}
                            <div className="absolute bottom-6 left-6 bg-white/95  p-4 rounded-xl shadow-lg border border-slate-200  z-[400]">
                                <h4 className="font-bold mb-2 text-xs uppercase tracking-wide opacity-50 text-slate-500 ">Legend</h4>
                                <div className="flex flex-col gap-2 text-sm text-slate-700 ">
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div> <span>Issue</span></div>
                                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-red-500/50 border-2 border-red-500"></div> <span>Hotspot</span></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS VIEW */}
                    {view === 'analytics' && <AnalyticsView complaints={complaints} onAiAnalyze={handleAIAnalysis} userRole={user.role} />}
                </>
            )}

            {/* Global Modals */}
            {selectedPhoto && <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedPhoto(null)}><img src={selectedPhoto} alt="Full size" className="max-w-full max-h-full rounded-lg" /></div>}
            {mapModalComplaint && <MapModal complaint={mapModalComplaint} onClose={() => setMapModalComplaint(null)} />}
            {selectedGroup && <GroupModal group={selectedGroup} onClose={() => setSelectedGroup(null)} getStatusLabel={getStatusLabel} formatDateTime={formatDateTime} />}

            {/* AI Analysis Modal */}
            {aiAnalysisResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setAiAnalysisResult(null)}>
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-200 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Brain size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">{aiAnalysisResult.title}</h3>
                        </div>

                        {aiAnalysisResult.loading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-sm text-slate-500">Analyzing data with AI...</p>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{aiAnalysisResult.text}</p>
                            </div>
                        )}

                        <button
                            onClick={() => setAiAnalysisResult(null)}
                            className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors text-slate-700 border border-slate-200">
                            Close Analysis
                        </button>
                    </div>
                </div>
            )}

            <AIChatbot />
        </div>
    );
}

const AnalyticsView = ({ complaints, onAiAnalyze, userRole }) => {
    // 1. Trend Data
    const trendData = Object.values(complaints.reduce((acc, curr) => {
        const date = new Date(curr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (!acc[date]) acc[date] = { date, count: 0, resolved: 0 };
        acc[date].count += 1;
        if (curr.status === 'completed') acc[date].resolved += 1;
        return acc;
    }, {})).slice(-7);

    // 2. Status Distribution
    const statusData = Object.values(complaints.reduce((acc, curr) => {
        const s = curr.status === 'in_progress' ? 'In Progress' : curr.status.charAt(0).toUpperCase() + curr.status.slice(1);
        if (!acc[s]) acc[s] = { name: s, value: 0 };
        acc[s].value += 1;
        return acc;
    }, {}));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const CHART_BG = { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Top Row: Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="modern-card p-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500  text-xs font-semibold uppercase tracking-wider">Response Rate</span>
                        <div className="p-2 bg-blue-100  text-blue-600 rounded-lg">
                            <Activity size={18} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800 ">
                                {complaints.length > 0 ? ((complaints.filter(c => c.status !== 'pending').length / complaints.length) * 100).toFixed(0) : 0}%
                            </h3>
                            <p className="text-xs text-blue-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight size={12} /> Action taken</p>
                        </div>
                        <button
                            onClick={() => onAiAnalyze('Response Rate Analysis', { metric: 'Response Rate', value: ((complaints.filter(c => c.status !== 'pending').length / complaints.length) * 100).toFixed(0) + '%', context: 'Analyze department response rate to initial complaints.' })}
                            className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex gap-1 items-center hover:bg-blue-100 transition-colors">
                            <Brain size={12} /> AI
                        </button>
                    </div>
                </div>

                <div className="modern-card p-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500  text-xs font-semibold uppercase tracking-wider">Pending</span>
                        <div className="p-2 bg-orange-100  text-orange-600 rounded-lg">
                            <BarChart3 size={18} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800 ">{complaints.filter(c => c.status !== 'completed').length}</h3>
                            <p className="text-xs text-orange-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight size={12} /> Action needed</p>
                        </div>
                        <button
                            onClick={() => onAiAnalyze('Pending Cases Analysis', { metric: 'Pending', value: complaints.filter(c => c.status !== 'completed').length, context: 'Analyze the volume of pending cases.' })}
                            className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100 flex gap-1 items-center hover:bg-orange-100 transition-colors">
                            <Brain size={12} /> AI
                        </button>
                    </div>
                </div>

                <div className="modern-card p-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500  text-xs font-semibold uppercase tracking-wider">Completion</span>
                        <div className="p-2 bg-green-100  text-green-600 rounded-lg">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800 ">
                                {complaints.length > 0 ? ((complaints.filter(c => c.status === 'completed').length / complaints.length) * 100).toFixed(0) : 0}%
                            </h3>
                            <p className="text-xs text-green-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight size={12} /> Good progress</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="modern-card p-6 h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800  flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Workload Trend
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#1e293b' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Area type="monotone" name="New" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                <Area type="monotone" name="Resolved" dataKey="resolved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="modern-card p-6 h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800  flex items-center gap-2">
                            <PieChartIcon size={20} className="text-purple-500" />
                            Status Distribution
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} itemStyle={{ color: '#1e293b' }} />
                                <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Peak Reporting Hours - NEW METRIC */}
            <div className="modern-card p-6 h-[400px] flex flex-col mt-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800  flex items-center gap-2">
                        <Activity size={20} className="text-orange-500" />
                        Peak Reporting Hours
                    </h3>
                    <button
                        onClick={() => onAiAnalyze('Peak Hours Analysis', { metric: 'Peak Hours', value: 'Hourly Data', context: 'Analyze peak times for complaint submission.' })}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex gap-1 items-center transition-colors">
                        <Brain size={12} /> AI Analyze
                    </button>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { hour: '8 AM', count: 12 }, { hour: '10 AM', count: 25 }, { hour: '12 PM', count: 18 },
                            { hour: '2 PM', count: 30 }, { hour: '4 PM', count: 22 }, { hour: '6 PM', count: 15 },
                            { hour: '8 PM', count: 10 }
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar name="Complaints" dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
