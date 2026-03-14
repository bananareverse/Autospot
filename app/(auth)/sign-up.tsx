
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';

const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1493238792015-1a419ac69251?q=80&w=1000&auto=format&fit=crop';

export default function SignUpScreen() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [accountType, setAccountType] = useState<'client' | 'mechanic'>('client');
    const [workshopName, setWorkshopName] = useState('');
    const [workshopPhone, setWorkshopPhone] = useState('');
    const [workshopAddress, setWorkshopAddress] = useState('');
    const [workshopDescription, setWorkshopDescription] = useState('');
    const [workshopHours, setWorkshopHours] = useState('');
    const [workshopCategories, setWorkshopCategories] = useState('');
    const [workshopPaymentMethods, setWorkshopPaymentMethods] = useState('');
    const [loading, setLoading] = useState(false);

    const emailError = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email)
        ? 'Ingresa un correo válido.'
        : '';
    const passwordError = password.length > 0 && !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
        ? 'Mínimo 8 caracteres, 1 mayúscula y 1 número.'
        : '';
    const fullNameError = fullName.length > 0 && fullName.trim().length < 3
        ? 'Escribe tu nombre completo.'
        : '';
    const workshopPhoneError = workshopPhone.length > 0 && !/^[\d\s()+-]{8,}$/.test(workshopPhone)
        ? 'Ingresa un teléfono válido.'
        : '';

    function validateStepOne() {
        if (!email || !password || !fullName) {
            Alert.alert('Error', 'Por favor llena los campos del paso 1.');
            return false;
        }
        if (emailError || passwordError || fullNameError) {
            Alert.alert('Error', 'Corrige los campos marcados para continuar.');
            return false;
        }
        return true;
    }

    function validateWorkshopDetails() {
        if (!workshopName || !workshopAddress || !workshopPhone || !workshopHours) {
            Alert.alert('Datos incompletos', 'Completa nombre, teléfono, dirección y horario del taller.');
            return false;
        }
        if (workshopPhoneError) {
            Alert.alert('Teléfono inválido', workshopPhoneError);
            return false;
        }
        return true;
    }

    function toList(value: string) {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    async function signUp() {
        if (!validateStepOne()) return;
        if (accountType === 'mechanic' && !validateWorkshopDetails()) {
            return;
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
                    workshop_draft: accountType === 'mechanic'
                        ? {
                            name: workshopName,
                            phone: workshopPhone,
                            address: workshopAddress,
                            description: workshopDescription || null,
                            opening_hours: workshopHours,
                            categories: toList(workshopCategories),
                            payment_methods: toList(workshopPaymentMethods),
                        }
                        : null,
                }
            }
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            try {
                const userId = data.session?.user?.id;

                if (userId) {
                    await supabase
                        .from('profiles')
                        .update({ role: accountType })
                        .eq('id', userId);

                    if (accountType === 'mechanic') {
                        const { data: workshop, error: workshopError } = await supabase
                            .from('workshops')
                            .insert([{
                                name: workshopName,
                                address: workshopAddress,
                                phone: workshopPhone,
                                description: workshopDescription || null,
                                opening_hours: workshopHours,
                                categories: toList(workshopCategories),
                                payment_methods: toList(workshopPaymentMethods),
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

            const successMessage = accountType === 'mechanic'
                ? 'Cuenta de taller creada. La activacion es automatica cuando tu perfil del taller este completo. Si tu correo requiere verificacion, la configuracion se completa al iniciar sesion por primera vez.'
                : 'Cuenta creada. Por favor inicia sesión.';

            Alert.alert('Éxito', successMessage);
            router.back(); // Go back to login
            setLoading(false);
        }
    }

    function handleNextStep() {
        if (!validateStepOne()) return;
        if (accountType === 'client') {
            signUp();
            return;
        }
        setStep(2);
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
                        <View style={styles.stepWrap}>
                            <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
                            <View style={[styles.stepDot, step === 2 && styles.stepDotActive, accountType === 'client' && styles.stepDotMuted]} />
                        </View>

                        {step === 1 && (
                            <>
                                <Text style={styles.stepTitle}>Paso 1: Datos de acceso</Text>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nombre Completo"
                                        placeholderTextColor="#a0a0a0"
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                </View>
                                {!!fullNameError && <Text style={styles.errorText}>{fullNameError}</Text>}

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
                                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

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
                                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

                                <Text style={styles.pickerLabel}>Tipo de cuenta</Text>
                                <View style={styles.roleSelector}>
                                    <TouchableOpacity
                                        style={[styles.roleButton, accountType === 'client' && styles.roleButtonActive]}
                                        onPress={() => {
                                            setAccountType('client');
                                            setStep(1);
                                        }}
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

                                <TouchableOpacity style={styles.button} onPress={handleNextStep} disabled={loading}>
                                    {loading ? (
                                        <ActivityIndicator color="black" />
                                    ) : (
                                        <Text style={styles.buttonText}>{accountType === 'mechanic' ? 'CONTINUAR' : 'CREAR CUENTA'}</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 2 && accountType === 'mechanic' && (
                            <>
                                <Text style={styles.stepTitle}>Paso 2: Perfil del taller</Text>
                                <Text style={styles.helperText}>
                                    Activacion automatica: tu taller pasa a activo cuando completas telefono, horario, categorias y metodos de pago.
                                </Text>

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
                                {!!workshopPhoneError && <Text style={styles.errorText}>{workshopPhoneError}</Text>}

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Dirección"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopAddress}
                                        onChangeText={setWorkshopAddress}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Horario (ej: Lun-Vie 9:00-18:00)"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopHours}
                                        onChangeText={setWorkshopHours}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Categorías (separadas por coma)"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopCategories}
                                        onChangeText={setWorkshopCategories}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Métodos de pago (coma)"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopPaymentMethods}
                                        onChangeText={setWorkshopPaymentMethods}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[styles.input, styles.multilineInput]}
                                        placeholder="Descripción del taller"
                                        placeholderTextColor="#a0a0a0"
                                        value={workshopDescription}
                                        onChangeText={setWorkshopDescription}
                                        multiline
                                    />
                                </View>

                                <View style={styles.actionsRow}>
                                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                                        <Text style={styles.secondaryButtonText}>VOLVER</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.buttonSmall} onPress={signUp} disabled={loading}>
                                        {loading ? (
                                            <ActivityIndicator color="black" />
                                        ) : (
                                            <Text style={styles.buttonText}>CREAR TALLER</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

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
        marginBottom: 14,
        letterSpacing: 1,
    },
    stepWrap: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    stepDotActive: {
        backgroundColor: '#fb8500',
    },
    stepDotMuted: {
        opacity: 0.45,
    },
    stepTitle: {
        color: '#ffffff',
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    helperText: {
        color: '#d1d5db',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 18,
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
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorText: {
        color: '#FCA5A5',
        fontSize: 12,
        marginTop: -10,
        marginBottom: 10,
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
    buttonSmall: {
        flex: 1,
        backgroundColor: '#fb8500',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
    },
    secondaryButtonText: {
        color: '#E5E7EB',
        fontWeight: '700',
        letterSpacing: 1,
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
