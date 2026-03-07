
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';

const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1493238792015-1a419ac69251?q=80&w=1000&auto=format&fit=crop';

export default function SignUpScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [accountType, setAccountType] = useState<'client' | 'mechanic'>('client');
    const [workshopName, setWorkshopName] = useState('');
    const [workshopPhone, setWorkshopPhone] = useState('');
    const [workshopAddress, setWorkshopAddress] = useState('');
    const [workshopLatitude, setWorkshopLatitude] = useState('');
    const [workshopLongitude, setWorkshopLongitude] = useState('');
    const [loading, setLoading] = useState(false);

    async function signUp() {
        if (!email || !password || !fullName) {
            Alert.alert('Error', 'Por favor llena todos los campos');
            return;
        }

        if (accountType === 'mechanic') {
            if (!workshopName || !workshopAddress || !workshopPhone || !workshopLatitude || !workshopLongitude) {
                Alert.alert('Datos incompletos', 'Para una cuenta de taller debes capturar nombre, teléfono, dirección y coordenadas.');
                return;
            }
            const lat = Number(workshopLatitude);
            const lng = Number(workshopLongitude);
            if (Number.isNaN(lat) || Number.isNaN(lng)) {
                Alert.alert('Coordenadas inválidas', 'La latitud y longitud deben ser números válidos.');
                return;
            }
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // default avatar
                    role: accountType,
                }
            }
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            try {
                const userId = data.user?.id;

                if (userId) {
                    await supabase
                        .from('profiles')
                        .update({ role: accountType })
                        .eq('id', userId);

                    if (accountType === 'mechanic') {
                        const lat = Number(workshopLatitude);
                        const lng = Number(workshopLongitude);

                        const { data: workshop, error: workshopError } = await supabase
                            .from('workshops')
                            .insert([{
                                name: workshopName,
                                address: workshopAddress,
                                phone: workshopPhone,
                                latitude: lat,
                                longitude: lng,
                                status: 'pending_review',
                            }])
                            .select('id')
                            .single();

                        if (workshopError) throw workshopError;

                        const { error: staffError } = await supabase
                            .from('workshop_staff')
                            .insert([{
                                workshop_id: workshop.id,
                                user_id: userId,
                                role_in_workshop: 'owner',
                            }]);

                        if (staffError) throw staffError;
                    }
                }
            } catch (e: any) {
                Alert.alert('Registro parcial', `La cuenta se creó, pero faltó completar la configuración del taller: ${e.message}`);
            }

            Alert.alert('Éxito', 'Cuenta creada. Por favor inicia sesión.');
            router.back(); // Go back to login
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Image
                source={BACKGROUND_IMAGE}
                style={styles.backgroundImage}
                contentFit="cover"
                transition={1000}
            />
            <View style={styles.overlay} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.glassCard}>
                        <Text style={styles.title}>ÚNETE</Text>
                        <Text style={styles.subtitle}>Crea tu cuenta en AutoSpot</Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre Completo"
                                placeholderTextColor="#a0a0a0"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Correo Electrónico"
                                placeholderTextColor="#a0a0a0"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Contraseña"
                                placeholderTextColor="#a0a0a0"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <Text style={styles.pickerLabel}>Tipo de cuenta</Text>
                        <View style={styles.roleSelector}>
                            <TouchableOpacity
                                style={[styles.roleButton, accountType === 'client' && styles.roleButtonActive]}
                                onPress={() => setAccountType('client')}
                            >
                                <Text style={[styles.roleButtonText, accountType === 'client' && styles.roleButtonTextActive]}>Cliente</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, accountType === 'mechanic' && styles.roleButtonActive]}
                                onPress={() => setAccountType('mechanic')}
                            >
                                <Text style={[styles.roleButtonText, accountType === 'mechanic' && styles.roleButtonTextActive]}>Taller</Text>
                            </TouchableOpacity>
                        </View>

                        {accountType === 'mechanic' && (
                            <>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre comercial del taller"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopName}
                                        onChangeText={setWorkshopName}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Teléfono del taller"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopPhone}
                                        onChangeText={setWorkshopPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Dirección"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopAddress}
                                        onChangeText={setWorkshopAddress}
                                    />
                                </View>
                                <View style={styles.rowInputs}>
                                    <View style={[styles.inputContainer, styles.rowInput]}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Latitud"
                                            placeholderTextColor="#a0a0a0"
                                            value={workshopLatitude}
                                            onChangeText={setWorkshopLatitude}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={[styles.inputContainer, styles.rowInput]}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Longitud"
                                            placeholderTextColor="#a0a0a0"
                                            value={workshopLongitude}
                                            onChangeText={setWorkshopLongitude}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={styles.button} onPress={signUp} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text style={styles.buttonText}>CREAR CUENTA</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                            <Link href="/(auth)/login" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.linkText}>Inicia Sesión</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.6,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    glassCard: {
        backgroundColor: 'rgba(20, 20, 30, 0.75)',
        borderRadius: 24,
        padding: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 2,
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 16,
        color: '#fb8500',
        textAlign: 'center',
        marginBottom: 32,
        letterSpacing: 1,
    },
    inputContainer: {
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: {
        padding: 16,
        color: 'white',
        fontSize: 16,
    },
    pickerLabel: {
        color: '#a0a0a0',
        marginBottom: 8,
        marginTop: 2,
    },
    roleSelector: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    roleButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    roleButtonActive: {
        backgroundColor: 'rgba(251,133,0,0.25)',
        borderColor: '#fb8500',
    },
    roleButtonText: {
        color: '#d1d5db',
        fontWeight: '700',
    },
    roleButtonTextActive: {
        color: '#ffffff',
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 10,
    },
    rowInput: {
        flex: 1,
    },
    button: {
        backgroundColor: '#fb8500',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#fb8500',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#a0a0a0',
    },
    linkText: {
        color: '#219ebc',
        fontWeight: 'bold',
    },
});
