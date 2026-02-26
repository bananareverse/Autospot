import { supabase } from './supabase';

export type Vehicle = {
    id: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    color: string;
    photo_url?: string;
    client_id: string;
};

export async function getUserVehicles(userId: string) {
    // In this schema, vehicles are linked to 'clients'. 
    // We need to find the 'client' record that corresponds to the auth user (profile).
    // For now, assuming the profile.id is NOT the client.id directly, but we might need to look it up.
    // HOWEVER, based on the user's schema, there is no direct link between 'auth.users' and 'public.clients' shown in the snippet 
    // EXCEPT that they might be using the same ID or we need to create a client record for the user.

    // STRATEGY: Try to find a client with the same email as the user.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return [];

    // 1. Find Client by Email
    let { data: client, error } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!client) {
        // If no client exists, create one for this user?
        // Or maybe the user IS the client.
        // For this step, let's assume we can query vehicles by some method. 
        // If we can't find a client, we can't find vehicles.
        return [];
    }

    // 2. Fetch Vehicles for that Client
    const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('client_id', client.id);

    if (vError) throw vError;
    return vehicles;
}

export async function addVehicle(vehicle: Omit<Vehicle, 'id'>) {
    // Similar logic: need client_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error("No authenticated user");

    let { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!client) {
        // Auto-create client profile if missing
        const { data: newClient, error: cError } = await supabase
            .from('clients')
            .insert([{
                first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Usuario',
                last_name: user.user_metadata?.full_name?.split(' ')[1] || 'App',
                email: user.email
            }])
            .select()
            .single();
        if (cError) throw cError;
        client = newClient;
    }

    const { data, error } = await supabase
        .from('vehicles')
        .insert([{ ...vehicle, client_id: user.id }])
        .select()
        .single();

    if (error) throw error;
    return data;
}
