
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
    const [loading, setLoading] = useState(false);

    async function signUp() {
        if (!email || !password || !fullName) {
            Alert.alert('Error', 'Por favor llena todos los campos');
            return;
        }
        setLoading(true);

        // Pass metadata to trigger the postgres function we wrote!
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // default avatar
                }
            }
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
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
