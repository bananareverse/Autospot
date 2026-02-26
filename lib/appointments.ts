import { supabase } from './supabase';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export type Appointment = {
    id: string;
    client_id: string;
    vehicle_id: string;
    service_id: string | null;
    scheduled_at: string;
    status: AppointmentStatus;
    notes: string | null;
    created_at: string;
    // Joins
    vehicle?: {
        make: string;
        model: string;
        license_plate: string;
    };
    service?: {
        name: string;
        estimated_price: number;
    };
};

export async function getUserAppointments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return [];

    // 1. Find Client
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!client) return [];

    // 2. Fetch Appointments with vehicle and service info
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
      *,
      vehicle:vehicles(make, model, license_plate),
      service:service_catalog(name, estimated_price)
    `)
        .eq('client_id', client.id)
        .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return appointments as Appointment[];
}

export async function scheduleAppointment(params: {
    vehicle_id: string;
    service_id: string | null;
    scheduled_at: Date;
    notes: string;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error("No authenticated user");

    // Find Client
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user.email)
        .single();

    if (!client) throw new Error("Client profile not found");

    const { data, error } = await supabase
        .from('appointments')
        .insert([{
            client_id: client.id,
            vehicle_id: params.vehicle_id,
            service_id: params.service_id,
            scheduled_at: params.scheduled_at.toISOString(),
            notes: params.notes,
            status: 'scheduled'
        }])
        .select();

    if (error) throw error;
    return data[0];
}
