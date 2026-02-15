import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
    Eye, EyeOff, Github,
    Chrome, Cpu, MousePointer2, Activity,
    Layers, ShieldCheck, ArrowRight, User
} from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const { login, user } = useAuth();

    // Form and UI state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Roles Data
    const roles = [
        { value: 'citizen', label: '👤 Citizen', email: 'citizen@gmail.com' },
        { value: 'admin', label: '🏛️ Admin', email: 'admin@gmail.com' },
        { value: 'KSEB', label: '⚡ KSEB (Electricity)', email: 'kseb@gmail.com' },
        { value: 'PWD', label: '🛤️ PWD (Roads)', email: 'pwd@gmail.com' },
        { value: 'Water Authority', label: '💧 Water Authority', email: 'water@gmail.com' },
        { value: 'Corporation', label: '🗑️ Corporation (Waste)', email: 'corporation@gmail.com' },
    ];

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        const selectedRoleData = roles.find(r => r.value === selectedRole);
        if (selectedRoleData) {
            setEmail(selectedRoleData.email);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const result = await login(email, password);

        if (result && result.success) {
            // Success - Navigation handled by useEffect
        } else {
            setError(result?.error || 'Access denied. Verify credentials.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background text-slate-600 p-4 md:p-8 font-sans overflow-x-hidden flex items-center justify-center relative">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-4 gap-4 z-10">

                {/* LEFT COLUMN: SYSTEM STATUS */}
                <div className="md:col-span-1 space-y-4 flex flex-col">
                    {/* SYSTEM EFFICIENCY */}
                    <GridCard className="p-6 flex-1 flex flex-col justify-between overflow-hidden min-h-[300px]">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">System Status</p>
                            <p className="text-[10px] text-slate-500">OPTIMAL PERFORMANCE</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center relative py-8">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -scale-y-100">
                                <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.5" />
                                <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />
                                <motion.path
                                    d="M 0 20 Q 25 20, 40 50 T 80 80 L 100 90"
                                    fill="none"
                                    stroke="url(#blueGradient)"
                                    strokeWidth="3"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <defs>
                                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#60a5fa" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-blue-600 font-mono bg-blue-50 px-3 py-1.5 rounded-full">
                            <span>LIVE_MONITORING</span>
                            <Activity size={14} className="animate-pulse" />
                        </div>
                    </GridCard>

                    {/* DEPARTMENT HUB */}
                    <GridCard className="p-5 flex items-center justify-between group cursor-pointer hover:bg-white">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Connected</span>
                            <span className="text-slate-800 font-bold text-lg">Depts</span>
                        </div>
                        <Layers className="text-blue-500 group-hover:rotate-90 transition-transform duration-500" />
                    </GridCard>
                </div>

                {/* CENTER COLUMN: LOGIN FORM */}
                <div className="md:col-span-2 space-y-4">
                    {/* MAIN LOGIN CARD */}
                    <GridCard className="relative overflow-hidden p-8 md:p-12 border-blue-100 shadow-2xl shadow-blue-500/5 bg-white">
                        <div className="relative z-10 h-full flex flex-col justify-center">
                            <div className="mb-8 text-center">
                                <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                                    <ShieldCheck size={32} />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Civic Eye</h2>
                                <p className="text-slate-500 text-sm font-medium">Urban Management Portal</p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                {/* Role Selector */}
                                <div className="relative group z-20">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block ml-1">Identity</label>
                                    <div className="relative">
                                        <select
                                            value={role}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-4 pr-10 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-sm appearance-none cursor-pointer hover:bg-slate-100"
                                        >
                                            <option value="">Select Role...</option>
                                            {roles.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            ▼
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-4 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium"
                                            placeholder="Email Address"
                                            required
                                        />
                                    </div>

                                    <div className="relative group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 font-medium"
                                            placeholder="Password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs px-1">
                                    <Link to="/register" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">Create Account</Link>
                                    <a href="#" className="text-blue-600 font-bold hover:underline tracking-tight">Forgot Password?</a>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 group overflow-hidden relative active:scale-95"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="relative z-10">Sign In</span>
                                            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Dot Pattern Overlay */}
                        <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                    </GridCard>

                    {/* BRAND TILES */}
                    <div className="grid grid-cols-2 gap-4">
                        <GridCard className="p-6 flex flex-col justify-center items-center text-center bg-white/60 hover:bg-white">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-1 font-bold">Public Service</p>
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Admin</h3>
                            <p className="text-[10px] text-blue-500 font-mono bg-blue-50 px-2 py-0.5 rounded mt-1">Authorized</p>
                        </GridCard>

                        <GridCard className="p-6 flex flex-col justify-center items-center gap-2 group bg-white/60 hover:bg-white">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="font-bold tracking-tight text-slate-800 text-lg">Secure</span>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Gateway</span>
                            </div>
                        </GridCard>
                    </div>
                </div>

                {/* RIGHT COLUMN: METRICS */}
                <div className="md:col-span-1 space-y-4 flex flex-col">
                    {/* STAT TILE */}
                    <GridCard className="p-6 flex flex-col justify-center gap-3">
                        <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-wider">Active Modules</p>
                        <div className="flex justify-center items-end gap-1 h-10">
                            {[0.4, 1, 0.6, 0.8].map((h, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [`${h * 100}%`, `${h * 60}%`, `${h * 100}%`] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1.5 bg-blue-500 rounded-full"
                                />
                            ))}
                            <span className="text-2xl font-black text-slate-800 ml-2">4</span>
                        </div>
                    </GridCard>

                    {/* CPU / PROCESSING */}
                    <GridCard className="p-6 flex-1 flex flex-col items-center justify-center gap-6 overflow-hidden relative group min-h-[200px]">
                        <div className="text-center z-10">
                            <p className="text-sm font-bold text-slate-800 mb-1">Infrastructure</p>
                            <p className="text-[10px] text-slate-500 font-mono">LOAD_BALANCED</p>
                        </div>

                        <div className="relative w-28 h-28 flex items-center justify-center z-10">
                            <div className="absolute inset-0 border border-dashed border-blue-200 rounded-full animate-[spin_15s_linear_infinite]" />
                            <div className="absolute inset-2 border border-blue-100 rounded-full" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            >
                                <Cpu className="text-blue-500" size={28} />
                            </motion.div>
                        </div>

                        <div className="w-full bg-slate-50 rounded-lg p-3 border border-slate-100 z-10">
                            <div className="flex justify-between text-[9px] mb-1 font-bold">
                                <span className="text-slate-400">SERVER STATUS</span>
                                <span className="text-emerald-500">ONLINE</span>
                            </div>
                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "98%" }}
                                    className="h-full bg-emerald-500"
                                />
                            </div>
                        </div>
                    </GridCard>
                </div>

            </div>

            <style>{`
                @keyframes shine {
                    100% { left: 125%; }
                }
            `}</style>
        </div>
    );
};

// Helper Components
const GridCard = ({ children, className }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`bg-white backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-sm transition-all hover:shadow-md ${className}`}
    >
        {children}
    </motion.div>
);

const SocialBtn = ({ icon, label }) => (
    <motion.button
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 transition-all text-xs font-bold shadow-sm"
    >
        {icon}
        <span>{label}</span>
    </motion.button>
);

export default Login;