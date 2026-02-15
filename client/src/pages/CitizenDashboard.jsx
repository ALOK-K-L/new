import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AIChatbot from '../components/AIChatbot';
import {
    LayoutDashboard, FileText, User, LogOut, CheckCircle,
    AlertTriangle, Send, MapPin, Home, PlusCircle, List, UserCircle, Image as ImageIcon, Trash2
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
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200   ' },
        in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200   ' },
        reviewed: { label: 'Reviewed', color: 'bg-purple-100 text-purple-800 border-purple-200   ' },
        completed: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200   ' },
        rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200   ' }
    };

    const style = config[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.color}`}>
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
            <div className="bg-white  w-full md:max-w-3xl md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl border-t md:border border-slate-200  h-[80vh] md:h-auto animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200  flex justify-between items-center bg-slate-50 ">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 ">{complaint.type}</h3>
                        <p className="text-sm text-slate-500 ">📍 {complaint.latitude.toString().slice(0, 8)}, {complaint.longitude.toString().slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-200  rounded-full hover:bg-slate-300  transition-colors">✕</button>
                </div>
                <div className="h-[50vh] md:h-[400px] w-full max-w-full overflow-hidden">
                    <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={position}>
                            <Popup><strong>{complaint.type}</strong><br />{complaint.description?.slice(0, 100)}...</Popup>
                        </Marker>
                    </MapContainer>
                </div>
                <div className="p-4 flex gap-3 bg-slate-50  border-t border-slate-200  safe-area-bottom">
                    <a href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}&z=18`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-center py-3 rounded-xl font-bold">Open in Maps</a>
                </div>
            </div>
        </div>
    );
};

export default function CitizenDashboard({ initialView }) {
    const { user, logout } = useAuth();
    const [view, setView] = useState(initialView || 'overview'); // overview, report, complaints, profile
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

    const issueTypes = [
        'Pothole', 'Streetlight', 'Water Leak', 'Garbage',
        'Road Damage', 'Drainage', 'Electricity', 'Other'
    ];

    useEffect(() => {
        if (initialView) setView(initialView);
        fetchMyComplaints();
        const interval = setInterval(fetchMyComplaints, 30000);
        return () => clearInterval(interval);
    }, [initialView]);

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

            await axios.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } });

            setMessage({ type: 'success', text: '✅ Your complaint has been submitted!' });
            setFormData({ type: '', description: '', tags: '' });
            setPhoto(null);
            setPhotoPreview(null);
            setPosition(null);
            fetchMyComplaints();
            setTimeout(() => {
                setMessage({ type: '', text: '' });
                setView('complaints');
            }, 2000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.msg || 'Failed to submit.' });
        } finally {
            setLoading(false);
        }
    };

    const deleteComplaint = async (id) => {
        if (!confirm('Are you sure you want to delete this report?')) return;
        try {
            await axios.delete(`/complaints/${id}`);
            setMessage({ type: 'success', text: '✅ Complaint deleted successfully.' });
            fetchMyComplaints();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to delete complaint.' });
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
                ? 'text-blue-600  bg-blue-50 '
                : 'text-slate-400  hover:text-slate-600 '
                }`}
        >
            <Icon size={24} strokeWidth={view === id ? 2.5 : 2} />
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto pb-24 md:pb-0">
            {/* Toast Message */}
            {message.text && (
                <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl border flex items-center gap-3 animate-fade-in ${message.type === 'success' ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <p className="font-bold text-sm tracking-wide">{message.text}</p>
                </div>
            )}

            {/* OVERVIEW VIEW */}
            {view === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Welcome Card */}
                    <div className="bg-gradient-to-br from-indigo-700 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Hello, Citizen {user?.username}</h2>
                                <p className="opacity-90 text-lg mb-6">Together we can create a better city. Report issues and track their progress.</p>
                                <button onClick={() => setView('report')} className="bg-white text-blue-700 px-6 py-3 rounded-full text-base font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 hover:scale-105 transition-all flex items-center gap-2">
                                    <PlusCircle size={20} /> Report New Issue
                                </button>
                            </div>
                            <div className="hidden md:block">
                                <ActivityChart stats={stats} />
                            </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white  p-6 rounded-2xl border border-slate-100  shadow-sm text-center card-hover">
                            <p className="text-4xl font-bold text-blue-600  mb-1">{stats.total}</p>
                            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Reports</p>
                        </div>
                        <div className="bg-white  p-6 rounded-2xl border border-slate-100  shadow-sm text-center card-hover">
                            <p className="text-4xl font-bold text-yellow-500  mb-1">{stats.pending}</p>
                            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Pending</p>
                        </div>
                        <div className="bg-white  p-6 rounded-2xl border border-slate-100  shadow-sm text-center card-hover">
                            <p className="text-4xl font-bold text-green-500  mb-1">{stats.resolved}</p>
                            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Resolved</p>
                        </div>
                    </div>

                    {/* Recent Activity Mini-List */}
                    <div>
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h3 className="font-bold text-lg text-slate-800 ">Recent Reports</h3>
                            <button onClick={() => setView('complaints')} className="text-sm text-blue-600  font-bold hover:underline">View All</button>
                        </div>
                        <div className="space-y-4">
                            {myComplaints.slice(0, 3).map(c => (
                                <div key={c.id} onClick={() => setView('complaints')} className="modern-card p-4 flex items-center gap-5 cursor-pointer hover:bg-slate-50  transition-colors">
                                    <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xl shadow-md ${c.status === 'completed' ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                                        {c.status === 'completed' ? '✓' : '•'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-base text-slate-800  truncate">{c.type}</h4>
                                            <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">{c.description}</p>
                                    </div>
                                    <StatusBadge status={c.status} />
                                </div>
                            ))}
                            {myComplaints.length === 0 && (
                                <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-200  rounded-2xl">
                                    <FileText size={48} className="mx-auto mb-2" />
                                    <p>No reports submitted yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* REPORT FORM */}
            {view === 'report' && (
                <div className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setView('overview')} className="p-2 hover:bg-slate-100  rounded-full transition-colors">←</button>
                        <h2 className="text-2xl font-bold text-slate-800 ">New Complaint</h2>
                    </div>

                    <div className="modern-card p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ">Issue Type</label>
                                    <div className="relative">
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full p-4 pl-4 rounded-xl bg-slate-50  border border-slate-200  focus:ring-2 focus:ring-blue-500 shadow-sm outline-none appearance-none font-medium"
                                            required
                                        >
                                            <option value="">Select Category...</option>
                                            {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ">Photo Proof</label>
                                    <label className="flex flex-row items-center gap-4 w-full h-[58px] border border-dashed border-slate-300  rounded-xl cursor-pointer bg-slate-50  hover:bg-slate-100  transition-colors px-4 overflow-hidden">
                                        {photoPreview ? (
                                            <>
                                                <img src={photoPreview} alt="Preview" className="h-10 w-10 object-cover rounded-lg shadow-sm" />
                                                <span className="text-sm text-green-600 font-medium truncate flex-1">Photo selected</span>
                                                <span className="text-xs text-slate-400">Change</span>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon size={20} className="text-slate-400" />
                                                <span className="text-sm text-slate-500 font-medium">Upload Image</span>
                                            </>
                                        )}
                                        <input type="file" onChange={handlePhotoChange} className="hidden" accept="image/*" />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-slate-50  border border-slate-200  focus:ring-2 focus:ring-blue-500 shadow-sm outline-none resize-none h-32 font-medium"
                                    placeholder="Describe the issue in detail..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700  flex justify-between items-center">
                                    <span>Location</span>
                                    {position ?
                                        <span className="text-green-600 bg-green-100  px-2 py-0.5 rounded text-xs font-bold">✓ Location Set</span> :
                                        <span className="text-slate-400 text-xs font-normal">Tap map or use GPS</span>}
                                </label>
                                <div className="h-64 md:h-96 rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner w-full max-w-[85vw] md:max-w-full mx-auto">
                                    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationMarker position={position} setPosition={setPosition} />
                                        <FlyToLocation position={position} />
                                    </MapContainer>
                                    <button
                                        type="button"
                                        onClick={handleLiveLocation}
                                        disabled={locationLoading}
                                        className="absolute bottom-4 right-4 bg-white text-slate-800 p-3 rounded-full shadow-lg z-[400] hover:bg-slate-50 transition-colors"
                                        title="Use my location"
                                    >
                                        {locationLoading ? <div className="loading-spinner w-4 h-4" /> : <div className="flex items-center gap-2"><MapPin size={18} /><span className="text-xs font-bold hidden md:inline">Use GPS</span></div>}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="loading-spinner w-5 h-5 border-white border-t-transparent"></div> Sending...
                                    </>
                                ) : (
                                    <>
                                        Submit Report <Send size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* COMPLAINTS LIST */}
            {view === 'complaints' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => setView('overview')} className="p-2 hover:bg-slate-100  rounded-full transition-colors">←</button>
                        <h2 className="text-2xl font-bold text-slate-800 ">My History</h2>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'in_progress', label: 'In Progress' },
                            { id: 'completed', label: 'Resolved' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterStatus(f.id)}
                                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${filterStatus === f.id
                                    ? 'bg-slate-800 text-white   border-transparent shadow-lg transform scale-105'
                                    : 'bg-white text-slate-500 border-slate-200    hover:bg-slate-50'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {filteredComplaints.length === 0 ? (
                        <div className="modern-card p-12 flex flex-col items-center justify-center text-slate-400">
                            <FileText size={48} className="mb-4 opacity-50 text-slate-300 " />
                            <p className="text-lg font-medium">No records found</p>
                            <button onClick={() => setView('report')} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Submit a new report</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredComplaints.map(c => (
                                <div key={c.id} className="bg-white  rounded-2xl p-5 shadow-sm border border-slate-200  card-hover group">
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 rounded-xl bg-slate-100  flex-shrink-0 overflow-hidden relative">
                                            {c.image_url ? (
                                                <img src={`http://localhost:5000${c.image_url}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <Image size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-slate-800  truncate pr-2">{c.type}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge status={c.status} />
                                                        <button
                                                            onClick={() => deleteComplaint(c.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                            title="Delete Complaint"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600  line-clamp-2 mb-2 leading-relaxed">{c.description}</p>
                                            </div>

                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs text-slate-400 font-medium bg-slate-100  px-2 py-1 rounded-md">{new Date(c.created_at).toLocaleDateString()}</span>
                                                {c.latitude && (
                                                    <button onClick={(e) => { e.stopPropagation(); setMapModalComplaint(c); }} className="text-xs text-blue-600  font-bold flex items-center gap-1 hover:bg-blue-50  px-2 py-1 rounded-md transition-colors">
                                                        <MapPin size={12} /> View Map
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MAP VIEW */}
            {view === 'map' && (
                <div className="animate-fade-in h-[70vh] md:h-[80vh] rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full max-w-[90vw] md:max-w-full mx-auto">
                    <div className="h-full relative w-full">
                        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {myComplaints.filter(c => c.latitude).map((c) => (
                                <Marker key={c.id} position={[parseFloat(c.latitude), parseFloat(c.longitude)]}>
                                    <Popup>
                                        <div className="min-w-[200px]">
                                            <strong className="text-lg">{c.type}</strong>
                                            <p className="text-sm opacity-80 mb-2">{c.description?.slice(0, 50)}...</p>
                                            <div className="text-xs px-2 py-1 bg-slate-100 rounded inline-block mb-2"><StatusBadge status={c.status} /></div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                            {position && <Marker position={position} icon={DefaultIcon} />}
                        </MapContainer>
                        <button
                            onClick={() => setView('overview')}
                            className="absolute top-4 left-4 bg-white p-2 rounded-full shadow-lg z-[400] hover:bg-slate-50 text-slate-700"
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            )}

            {/* PROFILE */}
            {view === 'profile' && (
                <div className="animate-fade-in flex flex-col items-center justify-center pt-6">
                    <div className="w-full max-w-sm">
                        <div className="modern-card p-8 flex flex-col items-center text-center mb-6">
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl mb-4 ring-4 ring-purple-50 ">
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <h2 className="text-2xl font-bold ">{user?.username}</h2>
                            <p className="text-slate-500 font-medium">{user?.email}</p>
                            <div className="mt-4 flex gap-2">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold font-mono">CITIZEN</span>
                            </div>
                        </div>

                        <div className="modern-card overflow-hidden p-0 mb-6">
                            <button className="w-full p-4 text-left border-b border-slate-100  flex justify-between items-center hover:bg-slate-50  transition-colors group">
                                <span className="text-sm font-medium flex items-center gap-3"><User size={18} className="text-slate-400 group-hover:text-blue-500" /> Edit Profile</span>
                                <span className="opacity-30 text-lg">›</span>
                            </button>
                            <button className="w-full p-4 text-left border-b border-slate-100  flex justify-between items-center hover:bg-slate-50  transition-colors group">
                                <span className="text-sm font-medium flex items-center gap-3"><CheckCircle size={18} className="text-slate-400 group-hover:text-blue-500" /> Notifications</span>
                                <span className="opacity-30 text-lg">›</span>
                            </button>
                            <button className="w-full p-4 text-left border-b border-slate-100  flex justify-between items-center hover:bg-slate-50  transition-colors group">
                                <span className="text-sm font-medium flex items-center gap-3"><AlertTriangle size={18} className="text-slate-400 group-hover:text-blue-500" /> Help & Support</span>
                                <span className="opacity-30 text-lg">›</span>
                            </button>
                        </div>

                        <button onClick={logout} className="w-full text-red-500 font-bold text-sm flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-50  hover:bg-red-100  transition-colors border border-red-100 ">
                            <LogOut size={18} /> Log Out
                        </button>
                    </div>
                </div>
            )}

            {/* MOBILE BOTTOM NAV */}
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white  border-t border-slate-200  flex justify-around items-center px-2 z-30 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)] md:hidden">
                <NavItem id="overview" label="Home" icon={Home} />
                <NavItem id="report" label="Report" icon={PlusCircle} />
                <NavItem id="complaints" label="History" icon={List} />
                <NavItem id="profile" label="Profile" icon={UserCircle} />
            </nav>

            {mapModalComplaint && <MapModal complaint={mapModalComplaint} onClose={() => setMapModalComplaint(null)} />}
            <AIChatbot />
        </div>
    );
}

// Mini Components
const ActivityChart = ({ stats }) => (
    <div className="hidden md:flex gap-3">
        <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-white/20 flex items-center justify-center font-bold text-sm mb-1">{stats.total}</div>
            <span className="text-[10px] uppercase opacity-70">Total</span>
        </div>
        <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-yellow-400/50 flex items-center justify-center font-bold text-sm mb-1">{stats.pending}</div>
            <span className="text-[10px] uppercase opacity-70">Pending</span>
        </div>
    </div>
);
