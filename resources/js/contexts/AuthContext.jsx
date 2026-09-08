import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

/* The blade shell prints the signed-in user into the page, so the first paint
   already knows who is logged in — no flash of the logged-out header while a
   /auth/user round trip resolves. */
const initialUser = window.__AUTH_USER__ ?? null;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(initialUser);

    const login = useCallback(async (email, password) => {
        const { data } = await axios.post('/auth/login', { email, password });
        setUser(data.user);

        return data.user;
    }, []);

    const signup = useCallback(async (email, password, extraFields = {}) => {
        const { data } = await axios.post('/auth/register', {
            ...extraFields,
            email,
            password,
            password_confirmation: password,
        });
        setUser(data.user);

        return data.user;
    }, []);

    const logout = useCallback(async () => {
        await axios.post('/auth/logout');
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, isAuthed: Boolean(user), login, signup, logout, setUser }),
        [user, login, signup, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
