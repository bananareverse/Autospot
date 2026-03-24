import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Dimensions
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');
const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1493238792015-1a419ac69251?q=80&w=1000&auto=format&fit=crop';

const THEME = {
  primary: '#fb8500', // Restore Orange
  secondary: '#000000',
  accent: '#219ebc',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
};

const CATEGORIES = [
  'Mecánica General', 'Eléctrico', 'Frenos', 'Suspensión', 
  'Afinación', 'Hojalatería', 'Pintura', 'A/C'
];

const PAYMENTS = [
  'Efectivo', 'Tarjeta', 'Transferencia', 'Mercado Pago'
];

export default function SignUpScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Auth Data
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState<'client' | 'mechanic'>('client');

    // Workshop Data
    const [wData, setWData] = useState({
        name: '',
        phone: '',
        address: '',
        description: '',
        hours: 'Lun-Vie 9:00-18:00',
        categories: [] as string[],
        paymentMethods: [] as string[],
        latitude: 25.6866,
        longitude: -100.3161,
    });

    const emailError = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? 'Correo inválido' : '';
    const passwordError = password.length > 0 && password.length < 6 ? 'Mínimo 6 caracteres' : '';

    const validateStep = () => {
        if (step === 1) {
            if (!fullName || !email || !password) return 'Completa todos los campos';
            if (emailError || passwordError) return 'Corrige los errores';
        }
        if (step === 2 && accountType === 'mechanic') {
            if (!wData.name || !wData.phone) return 'Nombre y teléfono requeridos';
        }
        if (step === 3 && accountType === 'mechanic') {
            if (!wData.address) return 'La dirección es requerida';
        }
        return null;
    };

    const handleNext = () => {
        const err = validateStep();
        if (err) {
            Alert.alert('Datos incompletos', err);
            return;
        }

        if (accountType === 'client') {
            signUp();
        } else {
            if (step < 4) setStep(step + 1);
            else signUp();
        }
    };

    async function signUp() {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        avatar_url: `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=random`,
                        role: accountType,
                    }
                }
            });

            if (error) throw error;

            if (data.user && accountType === 'mechanic') {
                // 1. Create Workshop
                const { data: workshop, error: wError } = await supabase
                    .from('workshops')
                    .insert([{
                        name: wData.name,
                        address: wData.address,
                        phone: wData.phone,
                        description: wData.description,
                        opening_hours: wData.hours,
                        categories: wData.categories,
                        payment_methods: wData.paymentMethods,
                        latitude: wData.latitude,
                        longitude: wData.longitude,
                        status: 'active'
                    }])
                    .select()
                    .single();

                if (wError || !workshop) throw wError || new Error('Error al crear taller');

                // 2. Link Staff
                await supabase
                    .from('workshop_staff')
                    .insert([{
                        workshop_id: workshop.id,
                        user_id: data.user.id,
                        role_in_workshop: 'owner',
                    }]);
                
                // 3. Update Profile role (Sync)
                await supabase
                    .from('profiles')
                    .update({ role: 'mechanic' })
                    .eq('id', data.user.id);
            }

            Alert.alert('🎉 ¡Cuenta creada!', 'Inicia sesión para comenzar.');
            router.replace('/(auth)/login');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    }

    const toggleSelection = (item: string, field: 'categories' | 'paymentMethods') => {
        setWData(prev => ({
            ...prev,
            [field]: prev[field].includes(item) 
                ? prev[field].filter(i => i !== item)
                : [...prev[field], item]
        }));
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Image
                source={BACKGROUND_IMAGE}
                style={styles.backgroundImage}
                contentFit="cover"
            />
            <View
                style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.glassCard}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.brandTitle}>AutoSpot</Text>
                            <Text style={styles.stepTitle}>ÚNETE</Text>
                            <Text style={styles.stepSubtitle}>
                                {step === 1 ? 'DATOS DE ACCESO' : step === 2 ? 'PERFIL DEL TALLER' : step === 3 ? 'UBICACIÓN' : 'SERVICIOS'}
                            </Text>
                            <View style={styles.stepDots}>
                                {[1, 2, 3, 4].map(s => (
                                    (accountType === 'mechanic' || s === 1) && (
                                        <View 
                                            key={s} 
                                            style={[styles.dot, step >= s && styles.dotActive, step === s && { width: 20 }]} 
                                        />
                                    )
                                ))}
                            </View>
                        </View>

                        {/* Step Content */}
                        {step === 1 && (
                            <View style={styles.form}>
                                <Text style={styles.sectionLabel}>Datos de Usuario</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="person-outline" size={20} color={THEME.primary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre Completo"
                                        placeholderTextColor={THEME.textMuted}
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                </View>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="mail-outline" size={20} color={THEME.primary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Correo Electrónico"
                                        placeholderTextColor={THEME.textMuted}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="lock-closed-outline" size={20} color={THEME.primary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Contraseña"
                                        placeholderTextColor={THEME.textMuted}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>

                                <Text style={[styles.sectionLabel, { marginTop: 15 }]}>¿Qué tipo de cuenta buscas?</Text>
                                <View style={styles.roleGrid}>
                                    {['client', 'mechanic'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.roleBtn, accountType === type && styles.roleBtnActive]}
                                            onPress={() => setAccountType(type as any)}
                                        >
                                            <Ionicons 
                                                name={type === 'client' ? 'car-outline' : 'construct-outline'} 
                                                size={24} 
                                                color={accountType === type ? 'white' : THEME.primary} 
                                            />
                                            <Text style={[styles.roleBtnText, accountType === type && styles.roleBtnTextActive]}>
                                                {type === 'client' ? 'Cliente' : 'Taller'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {step === 2 && (
                            <View style={styles.form}>
                                <Text style={styles.sectionLabel}>Identidad del Taller</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre Comercial"
                                        placeholderTextColor={THEME.textMuted}
                                        value={wData.name}
                                        onChangeText={v => setWData({...wData, name: v})}
                                    />
                                </View>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Teléfono del Taller"
                                        placeholderTextColor={THEME.textMuted}
                                        value={wData.phone}
                                        onChangeText={v => setWData({...wData, phone: v})}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                                <View style={[styles.inputWrap, { height: 100, alignItems: 'flex-start' }]}>
                                    <TextInput
                                        style={[styles.input, { height: '100%' }]}
                                        placeholder="Breve descripción..."
                                        placeholderTextColor={THEME.textMuted}
                                        value={wData.description}
                                        onChangeText={v => setWData({...wData, description: v})}
                                        multiline
                                    />
                                </View>
                            </View>
                        )}

                        {step === 3 && (
                            <View style={styles.form}>
                                <Text style={styles.sectionLabel}>Ubicación en el Mapa</Text>
                                <View style={styles.mapContainer}>
                                    <MapView
                                        style={styles.map}
                                        initialRegion={{
                                            latitude: wData.latitude,
                                            longitude: wData.longitude,
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        }}
                                        onPress={(e) => setWData({
                                            ...wData, 
                                            latitude: e.nativeEvent.coordinate.latitude,
                                            longitude: e.nativeEvent.coordinate.longitude
                                        })}
                                    >
                                        <Marker 
                                            coordinate={{ latitude: wData.latitude, longitude: wData.longitude }}
                                            draggable
                                        />
                                    </MapView>
                                </View>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Dirección completa"
                                        placeholderTextColor={THEME.textMuted}
                                        value={wData.address}
                                        onChangeText={v => setWData({...wData, address: v})}
                                    />
                                </View>
                            </View>
                        )}

                        {step === 4 && (
                            <ScrollView style={{ maxHeight: height * 0.4 }}>
                                <Text style={styles.sectionLabel}>Especialidades</Text>
                                <View style={styles.chipGrid}>
                                    {CATEGORIES.map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.chip, wData.categories.includes(cat) && styles.chipActive]}
                                            onPress={() => toggleSelection(cat, 'categories')}
                                        >
                                            <Text style={[styles.chipText, wData.categories.includes(cat) && styles.chipTextActive]}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Métodos de Pago</Text>
                                <View style={styles.chipGrid}>
                                    {PAYMENTS.map(pm => (
                                        <TouchableOpacity
                                            key={pm}
                                            style={[styles.chip, wData.paymentMethods.includes(pm) && styles.chipActive]}
                                            onPress={() => toggleSelection(pm, 'paymentMethods')}
                                        >
                                            <Text style={[styles.chipText, wData.paymentMethods.includes(pm) && styles.chipTextActive]}>{pm}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        )}

                        {/* Controls */}
                        <View style={styles.footer}>
                            {step > 1 && (
                                <TouchableOpacity 
                                    style={styles.backBtn} 
                                    onPress={() => setStep(step - 1)}
                                >
                                    <Text style={styles.backBtnText}>VOLVER</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={styles.nextBtn} 
                                onPress={handleNext}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={[THEME.primary, '#1e8fb5']}
                                    style={styles.gradientBtn}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text style={styles.nextBtnText}>
                                                {step === 4 || accountType === 'client' ? 'REGISTRARME' : 'SIGUIENTE'}
                                            </Text>
                                            <Ionicons name="arrow-forward" size={18} color="white" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.loginLink}>
                            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
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
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 30,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)', // Solo funciona en versiones recientes de iOS/web, pero la opacidad ayuda
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    brandTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 4,
        textTransform: 'uppercase',
        opacity: 0.6,
    },
    stepTitle: {
        color: 'white',
        fontSize: 32,
        fontWeight: '900',
        marginTop: 5,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    stepSubtitle: {
        color: THEME.primary,
        fontSize: 14,
        fontWeight: '700',
        marginTop: 2,
        letterSpacing: 1,
        textAlign: 'center',
    },
    stepDots: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 15,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    dotActive: {
        backgroundColor: THEME.primary,
    },
    form: {
        gap: 15,
    },
    sectionLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.8,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 55,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    input: {
        flex: 1,
        color: 'white',
        marginLeft: 10,
        fontSize: 16,
    },
    roleGrid: {
        flexDirection: 'row',
        gap: 15,
    },
    roleBtn: {
        flex: 1,
        height: 80,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    roleBtnActive: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
    },
    roleBtnText: {
        color: THEME.textMuted,
        fontSize: 14,
        fontWeight: '700',
    },
    roleBtnTextActive: {
        color: 'white',
    },
    mapContainer: {
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    map: {
        flex: 1,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chipActive: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
    },
    chipText: {
        color: THEME.textMuted,
        fontSize: 13,
    },
    chipTextActive: {
        color: 'white',
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 25,
    },
    backBtn: {
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnText: {
        color: THEME.textMuted,
        fontWeight: '700',
    },
    nextBtn: {
        flex: 1,
        height: 55,
        borderRadius: 15,
        overflow: 'hidden',
    },
    gradientBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    nextBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    loginLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginText: {
        color: THEME.textMuted,
    },
    linkText: {
        color: THEME.primary,
        fontWeight: '800',
    },
});
