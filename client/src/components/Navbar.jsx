import { Link, useLocation } from 'react-router-dom';
import { useContext, useState } from 'react';
import AuthContext from '../context/AuthContext';
import { Printer, Menu, X, LogOut, User, FileText, Upload, LayoutDashboard, List } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const NavLink = ({ to, icon: Icon, children }) => (
        <Link
            to={to}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:text-primary hover:bg-gray-50'
                }`}
        >
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {children}
        </Link>
    );

    return (
        <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/20 mb-6 rounded-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center group">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                                <Printer className="h-6 w-6 text-white" />
                            </div>
                            <span className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                PrintQueue
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <>
                                <NavLink to="/" icon={LayoutDashboard}>Home</NavLink>
                                <NavLink to="/queue-status" icon={List}>Queue</NavLink>
                                <NavLink to="/upload" icon={Upload}>Upload</NavLink>
                                <NavLink to="/my-documents" icon={FileText}>My Docs</NavLink>
                                {user.isAdmin && (
                                    <NavLink to="/admin" icon={User}>Admin</NavLink>
                                )}
                                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-sm text-right hidden lg:block">
                                        <p className="font-medium text-text">{user.name}</p>
                                        <p className="text-xs text-text-muted capitalize">{user.isAdmin ? 'Administrator' : 'Student'}</p>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link to="/login" className="text-text-muted hover:text-primary font-medium transition-colors">
                                    Login
                                </Link>
                                <Link to="/register" className="btn-primary">
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-md text-text-muted hover:text-primary hover:bg-gray-100 focus:outline-none"
                        >
                            {isMobileMenuOpen ? (
                                <X className="block h-6 w-6" />
                            ) : (
                                <Menu className="block h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden glass-panel mt-2 mx-4 p-4 absolute left-0 right-0 shadow-xl animate-slide-up">
                    <div className="space-y-2">
                        {user ? (
                            <>
                                <div className="px-3 py-2 border-b border-gray-100 mb-2">
                                    <p className="font-medium text-text">{user.name}</p>
                                    <p className="text-xs text-text-muted">{user.email}</p>
                                </div>
                                <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium text-text hover:text-primary hover:bg-primary-50">Home</Link>
                                <Link to="/queue-status" className="block px-3 py-2 rounded-md text-base font-medium text-text hover:text-primary hover:bg-primary-50">Queue Status</Link>
                                <Link to="/upload" className="block px-3 py-2 rounded-md text-base font-medium text-text hover:text-primary hover:bg-primary-50">Upload Document</Link>
                                <Link to="/my-documents" className="block px-3 py-2 rounded-md text-base font-medium text-text hover:text-primary hover:bg-primary-50">My Documents</Link>
                                {user.isAdmin && (
                                    <Link to="/admin" className="block px-3 py-2 rounded-md text-base font-medium text-text hover:text-primary hover:bg-primary-50">Admin Dashboard</Link>
                                )}
                                <button
                                    onClick={logout}
                                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-error hover:bg-error/10 mt-2"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <Link to="/login" className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-text hover:bg-gray-50">Login</Link>
                                <Link to="/register" className="block w-full text-center px-3 py-2 rounded-md text-base font-medium bg-primary text-white hover:bg-primary-hover">Register</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
