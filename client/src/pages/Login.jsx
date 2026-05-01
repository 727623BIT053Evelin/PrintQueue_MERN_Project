import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Printer, User, Shield } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student'); // 'student' or 'admin'
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate(user.isAdmin ? '/admin' : '/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(email, password);
        if (result.success) {
            toast.success('Logged in successfully');
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center">
                        <Printer className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-text">Welcome back</h2>
                    <p className="mt-2 text-sm text-muted">
                        Sign in to your account to continue
                    </p>
                </div>

                <div className="flex justify-center space-x-4 mb-6">
                    <button
                        onClick={() => setRole('student')}
                        className={`flex items-center px-4 py-2 rounded-lg border transition-all ${role === 'student' ? 'bg-blue-50 border-primary text-primary' : 'border-gray-200 text-muted hover:bg-gray-50'}`}
                    >
                        <User className="h-4 w-4 mr-2" />
                        Student
                    </button>
                    <button
                        onClick={() => setRole('admin')}
                        className={`flex items-center px-4 py-2 rounded-lg border transition-all ${role === 'admin' ? 'bg-blue-50 border-primary text-primary' : 'border-gray-200 text-muted hover:bg-gray-50'}`}
                    >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin
                    </button>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="mb-4">
                            <label htmlFor="email-address" className="block text-sm font-medium text-text mb-1">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                        >
                            Sign in
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <p className="text-sm text-muted">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-primary hover:text-blue-500">
                            Register here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
