import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/ctx/AuthContext";
import { Ionicons } from '@expo/vector-icons';
import { Stack } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";

export default function ManageMechanicsScreen(){
    const theme = useAppTheme(); // Obtenemos el tema dinámico (claro/oscuro)
    const styles = getStyles(theme); // Generamos los estilos usando el tema actual

    const { isWorkshop } = useAuth();

    const [mechanics, setMechanics] = useState<any[]>([]);
    const [newName, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [workshopId, setWorkshopId] = useState('');

    useEffect(() => {
        if (isWorkshop) {
            loadWorkshopAndMechanics();
        } else {
            setLoading(false);
        }
    }, [isWorkshop]);

    async function loadWorkshopAndMechanics() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Primero buscamos a qué taller perteneces
            const { data: staffData } = await supabase
                .from('workshop_staff')
                .select('workshop_id')
                .eq('user_id', user.id)
                .single();

            if (staffData?.workshop_id) {
                setWorkshopId(staffData.workshop_id);
                fetchMechanics(staffData.workshop_id);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    }

    async function fetchMechanics(wId: string) {
        try {
            setLoading(true);
            const { data } = await supabase
                .from('mechanics')
                .select('*')
                .eq('workshop_id', wId)
                .order('created_at', { ascending: false });

            setMechanics(data || []);
        } catch (e) {
            console.error('Error fetching mechanics', e);
        } finally {
            setLoading(false);
        }
    }

    async function saveMechanic() {
        if (!newName.trim()) {
            Alert.alert("Requerido", "Escribe el nombre del empleado para continuar");
            return;
        }
        if (!workshopId) {
            Alert.alert("Error", "No se encontró tu taller");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('mechanics').insert([
                { name: newName.trim(), workshop_id: workshopId }
            ]);

            if (error) throw error;

            setName(''); // Limpiamos la cajita
            fetchMechanics(workshopId); // Recargamos la lista desde internet
            
            Alert.alert("¡Hecho!", "Servidor actualizado.");
        } catch (error: any) {
            Alert.alert("Error guardando", error.message);
        } finally {
            setSaving(false);
        }
    }

    async function deleteMechanic(id: string) {
        Alert.alert("Borrar empleado", "¿Seguro que quieres borrar a este mecánico de tu equipo?", [
            { text: "No, cancelar", style: "cancel" },
            { 
                text: "Sí, borrar", 
                style: "destructive",
                onPress: async () => {
                    try {
                        const { error } = await supabase.from('mechanics').delete().eq('id', id);
                        if (error) throw error;
                        fetchMechanics(workshopId);
                    } catch(e: any){
                        Alert.alert("Error", e.message);
                    }
                }
            }
        ]);
    }

    if (loading && mechanics.length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                title: 'Tu Personal',
                headerStyle: { backgroundColor: theme.secondary },
                headerTintColor: 'white',
                headerShadowVisible: false,
            }} />

            <View style={styles.addSection}>
               <Text style={styles.sectionTitle}>Registrar Nuevo Empleado</Text>
               <View style={styles.inputRow}>
                   <TextInput 
                       style={styles.input}
                       placeholder="Nombre (Ej. Juan Hernández)"
                       value={newName}
                       onChangeText={setName}
                       placeholderTextColor="#9ca3af"
                   />
                   <TouchableOpacity 
                       style={styles.addBtn} 
                       onPress={saveMechanic}
                       disabled={saving}
                   >
                       {saving ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="add" size={24} color="white" />}
                   </TouchableOpacity>
               </View>
            </View>

            <View style={styles.listSection}>
               <Text style={styles.sectionTitle}>Equipo Actual ({mechanics.length})</Text>
               <FlatList 
                   data={mechanics}
                   keyExtractor={(item: any) => item.id}
                   contentContainerStyle={{ paddingBottom: 40 }}
                   renderItem={({item}) => (
                       <View style={styles.mechanicCard}>
                           <View style={styles.mechanicInfo}>
                               <View style={styles.avatar}>
                                   <Text style={styles.avatarText}>{item.name.substring(0, 1).toUpperCase()}</Text>
                               </View>
                               <Text style={styles.mechanicName}>{item.name}</Text>
                           </View>
                           <TouchableOpacity onPress={() => deleteMechanic(item.id)}>
                               <Ionicons name="trash-outline" size={22} color={theme.danger} />
                           </TouchableOpacity>
                       </View>
                   )}
                   ListEmptyComponent={
                       <View style={styles.emptyBox}>
                           <Text style={styles.emptyText}>No has agregado a ningún empleado. Escribe un nombre arriba y presiona el "+"</Text>
                       </View>
                   }
               />
            </View>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex:1, 
        backgroundColor: theme.bg, 
    },
    addSection: {
        backgroundColor: theme.card,
        padding: 20,
        paddingTop: 30,
        borderBottomWidth: 1,
        borderColor: theme.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    sectionTitle: {
        fontSize: 14, 
        fontWeight: '900', 
        marginBottom: 12,
        color: theme.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.text,
        fontWeight: '600',
    },
    addBtn: {
        backgroundColor: theme.primary,
        width: 55,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    listSection: {
        flex: 1,
        padding: 20,
    },
    mechanicCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.card,
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
    },
    mechanicInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: theme.primary,
        fontWeight: '900',
        fontSize: 18,
    },
    mechanicName: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.text,
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: theme.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        borderStyle: 'dashed'
    },
    emptyText: {
        color: theme.textSoft,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500'
    }
});

