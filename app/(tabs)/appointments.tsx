import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Nuevo Tema Claro
const THEME = {
    background: '#FFFFFF', // Blanco
    text: '#1F2937',       // Gris oscuro
    textLight: '#6B7280',  // Gris medio para subtítulos
    primary: '#2563EB',    // Azul vibrante
    secondary: '#1E3A8A',  // Azul oscuro (headers)
    border: '#E5E7EB',     // Gris claro
    cardBg: '#F3F4F6',     // Gris muy muy claro para tarjetas
};

export default function AppointmentsScreen() {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Citas</Text>
            </View>

            {/* Tabs Superiores */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                    <Text style={[styles.tabText, styles.activeTabText]}>Programadas (0)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                    <Text style={styles.tabText}>Realizadas (0)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                    <Text style={styles.tabText}>Canceladas (0)</Text>
                </TouchableOpacity>
            </View>

            {/* Contenido */}
            <View style={styles.content}>
                <View style={styles.illustrationContainer}>
                    <Ionicons name="calendar-outline" size={80} color={THEME.primary} style={{ opacity: 0.8 }} />
                    <View style={styles.calendarDecoration} />
                </View>

                <Text style={styles.emptyTitle}>No tienes citas programadas</Text>
                <Text style={styles.emptySubtitle}>Agenda una cita y aparecerá en esta sección.</Text>

                <TouchableOpacity style={styles.ctaButton}>
                    <Text style={styles.ctaButtonText}>Agendar Cita</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: THEME.secondary, // Azul oscuro para títulos
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 40,
        gap: 10,
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        backgroundColor: 'white',
    },
    activeTab: {
        backgroundColor: '#EFF6FF', // Azul muy clarito
        borderColor: THEME.primary,
    },
    tabText: {
        color: THEME.textLight,
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: THEME.primary,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        marginTop: -50,
    },
    illustrationContainer: {
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
        backgroundColor: '#EFF6FF',
        borderRadius: 60,
    },
    calendarDecoration: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: THEME.primary,
        top: 25,
        right: 35,
        borderWidth: 2,
        borderColor: 'white',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 16,
        color: THEME.textLight,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    ctaButton: {
        backgroundColor: THEME.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
