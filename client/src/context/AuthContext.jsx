import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('lms_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('lms_token'));
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    // Keep axios up to date whenever token changes
    useEffect(() => {
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        else delete api.defaults.headers.common['Authorization'];
    }, [token]);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            let body = response.data;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (e) { 
                    console.error('Failed to parse response body as JSON:', body);
                    return { success: false, message: 'Invalid server response: Not JSON' };
                }
            }
            
            // The PHP backend returns { status: true, message: "...", data: { ...user, token } }
            const userObj = body.data || body;
            
            console.log('LOGIN RESPONSE:', body);
            console.log('USER OBJ:', userObj);


            if (!userObj || !userObj.role) {
                console.error('Login Failed - Data Structure:', { body, userObj });
                const details = !userObj ? 'No data returned' : `Found keys: ${Object.keys(userObj).join(', ')}`;
                return { success: false, message: `Invalid server response: Missing role (${details})` };
            }



            const userToken = userObj.token;
            // Create a clean user object without the token for storage
            const cleanUser = { ...userObj };
            delete cleanUser.token;

            localStorage.setItem('lms_token', userToken);
            localStorage.setItem('lms_user', JSON.stringify(cleanUser));
            
            setToken(userToken);
            setUser(cleanUser);
            
            return { success: true, role: userObj.role };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('lms_token');
        localStorage.removeItem('lms_user');
        setToken(null);
        setUser(null);
    }, []);

    // Listen for forced logout triggered by axios 401 interceptor
    useEffect(() => {
        const handleForceLogout = () => {
            localStorage.removeItem('lms_token');
            localStorage.removeItem('lms_user');
            setToken(null);
            setUser(null);
            navigateRef.current('/login');
        };
        window.addEventListener('auth:logout', handleForceLogout);
        return () => window.removeEventListener('auth:logout', handleForceLogout);
    }, []);

    const updateUser = useCallback((updatedUser) => {
        const newUser = { ...user, ...updatedUser };
        localStorage.setItem('lms_user', JSON.stringify(newUser));
        setUser(newUser);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
