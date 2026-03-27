
import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isAdmin: boolean;
    role: 'admin' | 'mechanic' | 'client' | null;
    isWorkshop: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    isAdmin: false,
    role: null,
    isWorkshop: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [role, setRole] = useState<'admin' | 'mechanic' | 'client' | null>(null);

    async function syncSessionState(session: Session | null) {
        setSession(session);

        if (session?.user) {
            await ensureWorkshopBootstrap(session.user);
        }

        await checkUserRole(session?.user?.id);
        setIsLoading(false);
    }

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            await syncSessionState(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await syncSessionState(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    async function checkUserRole(userId?: string) {
        if (!userId) {
            setIsAdmin(false);
            setRole(null);
            return;
        }
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        const nextRole = (data?.role as 'admin' | 'mechanic' | 'client' | undefined) || 'client';
        setRole(nextRole);
        setIsAdmin(nextRole === 'admin');
    }

    async function ensureWorkshopBootstrap(user: User) {
        const role = user.user_metadata?.role;
        if (role !== 'mechanic') return;

        // Keep profile role in sync for workshop accounts, even without pending workshop draft.
        await supabase
            .from('profiles')
            .update({ role: 'mechanic' })
            .eq('id', user.id);

        const workshopDraft = user.user_metadata?.workshop_draft;
        if (!workshopDraft) return;

        const { data: existingLink } = await supabase
            .from('workshop_staff')
            .select('workshop_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingLink?.workshop_id) return;

        const { data: createdWorkshop, error: workshopError } = await supabase
            .from('workshops')
            .insert([{
                name: workshopDraft.name,
                address: workshopDraft.address,
                phone: workshopDraft.phone,
                description: workshopDraft.description,
                opening_hours: workshopDraft.opening_hours,
                categories: workshopDraft.categories || [],
                payment_methods: workshopDraft.payment_methods || [],
            }])
            .select('id')
            .single();

        if (workshopError || !createdWorkshop) return;

        await supabase
            .from('workshop_staff')
            .insert([{
                workshop_id: createdWorkshop.id,
                user_id: user.id,
                role_in_workshop: 'owner',
            }]);
    }

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            isLoading,
            isAdmin,
            role,
            isWorkshop: role === 'mechanic' || role === 'admin',
        }}>
            {children}
        </AuthContext.Provider>
    );
}
