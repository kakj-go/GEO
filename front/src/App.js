import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import useUserStore from './stores/useUserStore';
import Login from './components/Login';
import Init from './components/Init';
import MainLayout from './components/MainLayout';
import './styles/App.css';

function App() {
    const isLoggedIn = useUserStore(state => state.isLoggedIn);
    const logout = useUserStore(state => state.logout);
    const isInitialized = useUserStore(state => state.isInitialized);
    const checkInitStatus = useUserStore(state => state.checkInitStatus);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const handleLogout = () => {
            logout();
        };

        window.addEventListener('logout', handleLogout);

        // Check init status
        checkInitStatus().finally(() => {
            setChecking(false);
        });

        return () => {
            window.removeEventListener('logout', handleLogout);
        };
    }, [logout, checkInitStatus]);

    if (checking) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>正在加载...</div>;
    }

    return (
        <Router>
            <div className="App">
                {!isInitialized ? (
                    <Routes>
                        <Route path="*" element={<Init />} />
                    </Routes>
                ) : (
                    <Routes>
                        <Route
                            path="/login"
                            element={!isLoggedIn ? <Login /> : <Navigate to="/" />}
                        />
                        <Route
                            path="/*"
                            element={isLoggedIn ? <MainLayout /> : <Navigate to="/login" />}
                        />
                    </Routes>
                )}
            </div>
        </Router>
    );
}

export default App;