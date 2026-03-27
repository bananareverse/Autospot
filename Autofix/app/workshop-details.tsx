import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#219ebc',
    secondary: '#023047',
    accent: '#fb8500',
    bg: '#FFFFFF',
    card: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    white: '#FFFFFF',
    star: '#FBBF24',
};

const WORKSHOP_PLACEHOLDER = 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?q=80&w=1200&auto=format&fit=crop';

type Workshop = {
    id: string;
    name: string;
    address?: string;
    phone?: string | null;
    description?: string | null;
    opening_hours?: string | null;
    categories?: string[] | null;
    payment_methods?: string[] | null;
    rating?: number;
    total_reviews?: number;
};

type WorkshopService = {
    id: string;
    name: string;
    description?: string;
    estimated_price?: number | null;
};

type WorkshopReview = {
    id: string;
    rating: number;
    comment?: string | null;
    created_at: string;
    client?: {
        first_name?: string | null;
        last_name?: string | null;
    } | null;
};

export default function WorkshopDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [services, setServices] = useState<WorkshopService[]>([]);
    const [reviews, setReviews] = useState<WorkshopReview[]>([]);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        if (!id) return;
        loadWorkshopDetails(id);
    }, [id]);

    async function loadWorkshopDetails(workshopId: string) {
        try {
            setLoading(true);
            setError(null);

            const { data: workshopCore, error: workshopCoreError } = await supabase
                .from('workshops')
                .select('id, name, address, phone, description, opening_hours, categories, payment_methods')
                .eq('id', workshopId)
                .single();

            if (workshopCoreError) throw workshopCoreError;

            const { data: workshopStats, error: workshopStatsError } = await supabase
                .from('workshops_with_coords')
                .select('id, rating, total_reviews')
                .eq('id', workshopId)
                .single();

            if (workshopStatsError) {
                setWorkshop({ ...workshopCore, rating: 0, total_reviews: 0 });
            } else {
                setWorkshop({
                    ...workshopCore,
                    rating: workshopStats.rating,
                    total_reviews: workshopStats.total_reviews,
                });
            }

            const { data: mappedServices, error: mappedError } = await supabase
                .from('workshop_services')
                .select('custom_price, service:service_catalog(id, name, description, estimated_price)')
                .eq('workshop_id', workshopId)
                .eq('active', true);

            if (!mappedError && mappedServices) {
                const normalized = mappedServices
                    .map((row: any) => ({
                        ...row.service,
                        estimated_price: row.custom_price || row.service?.estimated_price,
                    }))
                    .filter(Boolean);
                setServices(normalized);
            } else {
                const { data: genericServices } = await supabase
                    .from('service_catalog')
                    .select('id, name, description')
                    .eq('active', true);
                setServices(genericServices || []);
            }

            await loadWorkshopReviews(workshopId);
        } catch (e: any) {
            setError(e.message || 'No se pudo cargar la información.');
        } finally {
            setLoading(false);
        }
    }

    async function loadWorkshopReviews(workshopId: string) {
        const { data } = await supabase
            .from('workshop_reviews')
            .select('id, rating, comment, created_at, client:clients(first_name, last_name)')
            .eq('workshop_id', workshopId)
            .order('created_at', { ascending: false });
        setReviews((data || []) as WorkshopReview[]);
    }

    async function getCurrentClientId() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) throw new Error('Inicia sesión para opinar.');
        const { data: client } = await supabase.from('clients').select('id').eq('email', user.email).single();
        if (!client) throw new Error('Perfil no encontrado.');
        return client.id;
    }

    async function handleSubmitReview() {
        if (!id || !reviewComment.trim()) return;
        setSubmittingReview(true);
        try {
            const clientId = await getCurrentClientId();
            const { error: insertError } = await supabase
                .from('workshop_reviews')
                .upsert({
                    workshop_id: id,
                    client_id: clientId,
                    rating: reviewRating,
                    comment: reviewComment.trim(),
                }, { onConflict: 'workshop_id,client_id' });

            if (insertError) throw insertError;
            setReviewComment('');
            setReviewRating(5);
            await loadWorkshopReviews(id);
            Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSubmittingReview(false);
        }
    }

    if (loading) return (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={THEME.primary} />
        </View>
    );

    if (error || !workshop) return (
        <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color={THEME.accent} />
            <Text style={styles.errorText}>Vaya, algo salió mal.</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Regresar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <Image source={WORKSHOP_PLACEHOLDER} style={styles.heroImage} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroGradient}
                    />
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>

                    <View style={styles.heroContent}>
                        <Text style={styles.workshopName}>{workshop.name}</Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={16} color={THEME.star} />
                            <Text style={styles.ratingText}>{workshop.rating?.toFixed(1) || '0.0'}</Text>
                            <Text style={styles.reviewCount}>({workshop.total_reviews} reseñas)</Text>
                        </View>
                    </View>
                </View>

                {/* Info Card Flotante */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Ionicons name="location" size={20} color={THEME.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>UBICACIÓN</Text>
                            <Text style={styles.infoValue}>{workshop.address || 'Sin dirección'}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { marginTop: 16 }]}>
                        <View style={styles.infoIconBox}>
                            <Ionicons name="time" size={20} color={THEME.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>HORARIO</Text>
                            <Text style={styles.infoValue}>{workshop.opening_hours || 'Consulta con el taller'}</Text>
                        </View>
                    </View>

                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity 
                            style={styles.actionBtnPrimary}
                            onPress={() => router.push({ pathname: '/schedule-appointment', params: { workshopId: workshop.id } })}
                        >
                            <Ionicons name="calendar" size={18} color="white" />
                            <Text style={styles.actionBtnText}>Agendar Cita</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.actionBtnSecondary}
                            onPress={() => router.push({ pathname: '/(tabs)/MapScreen', params: { workshopId: workshop.id } })}
                        >
                            <Ionicons name="map" size={18} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Descripción y Tags */}
                <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Acerca del Taller</Text>
                    <Text style={styles.descriptionText}>{workshop.description || 'Este taller no ha agregado una descripción todavía.'}</Text>
                    
                    {!!workshop.categories?.length && (
                        <View style={styles.tagCloud}>
                            {workshop.categories.map((cat) => (
                                <View key={cat} style={styles.tagBox}>
                                    <Text style={styles.tagText}>{cat}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Servicios */}
                <View style={styles.servicesSection}>
                    <Text style={styles.sectionTitle}>Catálogo de Servicios</Text>
                    {services.length === 0 ? (
                        <Text style={styles.emptyText}>No hay servicios listados aún.</Text>
                    ) : (
                        services.map((service) => (
                            <View key={service.id} style={styles.serviceCard}>
                                <View style={styles.serviceHeader}>
                                    <View style={styles.serviceIconContainer}>
                                        <Ionicons 
                                            name={getServiceIcon(service.name)} 
                                            size={24} 
                                            color={THEME.primary} 
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.serviceName}>{service.name}</Text>
                                        <Text style={styles.servicePrice}>desde ${service.estimated_price?.toLocaleString() || '---'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.serviceDesc}>{service.description}</Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Reseñas */}
                <View style={styles.reviewsSection}>
                    <Text style={styles.sectionTitle}>Reseñas de Clientes</Text>
                    
                    {/* Formulario de Reseña */}
                    <View style={styles.addReviewCard}>
                        <Text style={styles.addReviewTitle}>¿Qué te pareció el servicio?</Text>
                        <View style={styles.starSelector}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                                    <Ionicons
                                        name={star <= reviewRating ? 'star' : 'star-outline'}
                                        size={30}
                                        color={star <= reviewRating ? THEME.star : THEME.textMuted}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.reviewInput}
                            placeholder="Comparte tu experiencia..."
                            placeholderTextColor={THEME.textMuted}
                            multiline
                            value={reviewComment}
                            onChangeText={setReviewComment}
                        />
                        <TouchableOpacity 
                            style={[styles.submitReviewBtn, (!reviewComment.trim() || submittingReview) && { opacity: 0.5 }]}
                            onPress={handleSubmitReview}
                            disabled={!reviewComment.trim() || submittingReview}
                        >
                            {submittingReview ? <ActivityIndicator color="white" /> : <Text style={styles.submitReviewText}>Publicar Opinión</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Lista de Reseñas */}
                    {reviews.map((rev) => (
                        <View key={rev.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeaderRow}>
                                <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(rev.client?.first_name) }]}>
                                    <Text style={styles.avatarLetter}>{rev.client?.first_name?.charAt(0).toUpperCase() || 'U'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reviewerName}>{rev.client?.first_name} {rev.client?.last_name}</Text>
                                    <Text style={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.reviewRatingBadge}>
                                    <Ionicons name="star" size={12} color={THEME.star} />
                                    <Text style={styles.reviewRatingText}>{rev.rating}</Text>
                                </View>
                            </View>
                            <Text style={styles.reviewCommentText}>{rev.comment}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

function getServiceIcon(name: string): any {
    const n = name.toLowerCase();
    if (n.includes('frenos')) return 'disc';
    if (n.includes('aceite') || n.includes('afinación')) return 'color-fill';
    if (n.includes('eléctrico') || n.includes('batería')) return 'flash';
    if (n.includes('suspensión')) return 'git-branch';
    if (n.includes('motor')) return 'speedometer';
    if (n.includes('aire')) return 'snow';
    if (n.includes('limpieza') || n.includes('estético')) return 'sparkles';
    return 'construct';
}

function getAvatarColor(name?: string | null): string {
    const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 30 },
    errorText: { fontSize: 18, fontWeight: 'bold', color: THEME.secondary },
    backBtn: { backgroundColor: THEME.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    backBtnText: { color: 'white', fontWeight: 'bold' },
    
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    
    heroContainer: { height: 320, width: '100%', position: 'relative' },
    heroImage: { width: '100%', height: '100%' },
    heroGradient: { ...StyleSheet.absoluteFillObject },
    headerBackBtn: { 
        position: 'absolute', top: 50, left: 20, 
        width: 40, height: 40, borderRadius: 20, 
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' 
    },
    heroContent: { position: 'absolute', bottom: 30, left: 24, right: 24 },
    workshopName: { fontSize: 32, fontWeight: '900', color: 'white', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
    ratingText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    reviewCount: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

    infoCard: {
        backgroundColor: 'white', padding: 24, borderRadius: 24,
        marginHorizontal: 20, marginTop: -30, elevation: 10,
        shadowColor: 'black', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1, shadowRadius: 20,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    infoIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(33, 158, 188, 0.1)', justifyContent: 'center', alignItems: 'center' },
    infoLabel: { fontSize: 10, fontWeight: '900', color: THEME.textMuted, letterSpacing: 1 },
    infoValue: { fontSize: 14, fontWeight: 'bold', color: THEME.secondary },

    actionButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    actionBtnPrimary: { flex: 1, height: 50, backgroundColor: THEME.primary, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    actionBtnSecondary: { width: 50, height: 50, backgroundColor: 'rgba(33, 158, 188, 0.1)', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },

    descriptionSection: { paddingHorizontal: 24, marginTop: 30 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: THEME.secondary, marginBottom: 12 },
    descriptionText: { fontSize: 14, color: THEME.textMuted, lineHeight: 22 },
    tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    tagBox: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 8 },
    tagText: { fontSize: 12, fontWeight: 'bold', color: THEME.primary },

    servicesSection: { paddingHorizontal: 24, marginTop: 40 },
    serviceCard: { backgroundColor: THEME.card, padding: 20, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
    serviceHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 10 },
    serviceIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
    serviceName: { fontSize: 16, fontWeight: 'bold', color: THEME.secondary },
    servicePrice: { fontSize: 14, fontWeight: '900', color: THEME.primary, marginTop: 2 },
    serviceDesc: { fontSize: 13, color: THEME.textMuted, lineHeight: 18 },

    reviewsSection: { paddingHorizontal: 24, marginTop: 40 },
    addReviewCard: { backgroundColor: '#F9FAFB', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: THEME.border },
    addReviewTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.secondary, textAlign: 'center' },
    starSelector: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 16 },
    reviewInput: { backgroundColor: 'white', padding: 16, borderRadius: 15, height: 100, textAlignVertical: 'top', fontSize: 14, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
    submitReviewBtn: { backgroundColor: THEME.secondary, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
    submitReviewText: { color: 'white', fontWeight: 'bold' },

    reviewCard: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: THEME.border },
    reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarLetter: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    reviewerName: { fontSize: 14, fontWeight: 'bold', color: THEME.text },
    reviewDate: { fontSize: 12, color: THEME.textMuted },
    reviewRatingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    reviewRatingText: { fontSize: 12, fontWeight: 'bold', color: '#92400E' },
    reviewCommentText: { fontSize: 14, color: THEME.text, lineHeight: 22 },
    emptyText: { color: THEME.textMuted, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }
});
