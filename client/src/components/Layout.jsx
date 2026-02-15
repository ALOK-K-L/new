import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (!user) {
        return <>{children}</>;
    }

    const isCitizen = user?.role === 'citizen';
    // Mobile Header - Hidden for Citizens
    const MobileHeader = () => (
        <div className={`md:hidden flex items-center justify-between p-4 bg-bg-card dark:bg-dark-surface border-b border-border-color dark:border-gray-700 ${isCitizen ? 'hidden' : ''}`}>
            <div className="flex items-center gap-2">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
                    <Menu size={24} />
                </button>
                <span className="font-bold text-lg">Civic Eye</span>
            </div>
            <ThemeToggle />
        </div>
    );

    return (
        <div className="min-h-screen bg-bg-page dark:bg-dark-background text-text-main dark:text-dark-text transition-colors duration-300">
            {/* Mobile Header */}
            {!isCitizen && <MobileHeader />}

            {/* Sidebar (Desktop & Mobile Wrapper) */}
            {/* For Citizens: Hidden on mobile (hidden), Visible on desktop (md:block) */}
            {/* For Others: Controlled by state on mobile, Visible on desktop */}
            <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition duration-200 ease-in-out z-30 md:static ${isCitizen ? 'hidden md:block' : 'block'}`}>
                <Sidebar />
            </div>

            {/* Overlay for mobile - only if sidebar is open and NOT a citizen (since citizens don't have mobile sidebar) */}
            {sidebarOpen && !isCitizen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen p-4 md:p-8 transition-all duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-end mb-6 hidden md:flex">
                        <ThemeToggle />
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
