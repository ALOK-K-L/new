import { LayoutDashboard, Users, FileText, Settings, LogOut, Building2, MapPin, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'citizen', 'kseb', 'pwd', 'water', 'corporation'] },
        { icon: Users, label: 'Users', path: '/users', roles: ['admin'] },
        { icon: FileText, label: 'Reports', path: '/reports', roles: ['admin', 'department'] },
        { icon: MapPin, label: 'Map View', path: '/map', roles: ['admin', 'department', 'citizen'] },
        { icon: Activity, label: 'Activity', path: '/activity', roles: ['admin'] },
    ];

    // Filter items based on user role
    const filteredNav = navItems.filter(item => {
        if (item.roles.includes(user?.role)) return true;
        // Department roles generic check
        if (item.roles.includes('department') && ['kseb', 'pwd', 'water', 'corporation'].includes(user?.role)) return true;
        return false;
    });

    return (
        <aside className="sidebar w-64 fixed h-full transition-all duration-300 z-20 hidden md:flex">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-primary dark:bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        C
                    </div>
                    <span className="text-xl font-bold tricolor-text">Civic Eye</span>
                </div>

                <div className="mb-6">
                    <div className="text-xs font-semibold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider mb-4 px-4">
                        Menu
                    </div>
                    <nav className="space-y-1">
                        {filteredNav.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="mt-auto p-6 border-t border-border-color dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-bold">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-main dark:text-dark-text truncate">
                            {user?.username}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-dark-text-muted truncate">
                            {user?.role}
                        </p>
                    </div>
                </div>

                <Link to="/settings" className="sidebar-link mb-2">
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>

                <button
                    onClick={logout}
                    className="sidebar-link w-full text-accent-coral hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
