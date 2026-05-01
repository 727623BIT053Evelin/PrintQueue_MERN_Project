import { useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { CheckCircle } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import API_URL from '../config';

const GlobalNotifications = () => {
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (!user) return;

        const socket = io(API_URL);

        socket.on('jobReadyToCollect', (data) => {
            if (String(data.job.user) === String(user._id)) {
                toast.success(`Your document ${data.job.fileUrl.split('/').pop()} is ready to collect!`, {
                    autoClose: false, // Keep it open until dismissed
                    icon: <CheckCircle className="text-green-500" />
                });
            }
        });

        socket.on('queuePositionAlert', (data) => {
            toast.info(data.message, {
                autoClose: 10000,
                icon: "🏃"
            });
        });

        socket.on('jobUpdated', (data) => {
            // Keep generic update for other status changes if needed, 
            // but 'completed' is now handled by jobReadyToCollect
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    return null; // This component doesn't render anything visible
};

export default GlobalNotifications;
