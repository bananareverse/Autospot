import { supabase } from './supabase';

export type VehicleBrand = {
    id: string;
    name: string;
};

export type VehicleModel = {
    id: string;
    brand_id: string;
    name: string;
};

export async function getBrands(): Promise<VehicleBrand[]> {
    const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function getModelsByBrand(brandId: string): Promise<VehicleModel[]> {
    const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, brand_id, name')
        .eq('brand_id', brandId)
        .order('name');

    if (error) throw error;
    return data || [];
}
