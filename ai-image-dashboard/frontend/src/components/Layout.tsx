import { Outlet, Link, useLocation } from 'react-router-dom';
import { Image, Layers, CheckCircle } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Image size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">AI Product Studio</h1>
          </div>
          
          <nav className="flex space-x-8">
            <Link 
              to="/" 
              className={`flex items-center gap-2 pb-5 pt-5 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Image size={18} /> Upload
            </Link>
            <Link 
              to="/processing" 
              className={`flex items-center gap-2 pb-5 pt-5 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/processing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Layers size={18} /> Processing
            </Link>
            <Link 
              to="/results" 
              className={`flex items-center gap-2 pb-5 pt-5 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/results' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <CheckCircle size={18} /> Results
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          AI Product Image Generation Dashboard &copy; 2026
        </div>
      </footer>
    </div>
  );
}
