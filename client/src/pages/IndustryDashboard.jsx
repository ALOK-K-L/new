import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AIChatbot from '../components/AIChatbot';
import DarkModeToggle from '../components/DarkModeToggle';
import {
    LayoutDashboard, FileText, User, LogOut, CheckCircle,
    AlertTriangle, Send, MapPin, Home, PlusCircle, List, UserCircle, Briefcase
} from 'lucide-react';
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

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return position ? <Marker position={position} /> : null;
}

function FlyToLocation({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 16);
        }
    }, [position, map]);
    return null;
}

// Status Badge
const StatusBadge = ({ status }) => {
    const config = {
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
        in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
        reviewed: { label: 'Reviewed', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
        completed: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
        rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' }
    };

    const style = config[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.color}`}>
            {style.label}
        </span>
    );
};

// Map Modal
const MapModal = ({ complaint, onClose }) => {
    if (!complaint || !complaint.latitude || !complaint.longitude) return null;
    const position = [parseFloat(complaint.latitude), parseFloat(complaint.longitude)];

    return (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-3xl md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl border-t md:border border-slate-200 dark:border-slate-800 h-[80vh] md:h-auto animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{complaint.type}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">📍 {complaint.latitude.toString().slice(0, 8)}, {complaint.longitude.toString().slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">✕</button>
                </div>
                <div className="h-[50vh] md:h-[400px]">
                    <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={position}>
                            <Popup><strong>{complaint.type}</strong><br />{complaint.description?.slice(0, 100)}...</Popup>
                        </Marker>
                    </MapContainer>
                </div>
                <div className="p-4 flex gap-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
                    <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&z=18`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center py-3 rounded-xl font-bold">Open in Maps</a>
                </div>
            </div>
        </div>
    );
};

export default function IndustryDashboard() {
    const { user, logout } = useAuth();
    const [view, setView] = useState('overview'); // overview, report, complaints, profile
    const [formData, setFormData] = useState({ type: '', description: '', tags: '' });
    const [position, setPosition] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [myComplaints, setMyComplaints] = useState([]);
    const [mapModalComplaint, setMapModalComplaint] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const center = { lat: 10.8505, lng: 76.2711 };

    // INDUSTRY SPECIFIC ISSUE TYPES
    const issueTypes = [
        'Antivirus', 'Software', 'Hardware', 'Refund', 'Subscription', 'License', 'Other'
    ];

    useEffect(() => {
        fetchMyComplaints();
        const interval = setInterval(fetchMyComplaints, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMyComplaints = async () => {
        try {
            const res = await axios.get('/complaints');
            setMyComplaints(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleLiveLocation = () => {
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setMessage({ type: 'success', text: '📍 Location captured!' });
                    setLocationLoading(false);
                },
                (err) => {
                    setMessage({ type: 'error', text: 'GPS Error. Try again.' });
                    setLocationLoading(false);
                },
                { enableHighAccuracy: true }
            );
        } else {
            setMessage({ type: 'error', text: 'Geolocation not supported.' });
            setLocationLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.type || !formData.description) return setMessage({ type: 'error', text: 'Fill required fields.' });

        setLoading(true);
        try {
            const data = new FormData();
            data.append('type', formData.type);
            data.append('description', formData.description);
            if (photo) data.append('image', photo);
            if (position) {
                data.append('latitude', position.lat);
                data.append('longitude', position.lng);
            }
            if (formData.tags) data.append('tags', formData.tags);

            await axios.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } });

            setMessage({ type: 'success', text: '✅ Submitted!' });
            setFormData({ type: '', description: '', tags: '' });
            setPhoto(null);
            setPhotoPreview(null);
            setPosition(null);
            fetchMyComplaints();
            setTimeout(() => {
                setMessage({ type: '', text: '' });
                setView('complaints');
            }, 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.msg || 'Failed.' });
        } finally {
            setLoading(false);
        }
    };

    const filteredComplaints = filterStatus === 'all' ? myComplaints : myComplaints.filter(c => c.status === filterStatus);

    const stats = {
        total: myComplaints.length,
        pending: myComplaints.filter(c => c.status === 'pending').length,
        resolved: myComplaints.filter(c => c.status === 'completed').length,
    };

    const NavItem = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setView(id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${view === id
                ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
        >
            <Icon size={24} strokeWidth={view === id ? 2.5 : 2} />
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-poppins transition-colors duration-300 overflow-hidden">

            {/* TOP BAR */}
            <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-20 sticky top-0 safe-area-top">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">INDUSTRY EYE</h1>
                </div>
                <div className="flex items-center gap-3">
                    <DarkModeToggle />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-slate-800">
                        {user?.username?.[0]?.toUpperCase()}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth custom-scrollbar">

                {/* Toast Message */}
                {message.text && (
                    <div className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-xl shadow-lg border animate-slide-down flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <p className="font-bold text-sm">{message.text}</p>
                    </div>
                )}

                {/* OVERVIEW VIEW */}
                {view === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Welcome Card */}
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-1">Welcome, {user?.username}</h2>
                                <p className="opacity-80 text-sm mb-4">Manage your business support requests.</p>
                                <button onClick={() => setView('report')} className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-purple-50 transition-colors flex items-center gap-2">
                                    <PlusCircle size={16} /> New Support Ticket
                                </button>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1/2 bg-white/10 skew-x-12 transform translate-x-10"></div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800 text-center">
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.total}</p>
                                <p className="text-[10px] uppercase font-bold text-purple-400 dark:text-purple-300 mt-1">Total</p>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-800 text-center">
                                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pending}</p>
                                <p className="text-[10px] uppercase font-bold text-yellow-500 dark:text-yellow-300 mt-1">Pending</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800 text-center">
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.resolved}</p>
                                <p className="text-[10px] uppercase font-bold text-green-500 dark:text-green-300 mt-1">Resolved</p>
                            </div>
                        </div>

                        {/* Recent Activity Mini-List */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-lg dark:text-slate-200">Recent Tickets</h3>
                                <button onClick={() => setView('complaints')} className="text-sm text-purple-600 dark:text-purple-400 font-medium">View All</button>
                            </div>
                            <div className="space-y-3">
                                {myComplaints.slice(0, 3).map(c => (
                                    <div key={c.id} onClick={() => setView('complaints')} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 active:scale-95 transition-transform">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${c.status === 'completed' ? 'bg-green-500' : 'bg-slate-400'}`}>
                                            {c.status === 'completed' ? '✓' : '•'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm truncate dark:text-white">{c.type}</h4>
                                            <p className="text-xs text-slate-500 truncate">{c.description}</p>
                                        </div>
                                        <StatusBadge status={c.status} />
                                    </div>
                                ))}
                                {myComplaints.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No tickets yet.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* REPORT FORM */}
                {view === 'report' && (
                    <div className="animate-fade-in pb-10">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">New Support Ticket</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold dark:text-slate-300">Issue Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-purple-500 shadow-sm outline-none"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold dark:text-slate-300">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-purple-500 shadow-sm outline-none resize-none h-32"
                                    placeholder="Describe the issue..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold dark:text-slate-300">Specific Tags</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-purple-500 shadow-sm outline-none"
                                    placeholder="e.g., Urgent, Refund, v2.0"
                                />
                            </div>

                            {/* ... (Photo and Location same as Citizen but optional) ... */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold dark:text-slate-300">Screenshot / Photo (Optional)</label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="flex flex-col items-center pt-5 pb-6 text-slate-400">
                                            <div className="mb-2">📷</div>
                                            <p className="text-xs">Tap to upload</p>
                                        </div>
                                    )}
                                    <input type="file" onChange={handlePhotoChange} className="hidden" accept="image/*" />
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 active:scale-95 transition-all text-lg"
                            >
                                {loading ? 'Sending...' : 'Submit Ticket'}
                            </button>
                        </form>
                    </div>
                )}

                {/* COMPLAINTS LIST */}
                {view === 'complaints' && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold dark:text-white">Ticket History</h2>

                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {['all', 'pending', 'completed'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilterStatus(f)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterStatus === f
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                                        : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                                        }`}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {filteredComplaints.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p>No tickets found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredComplaints.map(c => (
                                    <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                                        <div className="flex gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-slate-800 dark:text-white truncate">{c.type}</h3>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2 truncate">{new Date(c.created_at).toLocaleDateString()}</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{c.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ACCOUNTS VIEW */}
                {view === 'accounts' && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold dark:text-white">Accounts & Billing</h2>
                        <div className="space-y-4">
                            {myComplaints.filter(c => c.type === 'Subscription' || c.type === 'Refund' || c.type === 'License').length === 0 ? (
                                <p className="text-slate-400 text-center py-10">No account-related tickets.</p>
                            ) : (
                                myComplaints.filter(c => c.type === 'Subscription' || c.type === 'Refund' || c.type === 'License').map(c => (
                                    <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between">
                                            <h3 className="font-bold text-slate-800 dark:text-white">{c.type}</h3>
                                            <StatusBadge status={c.status} />
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{c.description}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* SOFTWARE VIEW */}
                {view === 'software' && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold dark:text-white">Software Support</h2>
                        <div className="space-y-4">
                            {myComplaints.filter(c => c.type === 'Software' || c.type === 'Antivirus').length === 0 ? (
                                <p className="text-slate-400 text-center py-10">No software-related tickets.</p>
                            ) : (
                                myComplaints.filter(c => c.type === 'Software' || c.type === 'Antivirus').map(c => (
                                    <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between">
                                            <h3 className="font-bold text-slate-800 dark:text-white">{c.type}</h3>
                                            <StatusBadge status={c.status} />
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{c.description}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* MAP VIEW */}
                {view === 'map' && (
                    <div className="h-full flex flex-col animate-fade-in">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Live Operations Map</h2>
                        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative h-[500px]">
                            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationMarker position={position} setPosition={setPosition} />
                                {myComplaints.filter(c => c.latitude).map(c => (
                                    <Marker key={c.id} position={[c.latitude, c.longitude]}>
                                        <Popup>
                                            <strong>{c.type}</strong><br />{c.status}
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                )}

                {/* PROFILE */}
                {view === 'profile' && (
                    <div className="animate-fade-in flex flex-col items-center justify-center pt-10">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl mb-4">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        <h2 className="text-2xl font-bold dark:text-white">{user?.username}</h2>
                        <p className="text-slate-500 mb-8">{user?.email}</p>

                        <button onClick={logout} className="text-red-500 font-bold text-sm flex items-center gap-2 px-6 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut size={16} /> Log Out
                        </button>
                    </div>
                )}

            </main>

            {/* BOTTOM NAV */}
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-2 z-30 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
                <NavItem id="overview" label="Home" icon={Home} />
                <NavItem id="accounts" label="Accounts" icon={UserCircle} />
                <NavItem id="software" label="Software" icon={Briefcase} />
                <NavItem id="map" label="Map" icon={MapPin} />
                <NavItem id="report" label="Report" icon={PlusCircle} />
                <NavItem id="complaints" label="History" icon={List} />
            </nav>

            <AIChatbot />
        </div>
    );
}
