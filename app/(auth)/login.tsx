
import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';

// Use a cool car image for the background
const BACKGROUND_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signIn() {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa correo y contraseña');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            // Redirection handled by simple effect or root layout
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Background Image */}
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
                <View style={styles.glassCard}>
                    <Text style={styles.title}>AUTOSPOT</Text>
                    <Text style={styles.subtitle}>Bienvenido al Taller</Text>

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

                    <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="black" />
                        ) : (
                            <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                        <Link href="/(auth)/sign-up" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Regístrate</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        flex: 1,
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
        fontSize: 42,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 2,
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 16,
        color: '#8ecae6',
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
        backgroundColor: '#219ebc',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#219ebc',
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
        color: '#ffb703',
        fontWeight: 'bold',
    },
});
