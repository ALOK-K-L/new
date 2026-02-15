import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardLayout({ title, children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">{title}</h1>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase">{user?.role}</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={logout} className="text-red-500 hover:text-red-700">Logout</button>
                </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">
                {children}
            </main>
        </div>
    );
}
