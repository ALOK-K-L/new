import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';
import { User, Bell, Shield, Smartphone, Mail, Lock, LogOut } from 'lucide-react';

export default function Settings() {
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        updates: true
    });

    const toggleNotification = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
            <p className="text-slate-500 mb-8">Manage your account preferences and application settings.</p>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="text-blue-500" /> Profile Information
                </h2>
                <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">{user?.username}</h3>
                        <p className="text-slate-500">{user?.role?.toUpperCase()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                            <Mail size={16} /> {user?.email || 'user@example.com'}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Role</label>
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                            <Shield size={16} /> {user?.role}
                        </div>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Smartphone className="text-purple-500" /> Appearance
                </h2>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                    <div>
                        <p className="font-bold text-slate-800">Theme Preference</p>
                        <p className="text-sm text-slate-500">Switch between light and dark mode</p>
                    </div>
                    <DarkModeToggle />
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Bell className="text-yellow-500" /> Notifications
                </h2>
                <div className="space-y-3">
                    {Object.entries(notifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="font-bold text-slate-800 capitalize">{key} Notifications</p>
                                <p className="text-sm text-slate-500">Receive updates via {key}</p>
                            </div>
                            <button
                                onClick={() => toggleNotification(key)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-green-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Lock className="text-red-500" /> Security
                </h2>
                <button className="w-full text-left p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors flex justify-between items-center group">
                    <div>
                        <p className="font-bold text-slate-800">Change Password</p>
                        <p className="text-sm text-slate-500">Update your account password</p>
                    </div>
                    <span className="text-slate-400 group-hover:text-slate-600">→</span>
                </button>
            </div>

            <button onClick={logout} className="w-full p-4 rounded-xl border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold flex items-center justify-center gap-2 transition-colors">
                <LogOut size={20} /> Sign Out of All Devices
            </button>
        </div>
    );
}
