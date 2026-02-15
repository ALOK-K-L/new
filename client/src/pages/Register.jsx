import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'citizen'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // Using the same logic fix as Login, assuming register returns a promise that resolves/rejects similarly
            // But looking at AuthContext, register also returns { success: true/false }
            const result = await register(formData.username, formData.email, formData.password, formData.role);

            if (result && result.success) {
                navigate('/dashboard');
            } else {
                setError(result?.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'citizen', label: '👤 Citizen' },
        { value: 'admin', label: '🏛️ Admin' },
        { value: 'KSEB', label: '⚡ KSEB (Electricity)' },
        { value: 'PWD', label: '🛤️ PWD (Roads)' },
        { value: 'Water Authority', label: '💧 Water Authority' },
        { value: 'Corporation', label: '🗑️ Corporation (Waste)' },
    ];

    return (
        <div className="min-h-screen w-full bg-bg-page dark:bg-dark-background text-text-main dark:text-dark-text flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-lg z-10 animate-fade-in">
                <div className="modern-card p-8 md:p-10 shadow-xl border-t-4 border-t-secondary">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                                <User size={32} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-text-main dark:text-white tracking-tight mb-2">Create Account</h1>
                        <p className="text-text-secondary dark:text-dark-text-muted text-sm">Join Civic Eye to report and track issues.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6 flex items-start gap-2 animate-shake">
                            <span className="mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="input-field w-full pl-11"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input-field w-full pl-11"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider ml-1">Account Role</label>
                            <div className="relative">
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="input-field w-full appearance-none cursor-pointer"
                                >
                                    {roles.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Password Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="input-field w-full pl-11"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider ml-1">Confirm</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-secondary transition-colors">
                                        <CheckCircle size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="input-field w-full pl-11"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group bg-secondary hover:bg-secondary-hover border-secondary"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-xl p-4 border border-border-color dark:border-gray-800">
                    <p className="text-sm text-text-secondary dark:text-dark-text-muted">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary font-bold hover:underline ml-1">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
