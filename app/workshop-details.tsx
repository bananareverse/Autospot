import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type Workshop = {
  id: string;
  name: string;
  address?: string;
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

const THEME = {
  bg: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#2563EB',
  cardBg: '#F9FAFB',
  border: '#E5E7EB',
  danger: '#EF4444',
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

      const { data: workshopData, error: workshopError } = await supabase
        .from('workshops_with_coords')
        .select('id, name, address, rating, total_reviews')
        .eq('id', workshopId)
        .single();

      if (workshopError) throw workshopError;
      setWorkshop(workshopData);

      // Preferred source: mapping table between workshops and service catalog.
      const { data: mappedServices, error: mappedError } = await supabase
        .from('workshop_services')
        .select('estimated_price, service:service_catalog(id, name, description)')
        .eq('workshop_id', workshopId)
        .eq('active', true);

      if (!mappedError && mappedServices) {
        const normalized = mappedServices
          .map((row: any) => ({
            ...row.service,
            estimated_price: row.estimated_price,
          }))
          .filter(Boolean);
        setServices(normalized);
      } else {
        // Fallback when the mapping table does not exist yet.
        const { data: genericServices, error: genericError } = await supabase
          .from('service_catalog')
          .select('id, name, description')
          .eq('active', true);

        if (genericError) throw genericError;
        setServices(genericServices || []);
      }

      await loadWorkshopReviews(workshopId);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la información del taller.');
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkshopReviews(workshopId: string) {
    const { data, error: reviewsError } = await supabase
      .from('workshop_reviews')
      .select('id, rating, comment, created_at, client:clients(first_name, last_name)')
      .eq('workshop_id', workshopId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      setReviews([]);
      return;
    }

    setReviews((data || []) as WorkshopReview[]);
  }

  async function getCurrentClientId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      throw new Error('Debes iniciar sesión para dejar una reseña.');
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email', user.email)
      .single();

    if (clientError || !client) {
      throw new Error('No se encontró el perfil del cliente.');
    }

    return client.id;
  }

  async function handleSubmitReview() {
    if (!id) return;
    const workshopId = Array.isArray(id) ? id[0] : id;

    if (!workshopId) return;
    if (!reviewComment.trim()) {
      Alert.alert('Reseña incompleta', 'Escribe un comentario para publicar la reseña.');
      return;
    }

    setSubmittingReview(true);
    try {
      const clientId = await getCurrentClientId();

      const { error: insertError } = await supabase
        .from('workshop_reviews')
        .upsert({
          workshop_id: workshopId,
          client_id: clientId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        }, { onConflict: 'workshop_id,client_id' });

      if (insertError) throw insertError;

      setReviewComment('');
      setReviewRating(5);
      await loadWorkshopReviews(workshopId);
      Alert.alert('Listo', 'Tu reseña fue guardada.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la reseña.');
    } finally {
      setSubmittingReview(false);
    }
  }

  function formatReviewerName(review: WorkshopReview) {
    const first = review.client?.first_name?.trim() || '';
    const last = review.client?.last_name?.trim() || '';
    const fullName = `${first} ${last}`.trim();
    return fullName || 'Usuario';
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Taller y Servicios' }} />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={THEME.danger} />
          <Text style={styles.errorText}>No se pudo cargar este taller.</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      )}

      {!loading && !error && workshop && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <Text style={styles.workshopName}>{workshop.name}</Text>
            <Text style={styles.workshopAddress}>{workshop.address || 'Dirección no disponible'}</Text>
            <Text style={styles.workshopMeta}>
              ⭐ {workshop.rating ?? 'N/A'} ({workshop.total_reviews ?? 0} reseñas)
            </Text>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => router.push({ pathname: '/(tabs)/MapScreen', params: { workshopId: workshop.id } })}
            >
              <Ionicons name="map-outline" size={16} color="white" />
              <Text style={styles.mapButtonText}>Ver en mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => router.push({ pathname: '/schedule-appointment', params: { workshopId: workshop.id } })}
            >
              <Ionicons name="calendar-outline" size={16} color="white" />
              <Text style={styles.mapButtonText}>Agendar en este taller</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Servicios que ofrece</Text>

          {services.length === 0 ? (
            <Text style={styles.emptyText}>Este taller aún no tiene servicios cargados.</Text>
          ) : (
            services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description || 'Sin descripción.'}</Text>
                {service.estimated_price != null && (
                  <Text style={styles.servicePrice}>Precio aprox: ${service.estimated_price}</Text>
                )}
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Reseñas</Text>

          <View style={styles.reviewFormCard}>
            <Text style={styles.reviewFormTitle}>Deja tu reseña</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={24}
                    color={star <= reviewRating ? '#F59E0B' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Cuéntanos tu experiencia con este taller"
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <TouchableOpacity
              style={[styles.submitReviewButton, submittingReview && { opacity: 0.6 }]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              <Text style={styles.submitReviewButtonText}>Publicar reseña</Text>
            </TouchableOpacity>
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>Todavía no hay reseñas para este taller.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{formatReviewerName(review)}</Text>
                  <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                <Text style={styles.reviewComment}>{review.comment || 'Sin comentario.'}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  headerCard: {
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  workshopName: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  workshopAddress: {
    fontSize: 14,
    color: THEME.textLight,
    marginBottom: 6,
  },
  workshopMeta: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '600',
  },
  mapButton: {
    marginTop: 12,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookButton: {
    marginTop: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 6,
    marginBottom: 4,
  },
  serviceCard: {
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: THEME.textLight,
    lineHeight: 18,
  },
  servicePrice: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.text,
    fontWeight: '600',
  },
  reviewFormCard: {
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  reviewFormTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  reviewInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    color: THEME.text,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  submitReviewButton: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  submitReviewButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  reviewDate: {
    fontSize: 12,
    color: THEME.textLight,
  },
  reviewRating: {
    fontSize: 15,
    color: '#F59E0B',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 13,
    color: THEME.textLight,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textLight,
  },
  errorText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textLight,
    textAlign: 'center',
  },
});
