
import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    isAdmin: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            checkUserRole(session?.user?.id);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            checkUserRole(session?.user?.id);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    async function checkUserRole(userId?: string) {
        if (!userId) {
            setIsAdmin(false);
            return;
        }
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        setIsAdmin(data?.role === 'admin' || data?.role === 'mechanic');
    }

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}
