import { Link } from 'react-router-dom';
import { Upload, Clock, CreditCard, CheckCircle, ArrowRight, Printer } from 'lucide-react';

const Home = () => {
    return (
        <div className="space-y-20 pb-20">
            {/* Hero Section */}
            <section className="relative pt-10 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6 animate-fade-in">
                            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                            Smart Printing System Live
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-text mb-8 animate-slide-up">
                            Printing made <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary">
                                effortless & fast
                            </span>
                        </h1>
                        <p className="mt-4 text-xl text-text-muted mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            Skip the lines. Upload your documents from anywhere, pay securely, and pick up your prints when they're ready.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <Link to="/upload" className="btn-primary text-lg px-8 py-4 flex items-center justify-center group">
                                Start Printing
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/queue-status" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center">
                                Check Queue
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Background decorative elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Upload className="w-8 h-8 text-primary" />}
                        title="Easy Upload"
                        description="Drag & drop your PDF files. We support all standard formats and auto-detect settings."
                        delay="0s"
                    />
                    <FeatureCard
                        icon={<Clock className="w-8 h-8 text-accent" />}
                        title="Real-time Queue"
                        description="Know exactly when your documents will be ready. No more guessing or waiting in line."
                        delay="0.1s"
                    />
                    <FeatureCard
                        icon={<CreditCard className="w-8 h-8 text-secondary" />}
                        title="Flexible Payment"
                        description="Pay online securely or choose to pay at the counter. The choice is yours."
                        delay="0.2s"
                    />
                </div>
            </section>

            {/* How It Works */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="glass-panel p-10 md:p-16 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <Step number="1" title="Upload" desc="Upload your file" />
                            <Step number="2" title="Configure" desc="Choose print settings" />
                            <Step number="3" title="Pay" desc="Online or at counter" />
                            <Step number="4" title="Collect" desc="Pick up your prints" />
                        </div>
                    </div>
                    {/* Decorative background for the card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/10 rounded-bl-full -z-0"></div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description, delay }) => (
    <div className="glass-card p-8 hover:-translate-y-2 transition-transform duration-300 animate-fade-in" style={{ animationDelay: delay }}>
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-text mb-3">{title}</h3>
        <p className="text-text-muted leading-relaxed">{description}</p>
    </div>
);

const Step = ({ number, title, desc }) => (
    <div className="text-center relative group">
        <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform duration-300 border-2 border-primary/10">
            <span className="text-2xl font-bold text-primary">{number}</span>
        </div>
        <h4 className="text-lg font-bold text-text mb-1">{title}</h4>
        <p className="text-sm text-text-muted">{desc}</p>
    </div>
);

export default Home;
