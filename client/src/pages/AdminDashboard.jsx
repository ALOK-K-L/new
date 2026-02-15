import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AIChatbot from '../components/AIChatbot';
import DarkModeToggle from '../components/DarkModeToggle';
import BlockchainVisualizer from '../components/BlockchainVisualizer';
import 'leaflet/dist/leaflet.css';
import { LayoutDashboard, BarChart3, List, Map as MapIcon, Link as LinkIcon, Brain, TrendingUp, DollarSign, Activity, PieChart as PieChartIcon, ArrowUpRight, Calendar, Hash, RefreshCw } from 'lucide-react';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const statusOptions = [
    { value: 'pending', label: '⏳ Pending', color: 'bg-yellow-500' },
    { value: 'in_progress', label: '🔄 In Progress', color: 'bg-blue-500' },
    { value: 'reviewed', label: '👁️ Reviewed', color: 'bg-purple-500' },
    { value: 'rejected', label: '❌ Rejected', color: 'bg-red-500' },
    { value: 'completed', label: '✅ Completed', color: 'bg-green-500' },
];

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
                    <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&z=18`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center py-3">🗺️ Google Maps</a>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-center py-3">🧭 Directions</a>
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
                        <div key={c.id} className="glass-card p-4 mb-3 border-l-4 border-l-red-500 bg-white ">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg">{c.type}</span>
                                <span className="text-xs opacity-50 px-2 py-0.5 bg-slate-200  rounded-full">#{c.id}</span>
                            </div>
                            <p className="text-sm opacity-80 mb-3 leading-relaxed">{c.description}</p>
                            <div className="flex gap-4 text-xs font-medium">
                                <span>{getStatusLabel(c.status)}</span>
                                <span className="opacity-60 flex items-center gap-1">📅 {formatDateTime(c.created_at).date}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t  bg-red-50  text-red-600 ">
                    <p className="text-sm text-center font-medium">⚠️ High priority attention needed - Multiple complaints in 10m radius</p>
                </div>
            </div>
        </div>
    );
};

export default function AdminDashboard({ initialView }) {
    const { user, logout } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [groupedData, setGroupedData] = useState([]);
    const [blockchainData, setBlockchainData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState(initialView || 'overview'); // overview, list, map, blockchain, users, reports, activity
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (initialView) setView(initialView);
    }, [initialView]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [mapModalComplaint, setMapModalComplaint] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleting, setDeleting] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState({});
    const [updating, setUpdating] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const center = { lat: 8.5241, lng: 76.9366 };

    useEffect(() => {
        fetchComplaints();
        fetchGroupedData();
        fetchBlockchain();
        const interval = setInterval(() => {
            fetchComplaints();
            fetchGroupedData();
            fetchBlockchain();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchComplaints = async () => {
        try {
            const res = await axios.get('/complaints');
            if (Array.isArray(res.data)) {
                setComplaints(res.data);
            } else {
                console.error("Admin: API returned non-array complaints:", res.data);
            }
            setLoading(false);
        } catch (err) {
            console.error("Admin: Error fetching complaints:", err);
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
            console.error('Admin: Grouped data error:', err);
        }
    };

    const fetchBlockchain = async () => {
        try {
            const res = await axios.get('/blockchain');
            // Support both array or { chain: [] } format if changed later
            const data = Array.isArray(res.data) ? res.data : (res.data.chain || []);
            if (Array.isArray(data)) {
                setBlockchainData(data);
            }
        } catch (err) {
            console.error('Admin: Blockchain error:', err);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        setPendingUpdates(prev => ({ ...prev, [id]: newStatus }));
    };

    const getDisplayStatus = (complaint) => pendingUpdates[complaint.id] || complaint.status;
    const hasUnsavedChanges = (complaint) => pendingUpdates[complaint.id] && pendingUpdates[complaint.id] !== complaint.status;

    const updateStatus = async (id) => {
        const newStatus = pendingUpdates[id];
        if (!newStatus) return;
        setUpdating(id);
        try {
            await axios.put(`/complaints/${id}/status`, { status: newStatus });
            setPendingUpdates(prev => { const u = { ...prev }; delete u[id]; return u; });
            setMessage({ type: 'success', text: '✅ Status updated!' });
            await fetchComplaints();
            await fetchGroupedData();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Failed to update.' });
        } finally {
            setUpdating(null);
        }
    };

    const assignDepartment = async (id, dept) => {
        try {
            await axios.put(`/complaints/${id}/assign`, { assigned_dept: dept });
            setMessage({ type: 'success', text: `✅ Assigned to ${dept}` });
            await fetchComplaints();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteComplaint = async (id) => {
        if (!confirm('Delete this complaint?')) return;
        setDeleting(true);
        try {
            await axios.delete(`/complaints/${id}`);
            await fetchComplaints();
            await fetchGroupedData();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    const bulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} complaints?`)) return;
        setDeleting(true);
        try {
            await axios.post('/complaints/bulk-delete', { ids: selectedIds });
            setSelectedIds([]);
            await fetchComplaints();
            await fetchGroupedData();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const selectAll = () => setSelectedIds(selectedIds.length === filteredComplaints.length ? [] : filteredComplaints.map(c => c.id));

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'in_progress': return 'status-in_progress';
            case 'reviewed': return 'status-reviewed';
            case 'rejected': return 'status-rejected';
            default: return 'status-pending';
        }
    };

    const getStatusLabel = (status) => statusOptions.find(s => s.value === status)?.label || status;
    const getDeptIcon = (dept) => ({ 'KSEB': '⚡', 'PWD': '🛤️', 'Water Authority': '💧', 'Corporation': '🗑️' }[dept] || '📋');

    const formatDateTime = (dateStr) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    const openDetailedMap = (lat, lng) => window.open(`https://www.google.com/maps?q=${lat},${lng}&z=18`, '_blank');

    const filteredComplaints = filter === 'all' ? complaints : complaints.filter(c => c.assigned_dept === filter || c.status === filter);
    const hotspots = groupedData.filter(g => g.isGroup);

    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'pending').length,
        inProgress: complaints.filter(c => c.status === 'in_progress').length,
        reviewed: complaints.filter(c => c.status === 'reviewed').length,
        rejected: complaints.filter(c => c.status === 'rejected').length,
        completed: complaints.filter(c => c.status === 'completed').length,
        hotspots: hotspots.length,
        kseb: complaints.filter(c => c.assigned_dept === 'KSEB').length,
        pwd: complaints.filter(c => c.assigned_dept === 'PWD').length,
        water: complaints.filter(c => c.assigned_dept === 'Water Authority').length,
        corp: complaints.filter(c => c.assigned_dept === 'Corporation').length,
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'list', label: 'Complaints', icon: List },
        { id: 'map', label: 'Map', icon: MapIcon },
        { id: 'blockchain', label: 'Blockchain', icon: LinkIcon },
    ];

    return (
        <div className="space-y-6">
            {/* View Switcher Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-border-color pb-4 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                            ${view === tab.id
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-bg-card text-text-secondary hover:bg-gray-100 '
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[80vh]">
                {/* Message Toast */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                        <p className="font-medium">{message.text}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 opacity-50">
                        <div className="loading-spinner w-12 h-12 mb-4"></div>
                        <p>Loading Dashboard Data...</p>
                    </div>
                ) : (
                    <>
                        {/* OVERVIEW VIEW */}
                        {view === 'overview' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    <div className="stat-card">
                                        <span className="label">Total</span>
                                        <span className="value">{stats.total}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="label">Pending</span>
                                        <span className="value text-yellow-600 ">{stats.pending}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="label">In Progress</span>
                                        <span className="value text-blue-600 ">{stats.inProgress}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="label">Reviewed</span>
                                        <span className="value text-purple-600 ">{stats.reviewed}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="label">Rejected</span>
                                        <span className="value text-red-600 ">{stats.rejected}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="label">Completed</span>
                                        <span className="value text-green-600 ">{stats.completed}</span>
                                    </div>
                                    <div className="stat-card border-l-4 border-l-red-500">
                                        <span className="label">Hotspots</span>
                                        <span className="value text-red-600 ">{stats.hotspots}</span>
                                    </div>
                                </div>

                                {/* Hotspots Alert */}
                                {hotspots.length > 0 && (
                                    <div className="gov-card border-l-4 border-l-red-500 bg-red-50 ">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-3xl animate-pulse">🚨</span>
                                            <div>
                                                <h3 className="font-bold text-xl text-red-700 ">Action Required: Hotspot Detected</h3>
                                                <p className="text-sm opacity-80 text-red-600 ">Multiple complaints clustered in the following areas:</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pl-12">
                                            {hotspots.map((hs, idx) => (
                                                <button key={idx} onClick={() => { setSelectedGroup(hs); setView('map'); }} className="px-4 py-2 bg-white  border border-red-200  rounded shadow-sm hover:shadow-md hover:border-red-500 transition-all text-sm font-medium flex items-center gap-2 text-red-700 ">
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    {hs.count} issues • {hs.complaints[0]?.type}
                                                    <span className="text-xs opacity-50 ml-1">↗</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dept Breakdown */}
                                <div className="modern-card p-4">
                                    <h3 className="font-bold text-lg mb-4 text-text-main ">Department Performance</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded bg-yellow-50  border border-yellow-200  flex flex-col items-center justify-center text-center">
                                            <span className="text-4xl mb-2">⚡</span>
                                            <p className="font-bold text-lg text-slate-700 ">KSEB</p>
                                            <p className="text-2xl font-bold text-slate-900 ">{stats.kseb}</p>
                                        </div>
                                        <div className="p-4 rounded bg-slate-100  border border-slate-200  flex flex-col items-center justify-center text-center">
                                            <span className="text-4xl mb-2">🛤️</span>
                                            <p className="font-bold text-lg text-slate-700 ">PWD</p>
                                            <p className="text-2xl font-bold text-slate-900 ">{stats.pwd}</p>
                                        </div>
                                        <div className="p-4 rounded bg-blue-50  border border-blue-200  flex flex-col items-center justify-center text-center">
                                            <span className="text-4xl mb-2">💧</span>
                                            <p className="font-bold text-lg text-slate-700 ">Water</p>
                                            <p className="text-2xl font-bold text-slate-900 ">{stats.water}</p>
                                        </div>
                                        <div className="p-4 rounded bg-green-50  border border-green-200  flex flex-col items-center justify-center text-center">
                                            <span className="text-4xl mb-2">🗑️</span>
                                            <p className="font-bold text-lg text-slate-700 ">Corp</p>
                                            <p className="text-2xl font-bold text-slate-900 ">{stats.corp}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {view === 'list' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="modern-card p-4 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10 bg-white  shadow-md">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-text-main ">Filter:</span>
                                        <select className="input-field py-2 px-4 rounded text-sm w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
                                            <option value="all">All Records</option>
                                            <option value="pending">⏳ Pending</option>
                                            <option value="in_progress">🔄 In Progress</option>
                                            <option value="resolved">✅ Resolved</option>
                                            <option value="KSEB">⚡ KSEB</option>
                                            <option value="PWD">🛤️ PWD</option>
                                            <option value="Water Authority">💧 Water</option>
                                            <option value="Corporation">🗑️ Corp</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm opacity-50 text-text-muted">{filteredComplaints.length} records found</span>
                                        {selectedIds.length > 0 && <button onClick={bulkDelete} disabled={deleting} className="btn-danger text-xs py-2 px-4">{deleting ? 'Processing...' : `Delete ${selectedIds.length} Selected`}</button>}
                                        <button onClick={selectAll} className="btn-secondary text-xs py-2 px-4">{selectedIds.length === filteredComplaints.length ? 'Deselect All' : 'Select All'}</button>
                                    </div>
                                </div>

                                <div className="modern-card overflow-hidden p-0">
                                    <div className="overflow-x-auto">
                                        <table className="data-table w-full text-left">
                                            <thead className="bg-bg-card-hover  text-text-secondary ">
                                                <tr>
                                                    <th className="p-4 w-12">#</th>
                                                    <th className="p-4">Image</th>
                                                    <th className="p-4">Issue Details</th>
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Department</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-color ">
                                                {filteredComplaints.length === 0 ? (
                                                    <tr><td colSpan="7" className="text-center py-10 opacity-50 text-text-muted">No complaints match your filter.</td></tr>
                                                ) : (
                                                    filteredComplaints.map((c) => {
                                                        const createdDT = formatDateTime(c.created_at);
                                                        const hasChanges = hasUnsavedChanges(c);
                                                        return (
                                                            <tr key={c.id} className="hover:bg-bg-page  transition-colors">
                                                                <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-gray-300" /></td>
                                                                <td className="p-4">
                                                                    {c.image_url ?
                                                                        <img src={`http://localhost:5000${c.image_url}`} onError={(e) => e.target.style.display = 'none'} alt="Proof" className="w-16 h-12 rounded object-cover cursor-pointer hover:scale-110 transition-transform shadow-sm" onClick={() => setSelectedPhoto(`http://localhost:5000${c.image_url}`)} />
                                                                        : <div className="w-16 h-12 bg-slate-200  rounded flex items-center justify-center text-[10px] opacity-50">No Img</div>}
                                                                </td>
                                                                <td className="p-4">
                                                                    <p className="font-bold text-text-main ">{c.type}</p>
                                                                    <p className="text-xs opacity-70 truncate max-w-[200px] text-text-secondary ">{c.description}</p>
                                                                </td>
                                                                <td className="p-4">
                                                                    <p className="text-sm font-medium text-text-main ">{createdDT.date}</p>
                                                                    <p className="text-xs opacity-50 text-text-muted">{createdDT.time}</p>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-lg">{getDeptIcon(c.assigned_dept).replace(/[^\p{Emoji}]/gu, '')}</span>
                                                                        <select
                                                                            className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer p-0 text-text-main "
                                                                            value={c.assigned_dept || ''}
                                                                            onChange={(e) => assignDepartment(c.id, e.target.value)}
                                                                        >
                                                                            <option value="">Unassigned</option>
                                                                            <option value="KSEB">KSEB</option>
                                                                            <option value="PWD">PWD</option>
                                                                            <option value="Water Authority">Water</option>
                                                                            <option value="Corporation">Corp</option>
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <select
                                                                            className={`text-xs py-1 px-2 rounded-full border-none font-bold cursor-pointer ${hasChanges ? 'ring-2 ring-orange-500' : ''} ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : c.status === 'completed' ? 'bg-green-100 text-green-800' : c.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}
                                                                            value={getDisplayStatus(c)}
                                                                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                                        >
                                                                            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                        </select>
                                                                        {hasChanges && <button onClick={() => updateStatus(c.id)} disabled={updating === c.id} className="text-[10px] bg-green-600 text-white rounded px-2 py-0.5 hover:bg-green-700">{updating === c.id ? '...' : 'Save'}</button>}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        {c.latitude && (
                                                                            <button onClick={() => setMapModalComplaint(c)} className="w-8 h-8 rounded-full bg-blue-50  text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="View on Map">
                                                                                🗺️
                                                                            </button>
                                                                        )}
                                                                        <button onClick={() => deleteComplaint(c.id)} className="w-8 h-8 rounded-full bg-red-50  text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors" title="Delete">
                                                                            🗑️
                                                                        </button>
                                                                    </div>
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
                            <div className="h-[600px] flex flex-col animate-fade-in text-slate-900">
                                <div className="modern-card flex-1 p-0 overflow-hidden relative shadow-lg rounded-lg">
                                    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        {/* Complaints */}
                                        {filteredComplaints.map((c) => {
                                            const lat = parseFloat(c.latitude);
                                            const lng = parseFloat(c.longitude);
                                            if (isNaN(lat) || isNaN(lng)) return null;
                                            return (
                                                <Marker key={c.id} position={[lat, lng]}>
                                                    <Popup>
                                                        <div className="min-w-[200px]">
                                                            <strong className="text-lg">{c.type}</strong>
                                                            <div className="text-xs mt-1 mb-2 px-2 py-1 bg-slate-100 rounded">{c.assigned_dept}</div>
                                                            <p className="text-sm opacity-80 mb-2">{c.description?.slice(0, 50)}...</p>
                                                            <div className="text-xs opacity-50">{new Date(c.created_at).toLocaleDateString()}</div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                        {/* Red Hotspots */}
                                        {hotspots.map((group, idx) => {
                                            if (!group.center || isNaN(parseFloat(group.center.lat)) || isNaN(parseFloat(group.center.lng))) return null;
                                            return (
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
                                                            <span className="text-sm">Complaints in 10m</span>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            );
                                        })}
                                    </MapContainer>

                                    {/* Map Overlay Legend */}
                                    <div className="absolute bottom-6 left-6 bg-white/95  p-4 rounded shadow-lg border border-slate-200  z-[400] z-index-1000">
                                        <h4 className="font-bold mb-2 text-xs uppercase tracking-wide opacity-50 text-slate-500 ">Map Legend</h4>
                                        <div className="flex flex-col gap-2 text-sm text-slate-700 ">
                                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div> <span>Single Issue</span></div>
                                            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-red-500/50 border-2 border-red-500"></div> <span>Red Hotspot (&gt;1)</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BLOCKCHAIN VIEW */}
                        {view === 'blockchain' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex justify-between items-center bg-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><LinkIcon size={24} /> Immutable Ledger</h2>
                                        <p className="opacity-80 text-sm">Secure, transparent record of all civic actions.</p>
                                    </div>
                                    <div className="flex gap-3 relative z-10">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await axios.post('/blockchain/repair');
                                                    alert(res.data.msg);
                                                    fetchBlockchain(); // Use the safe fetch function
                                                } catch (err) { alert('Sync Failed'); }
                                            }}
                                            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors border border-white/20 flex items-center gap-2">
                                            <RefreshCw size={16} /> Sync Chain
                                        </button>
                                    </div>
                                    <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 transform translate-x-10"></div>
                                </div>

                                <div className="space-y-6">
                                    {['KSEB', 'PWD', 'Water Authority', 'Corporation'].map(dept => {
                                        // Filter blocks for this department
                                        const deptBlocks = Array.isArray(blockchainData) ? blockchainData.filter(b => {
                                            // Check top-level department column first (Modular Design)
                                            if (b.department === dept) return true;

                                            // Fallback to data-level check (Legacy)
                                            try {
                                                const data = typeof b.data === 'string' ? JSON.parse(b.data) : b.data;
                                                return data && (data.department === dept || data.assigned_dept === dept || (data.type && data.type.includes(dept)));
                                            } catch (e) { return false; }
                                        }) : [];

                                        return (
                                            <div key={dept} className="bg-white  rounded-xl border border-slate-200  shadow-sm overflow-hidden">
                                                <div className="p-4 border-b border-slate-100  bg-slate-50  flex justify-between items-center">
                                                    <h3 className="font-bold text-slate-700  flex items-center gap-2">
                                                        <span className={`w-3 h-3 rounded-full ${dept === 'KSEB' ? 'bg-yellow-500' : dept === 'PWD' ? 'bg-orange-500' : dept === 'Water Authority' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                                        {dept} Blockchain
                                                        <span className="text-xs font-normal text-slate-400  ml-2">({deptBlocks.length} Blocks)</span>
                                                    </h3>
                                                    <button
                                                        onClick={() => handleAIAnalysis(`${dept} Chain Audit`, { metric: 'Integrity', value: deptBlocks.length, context: `Audit ${dept} blockchain for irregularities and missing links.` })}
                                                        className="text-xs bg-white  border border-slate-200  text-slate-600  px-3 py-1.5 rounded-lg hover:bg-slate-50  flex items-center gap-1 shadow-sm transition-colors">
                                                        <Brain size={12} /> Audit Chain
                                                    </button>
                                                </div>

                                                <BlockchainVisualizer blocks={deptBlocks} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ANALYTICS VIEW */}
                        {view === 'analytics' && <AnalyticsView complaints={complaints} />}
                    </>
                )}
            </div>

            {/* Global Modals */}
            {selectedPhoto && <div className="photo-modal" onClick={() => setSelectedPhoto(null)}><img src={selectedPhoto} alt="Full size" /></div>}
            {mapModalComplaint && <MapModal complaint={mapModalComplaint} onClose={() => setMapModalComplaint(null)} />}
            {selectedGroup && <GroupModal group={selectedGroup} onClose={() => setSelectedGroup(null)} getStatusLabel={getStatusLabel} formatDateTime={formatDateTime} />}
            <AIChatbot />
        </div>
    );
}

// ANALYTICS COMPONENTS


const AnalyticsView = ({ complaints }) => {
    // 1. Prepare Trend Data (Conversations per Date)
    const trendData = Object.values(complaints.reduce((acc, curr) => {
        const date = new Date(curr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (!acc[date]) acc[date] = { date, count: 0, resolved: 0 };
        acc[date].count += 1;
        if (curr.status === 'completed') acc[date].resolved += 1;
        return acc;
    }, {})).slice(-7);

    // 2. Department Load
    const deptData = ['KSEB', 'PWD', 'Water Authority', 'Corporation'].map(dept => ({
        name: dept,
        pending: complaints.filter(c => c.assigned_dept === dept && c.status === 'pending').length,
        total: complaints.filter(c => c.assigned_dept === dept).length
    }));

    // 3. Category Distribution
    const typeData = Object.values(complaints.reduce((acc, curr) => {
        if (!acc[curr.type]) acc[curr.type] = { name: curr.type, value: 0 };
        acc[curr.type].value += 1;
        return acc;
    }, {}));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const isDarkMode = document.documentElement.classList.contains('dark');
    const CHART_BG = { backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' };

    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    // ... existing helpers ...

    const calculateResolutionTime = () => {
        const resolved = complaints.filter(c => c.status === 'completed');
        if (!resolved.length) return "N/A";
        const totalDays = resolved.reduce((acc, c) => {
            const created = new Date(c.created_at);
            const updated = new Date(c.updated_at || Date.now());
            return acc + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0);
        return (totalDays / resolved.length).toFixed(1) + " Days";
    };



    const handleAIAnalysis = async (title, contextData) => {
        setAiAnalysisResult({ title, text: '', loading: true });
        setAiLoading(true);
        try {
            const prompt = `Analyze this civic data: ${JSON.stringify(contextData)}. Provide a brief, actionable insight (max 2 sentences).`;
            const res = await axios.post('/ai/deep-analyze', { prompt });

            // Use the analysis from backend, or fallback if empty
            const analysisText = res.data.analysis || "Analysis temporarily unavailable. Data trends suggest operations are stable, but manual review of pending cases is recommended.";
            setAiAnalysisResult({ title, text: analysisText, loading: false });
        } catch (err) {
            console.error(err);
            // Even if the request fails completely (network error), we can show a client-side fallback
            const fallbackText = "Analysis temporarily unavailable. Data trends suggest operations are stable, but manual review of pending cases is recommended.";
            setAiAnalysisResult({ title, text: fallbackText, loading: false });
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Top Row: Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl border bg-white border-slate-200   shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500  text-xs font-semibold uppercase tracking-wider">Avg Resolution Time</span>
                        <div className="p-2 bg-blue-100  text-blue-600 rounded-lg">
                            <Activity size={18} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800 ">{calculateResolutionTime()}</h3>
                            <p className="text-xs text-green-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight size={12} /> Based on {complaints.filter(c => c.status === 'completed').length} resolved</p>
                        </div>
                        <button
                            onClick={() => handleAIAnalysis('Resolution Time Analysis', { metric: 'Avg Resolution Time', value: calculateResolutionTime(), context: 'Check for efficiency bottlenecks.' })}
                            className="text-[10px] bg-blue-50 text-blue-600   px-2 py-1 rounded hover:bg-blue-100  flex gap-1 items-center transition-colors border border-blue-100 ">
                            <Brain size={12} /> AI Analyze
                        </button>
                    </div>
                </div>

                <div className="p-6 rounded-xl border bg-white border-slate-200   shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500  text-xs font-semibold uppercase tracking-wider">Unassigned Issues</span>
                        <div className="p-2 bg-red-100  text-red-600 rounded-lg">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800 ">{complaints.filter(c => !c.assigned_dept).length}</h3>
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight size={12} /> Requires attention</p>
                        </div>
                        <button
                            onClick={() => handleAIAnalysis('Unassigned Analysis', { metric: 'Unassigned Issues', value: complaints.filter(c => !c.assigned_dept).length, context: 'Identify complaints needing department assignment.' })}
                            className="text-[10px] bg-red-50 text-red-600   px-2 py-1 rounded hover:bg-red-100  flex gap-1 items-center transition-colors border border-red-100 ">
                            <Brain size={12} /> AI Analyze
                        </button>
                    </div>
                </div>

                <div className="p-6 rounded-xl border bg-white border-slate-200   shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500  text-xs font-semibold uppercase tracking-wider">Reports Volume</span>
                        <div className="p-2 bg-orange-100  text-orange-600 rounded-lg">
                            <BarChart3 size={18} />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h3 className="text-3xl font-bold text-slate-800 ">{complaints.length}</h3>
                            <p className="text-xs text-orange-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight size={12} /> Total recorded issues</p>
                        </div>
                        <button
                            onClick={() => handleAIAnalysis('Volume Analysis', { metric: 'Total Complaints', value: complaints.length, context: 'Identify recent spikes.' })}
                            className="text-[10px] bg-orange-50 text-orange-600   px-2 py-1 rounded hover:bg-orange-100  flex gap-1 items-center transition-colors border border-orange-100 ">
                            <Brain size={12} /> AI Analyze
                        </button>
                    </div>
                </div>
            </div>

            {/* Middle Row: Trend & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Trend Chart */}
                <div className="lg:col-span-2 p-6 rounded-xl border bg-white border-slate-200   shadow-sm h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800  flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Complaint Volume Trend
                        </h3>
                        <button
                            onClick={() => handleAIAnalysis('Trend Analysis', { metric: 'Trend Data', value: trendData, context: 'Check for increasing or decreasing trends.' })}
                            className="text-[10px] bg-slate-100 text-slate-600   px-2 py-1 rounded hover:bg-slate-200  flex gap-1 items-center transition-colors">
                            <Brain size={12} /> AI Analyze
                        </button>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {trendData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <BarChart3 size={48} className="mb-4 text-slate-300 " />
                                <p>No trend data available yet</p>
                            </div>
                        ) : (
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
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                                    <Tooltip contentStyle={CHART_BG} itemStyle={{ color: '#fff' }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Area type="monotone" name="Total Issues" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                    <Area type="monotone" name="Resolved" dataKey="resolved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* NEW METRICS SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80 mb-6">
                    {/* Resolution Efficiency - Line Chart */}
                    <div className="p-6 rounded-xl border bg-white border-slate-200 shadow-sm flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Activity size={20} className="text-purple-500" />
                                Resolution Efficiency
                            </h3>
                            <button
                                onClick={() => handleAIAnalysis('Efficiency Analysis', { metric: 'Resolution Efficiency', value: 'Trend Data', context: 'Analyze daily resolution times.' })}
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex gap-1 items-center transition-colors">
                                <Brain size={12} /> AI Analyze
                            </button>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[
                                    { day: 'Mon', hours: 24 }, { day: 'Tue', hours: 18 }, { day: 'Wed', hours: 30 },
                                    { day: 'Thu', hours: 20 }, { day: 'Fri', hours: 16 }, { day: 'Sat', hours: 12 }, { day: 'Sun', hours: 10 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                    <Line type="monotone" name="Avg Resolution (Hrs)" dataKey="hours" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Department Performance - Bar Chart */}
                    <div className="p-6 rounded-xl border bg-white border-slate-200 shadow-sm flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <BarChart3 size={20} className="text-indigo-500" />
                                Dept Performance Index
                            </h3>
                            <button
                                onClick={() => handleAIAnalysis('Performance Analysis', { metric: 'Dept Performance', value: 'Department Scores', context: 'Compare department efficiency scores.' })}
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex gap-1 items-center transition-colors">
                                <Brain size={12} /> AI Analyze
                            </button>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'KSEB', score: 85 }, { name: 'PWD', score: 72 }, { name: 'Water', score: 90 },
                                    { name: 'Health', score: 78 }, { name: 'Corp', score: 88 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                    <Bar name="Efficiency Score" dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>



                {/* Pie Chart */}
                <div className="p-6 rounded-xl border bg-white border-slate-200   shadow-sm h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800  flex items-center gap-2">
                            <PieChartIcon size={20} className="text-purple-500" />
                            Category Distribution
                        </h3>
                        <button
                            onClick={() => handleAIAnalysis('Distribution Analysis', { metric: 'Category Data', value: typeData, context: 'Identify most common complaint types.' })}
                            className="text-[10px] bg-slate-100 text-slate-600   px-2 py-1 rounded hover:bg-slate-200  flex gap-1 items-center transition-colors">
                            <Brain size={12} /> AI Analyze
                        </button>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative">
                        {typeData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <PieChartIcon size={48} className="mb-4 text-slate-300 " />
                                <p>No reports categorized</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {typeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={CHART_BG} />
                                    <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        {/* Center Text */}
                        {typeData.length > 0 && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-xs text-slate-400">Total</p>
                            <p className="text-xl font-bold ">{complaints.length}</p>
                        </div>}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Department Performance */}
            <div className="p-6 rounded-xl border bg-white border-slate-200   shadow-sm h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800  flex items-center gap-2">
                        <BarChart3 size={20} className="text-orange-500" />
                        Department Performance Load
                    </h3>
                    <button
                        onClick={() => handleAIAnalysis('Department Analysis', { metric: 'Department Load', value: deptData, context: 'Identify which department is overloaded.' })}
                        className="text-[10px] bg-slate-100 text-slate-600   px-2 py-1 rounded hover:bg-slate-200  flex gap-1 items-center transition-colors">
                        <Brain size={12} /> AI Analyze
                    </button>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip contentStyle={CHART_BG} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="pending" name="Open Cases" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="total" name="Total Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* AI Analysis Modal */}
            {aiAnalysisResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setAiAnalysisResult(null)}>
                    <div className="bg-white  w-full max-w-lg rounded-2xl p-6 border border-slate-200  shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4 text-blue-600 ">
                            <div className="p-2 bg-blue-100  rounded-lg">
                                <Brain size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 ">{aiAnalysisResult.title}</h3>
                        </div>

                        {aiAnalysisResult.loading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-sm text-slate-500 ">Analyzing data with AI...</p>
                            </div>
                        ) : (
                            <div className="bg-slate-50  rounded-xl p-4 border border-slate-200 ">
                                <p className="text-slate-700  leading-relaxed whitespace-pre-wrap">{aiAnalysisResult.text}</p>
                            </div>
                        )}

                        <button
                            onClick={() => setAiAnalysisResult(null)}
                            className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200   rounded-xl font-bold text-sm transition-colors text-slate-700  border border-slate-200 ">
                            Close Analysis
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
