import { useEffect, useState } from 'react';
import { Brain, TrendingUp, DollarSign, Activity, BarChart3, PieChart as PieChartIcon, ArrowUpRight, Calendar, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AIChatbot from '../components/AIChatbot';
import DarkModeToggle from '../components/DarkModeToggle';
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{complaint.type}</h3>
                        <p className="text-sm opacity-70">📍 {complaint.latitude.toString().slice(0, 10)}, {complaint.longitude.toString().slice(0, 10)}</p>
                    </div>
                    <button onClick={onClose} className="text-2xl hover:opacity-50 dark:text-white">×</button>
                </div>
                <div style={{ height: '400px' }}>
                    <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={position}>
                            <Popup><strong>{complaint.type}</strong><br />{complaint.description?.slice(0, 100)}...</Popup>
                        </Marker>
                    </MapContainer>
                </div>
                <div className="p-4 flex gap-3 bg-slate-50 dark:bg-slate-800">
                    <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&z=18`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center py-3">🗺️ Google Maps</a>
                </div>
            </div>
        </div>
    );
};

export default function CompanyDashboard() {
    const { user, logout } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('overview'); // overview, list, map
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [mapModalComplaint, setMapModalComplaint] = useState(null);
    const [pendingUpdates, setPendingUpdates] = useState({});
    const [updating, setUpdating] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const center = { lat: 8.5241, lng: 76.9366 };

    const deptInfo = { name: 'TechCorp Services', icon: '🏢', gradient: 'from-blue-600 to-indigo-800' };

    const statusOptions = [
        { value: 'pending', label: '⏳ Pending', color: 'text-yellow-500' },
        { value: 'in_progress', label: '🔄 In Progress', color: 'text-blue-500' },
        { value: 'reviewed', label: '👁️ Reviewed', color: 'text-purple-500' },
        { value: 'rejected', label: '❌ Rejected', color: 'text-red-500' },
        { value: 'completed', label: '✅ Completed', color: 'text-green-500' },
    ];

    useEffect(() => {
        fetchComplaints();
        const interval = setInterval(() => {
            fetchComplaints();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchComplaints = async () => {
        try {
            const res = await axios.get('/complaints');
            setComplaints(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
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
            console.error('Update failed:', err);
            const errorMsg = err.response?.data?.msg || 'Failed to update status.';
            setMessage({ type: 'error', text: `❌ ${errorMsg}` });
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

    // Stats
    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'pending').length,
        inProgress: complaints.filter(c => c.status === 'in_progress').length,
        resolved: complaints.filter(c => c.status === 'completed').length,
    };

    const SidebarItem = ({ id, label, icon }) => (
        <button
            onClick={() => setView(id)}
            className={`sidebar-item w-full
            ${view === id ? 'active' : ''}`}
        >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
            {/* Ambient Background */}
            <div className="cyberpunk-bg"></div>

            {/* SIDEBAR */}
            <aside className="sidebar w-64 flex flex-col z-20">
                {/* Logo Area */}
                <div className="p-6 border-b border-slate-800">
                    <h1 className="tricolor-text text-3xl mb-1">COMPANY PORTAL</h1>
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${deptInfo.gradient} text-white mt-2`}>
                        <p className="text-sm font-bold flex items-center gap-2">{deptInfo.icon} {deptInfo.name}</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 overflow-y-auto">
                    <SidebarItem id="overview" label="Overview" icon="📊" />
                    <SidebarItem id="list" label="Support Tickets" icon="📋" />
                    <SidebarItem id="map" label="Global View" icon="🗺️" />
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${deptInfo.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                            {user?.role?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-sm truncate text-slate-100">{user?.username || 'TechCorp'}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@techcorp.com'}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="btn-danger w-full py-2 text-sm flex items-center justify-center gap-2">
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="page-header sticky top-0 z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100">
                        {view === 'overview' && '📊 Business Overview'}
                        {view === 'list' && '📋 Ticket Management'}
                        {view === 'map' && '🗺️ Geographic Distribution'}
                    </h2>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {message.text && (
                        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                            <p className="font-medium">{message.text}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <div className="loading-spinner w-12 h-12 mb-4"></div>
                            <p>Loading Data...</p>
                        </div>
                    ) : (
                        <>
                            {/* OVERVIEW VIEW */}
                            {view === 'overview' && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Welcome Banner */}
                                    <div className={`p-6 rounded-lg bg-gradient-to-r ${deptInfo.gradient} text-white shadow relative overflow-hidden`}>
                                        <div className="relative z-10">
                                            <h2 className="text-2xl font-bold mb-2">Welcome back, Team!</h2>
                                            <p className="opacity-90">You have <span className="font-bold text-yellow-200">{stats.pending} pending tickets</span>.</p>
                                        </div>
                                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12"></div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="stat-card navy relative group">
                                            <div className="flex justify-between items-start">
                                                <p>Total Tickets</p>
                                            </div>
                                            <p className="text-3xl font-bold">{stats.total}</p>
                                        </div>
                                        <div className="stat-card saffron relative group">
                                            <div className="flex justify-between items-start">
                                                <p>Pending</p>
                                            </div>
                                            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pending}</p>
                                        </div>
                                        <div className="stat-card relative group">
                                            <div className="flex justify-between items-start">
                                                <p>In Progress</p>
                                            </div>
                                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-500">{stats.inProgress}</p>
                                        </div>
                                        <div className="stat-card green relative group">
                                            <div className="flex justify-between items-start">
                                                <p>Resolved</p>
                                            </div>
                                            <p className="text-3xl font-bold text-green-600 dark:text-green-500">{stats.resolved}</p>
                                        </div>
                                    </div>

                                    {/* ANALYTICS CHARTS */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80">
                                        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col">
                                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                                <PieChartIcon size={18} className="text-purple-500" /> Issue Distribution
                                            </h3>
                                            <div className="flex-1 min-h-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Software', value: 40 }, { name: 'Hardware', value: 25 },
                                                                { name: 'Network', value: 15 }, { name: 'Access', value: 20 }
                                                            ]}
                                                            cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value"
                                                        >
                                                            {/* Colors: purple, blue, cyan, indigo */}
                                                            <Cell fill="#8b5cf6" /> <Cell fill="#3b82f6" /> <Cell fill="#06b6d4" /> <Cell fill="#6366f1" />
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col">
                                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                                <BarChart3 size={18} className="text-blue-500" /> Status Composition
                                            </h3>
                                            <div className="flex-1 min-h-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={[
                                                        { name: 'Mon', pending: 4, resolved: 2 }, { name: 'Tue', pending: 3, resolved: 5 },
                                                        { name: 'Wed', pending: 2, resolved: 3 }, { name: 'Thu', pending: 5, resolved: 4 },
                                                        { name: 'Fri', pending: 1, resolved: 6 }
                                                    ]}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                                        <Tooltip cursor={{ fill: '#334155' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Legend />
                                                        <Bar dataKey="pending" stackId="a" fill="#eab308" />
                                                        <Bar dataKey="resolved" stackId="a" fill="#22c55e" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LIST VIEW */}
                            {view === 'list' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="gov-card overflow-hidden p-0">
                                        <div className="overflow-x-auto">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Image</th>
                                                        <th>Ticket Details</th>
                                                        <th>Reported</th>
                                                        <th>Status</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {complaints.length === 0 ? (
                                                        <tr><td colSpan="5" className="text-center py-10 opacity-50">No tickets found.</td></tr>
                                                    ) : (
                                                        complaints.map((c) => {
                                                            const createdDT = formatDateTime(c.created_at);
                                                            const hasChanges = hasUnsavedChanges(c);
                                                            return (
                                                                <tr key={c.id}>
                                                                    <td>
                                                                        {c.image_url ?
                                                                            <img src={`http://localhost:5000${c.image_url}`} onError={(e) => e.target.style.display = 'none'} alt="Proof" className="w-20 h-16 rounded object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => setSelectedPhoto(`http://localhost:5000${c.image_url}`)} />
                                                                            : <div className="w-20 h-16 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] opacity-50">No Img</div>}
                                                                    </td>
                                                                    <td>
                                                                        <div className="font-bold text-lg text-slate-800 dark:text-slate-200">{c.type}</div>
                                                                        <p className="text-sm opacity-70 truncate max-w-[300px] mb-1 text-slate-600 dark:text-slate-400">{c.description}</p>
                                                                    </td>
                                                                    <td>
                                                                        <p className="text-sm font-medium">{createdDT.date}</p>
                                                                        <p className="text-xs opacity-50">{createdDT.time}</p>
                                                                    </td>
                                                                    <td>
                                                                        <select
                                                                            className={`text-sm py-1.5 px-3 rounded border focus:ring-2 focus:ring-indigo-500 cursor-pointer ${hasChanges ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                                                                            value={getDisplayStatus(c)}
                                                                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                                        >
                                                                            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                        </select>
                                                                    </td>
                                                                    <td>
                                                                        {hasChanges ? (
                                                                            <button onClick={() => updateStatus(c.id)} disabled={updating === c.id} className="btn-primary py-2 px-4 text-xs w-full">
                                                                                {updating === c.id ? '...' : 'Save'}
                                                                            </button>
                                                                        ) : (
                                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
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
                                </div>
                            )}

                            {/* MAP VIEW */}
                            {view === 'map' && (
                                <div className="h-full flex flex-col animate-fade-in text-slate-900">
                                    <div className="gov-card flex-1 p-0 overflow-hidden relative shadow-lg border-2 border-white dark:border-slate-700 rounded-lg">
                                        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            {complaints.filter(c => c.latitude).map((c) => (
                                                <Marker key={c.id} position={[parseFloat(c.latitude), parseFloat(c.longitude)]}>
                                                    <Popup>
                                                        <div className="min-w-[200px]">
                                                            <strong className="text-lg">{c.type}</strong>
                                                            <p className="text-sm opacity-80 mb-2">{c.description?.slice(0, 50)}...</p>
                                                            <div className="text-xs px-2 py-1 bg-slate-100 rounded inline-block mb-2">{getStatusLabel(c.status)}</div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            ))}
                                        </MapContainer>
                                    </div>
                                </div>
                            )}

                        </>
                    )}
                </div>
            </main>

            {selectedPhoto && <div className="photo-modal" onClick={() => setSelectedPhoto(null)}><img src={selectedPhoto} alt="Full size" /></div>}
            {mapModalComplaint && <MapModal complaint={mapModalComplaint} onClose={() => setMapModalComplaint(null)} />}
            <AIChatbot />
        </div>
    );
}
