import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
                    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-2 flex items-center gap-2">
                            <span className="text-3xl">⚠️</span> Application Cranked
                        </h1>
                        <p className="text-slate-600 mb-6">A critical error stopped the application from loading.</p>

                        <div className="bg-slate-50 p-4 rounded-lg overflow-auto text-xs font-mono text-red-700 border border-red-100 max-h-96 mb-6 whitespace-pre-wrap">
                            <strong>{this.state.error && this.state.error.toString()}</strong>
                            <br /><br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-500/20"
                            >
                                Reload Application
                            </button>
                            <button
                                onClick={() => window.location.href = '/#/login'}
                                className="flex-1 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-lg hover:bg-slate-50 transition-colors font-bold"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
