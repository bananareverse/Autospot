import { supabase } from "@/lib/supabase";
import type { RootStackParamList } from "@/types/navigation";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Ionicons } from '@expo/vector-icons';

const THEME = {
  primary: '#219ebc',    
  secondary: '#023047',  
  accent: '#fb8500',     
  bg: '#FFFFFF',
  card: '#F9FAFB',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
};

interface Workshop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  total_reviews: number;
  distance: number
}

export default function MapScreen() {
  const { workshopId } = useLocalSearchParams<{ workshopId?: string | string[] }>();
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [routeActive, setRouteActive] = useState(false);
  const listRef = useRef<FlatList>(null);
  const mapRef = useRef<MapView | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyWorkshops();
    }
  }, [userLocation]);

  useEffect(() => {
    const targetWorkshopId = Array.isArray(workshopId) ? workshopId[0] : workshopId;
    if (!targetWorkshopId || workshops.length === 0) return;

    const targetWorkshop = workshops.find((w) => w.id === targetWorkshopId);
    if (!targetWorkshop) return;

    handleSelectWorkshop(targetWorkshop);
  }, [workshopId, workshops]);

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    let location = await Location.getCurrentPositionAsync({});
    setUserLocation(location.coords);
  };

  const fetchNearbyWorkshops = async () => {
    try {
      const { data, error } = await supabase
        .from("workshops_with_coords")
        .select("*");

      if (error) {
        console.log("Supabase error:", error);
        return;
      }

      if (!data) {
        console.log("No data returned");
        return;
      }

      console.log("RAW DATA:", data);

      if (!data || !userLocation) return;

      const withDistance = data.map((w) => {
        const distance = (w.latitude != null && w.longitude != null)
          ? getDistanceInKm(
            userLocation.latitude,
            userLocation.longitude,
            w.latitude,
            w.longitude
          )
          : 9999;

        return {
          ...w,
          distance,
        };
      });

      const sorted = withDistance.sort(
        (a, b) => a.distance - b.distance
      );

      setWorkshops(sorted);

    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectWorkshop = (workshop: Workshop) => {
    setSelectedWorkshop(workshop);

    mapRef.current?.animateToRegion({
      latitude: workshop.latitude,
      longitude: workshop.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  if (!userLocation) return null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {routeActive && selectedWorkshop && userLocation && (
          <MapViewDirections
            origin={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            destination={{
              latitude: selectedWorkshop.latitude,
              longitude: selectedWorkshop.longitude,
            }}
            apikey="AIzaSyDg8i6hdakgcXJoN9YLBFKPYWWOvaFypvo"
            strokeWidth={4}
            strokeColor={THEME.primary}
          />
        )}
        {workshops.filter(w => w.latitude != null && w.longitude != null).map((workshop) => (
          <Marker
            key={workshop.id}
            coordinate={{
              latitude: workshop.latitude,
              longitude: workshop.longitude,
            }}
            title={workshop.name}
            pinColor={
              selectedWorkshop?.id === workshop.id ? THEME.primary : THEME.accent
            }
            onPress={() => {
              setSelectedWorkshop(workshop);
              setRouteActive(false);

              const index = workshops.findIndex(w => w.id === workshop.id);

              listRef.current?.scrollToIndex({
                index,
                animated: true,
              });
            }}
          />
        ))}
      </MapView>

      <View style={styles.listContainer}>
        <FlatList<Workshop>
          ref={listRef}
          data={workshops}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 300);
          }}
          renderItem={({ item }) => {
            const isSelected = selectedWorkshop?.id === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.card,
                  isSelected && styles.selectedCard,
                ]}
                onPress={() => {
                  setSelectedWorkshop(item);
                  setRouteActive(false);

                  mapRef.current?.animateToRegion({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />}
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="location" size={14} color={THEME.primary} />
                    <Text style={styles.metaText}>{item.distance.toFixed(2)} km</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="star" size={14} color={THEME.accent} />
                    <Text style={styles.metaText}>{item.rating ?? 'N/A'} ({item.total_reviews ?? 0})</Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  {/* VER PERFIL */}
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("workshop-details" as any, { id: item.id })
                    }
                    style={styles.outlineButton}
                  >
                    <Ionicons name="business-outline" size={18} color={THEME.secondary} />
                    <Text style={styles.outlineButtonText}>Perfil</Text>
                  </TouchableOpacity>

                  {/* COMO LLEGAR */}
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedWorkshop(item);
                      setRouteActive(true);

                      mapRef.current?.animateToRegion({
                        latitude: item.latitude,
                        longitude: item.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      });
                    }}
                    style={styles.primaryButton}
                  >
                    <Ionicons name="navigate-outline" size={18} color="white" />
                    <Text style={styles.primaryButtonText}>Llegar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  listContainer: {
    position: "absolute",
    bottom: 30,
    width: "100%",
  },
  card: {
    backgroundColor: THEME.card,
    padding: 20,
    borderRadius: 24,
    marginHorizontal: 10,
    width: width * 0.85,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  selectedCard: {
    borderColor: THEME.primary,
    borderWidth: 2,
    backgroundColor: THEME.bg,
    shadowOpacity: 0.2,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontWeight: "900",
    fontSize: 18,
    color: THEME.secondary,
    flex: 1,
    marginRight: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  metaText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.secondary,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  outlineButtonText: {
    color: THEME.secondary,
    fontWeight: '800',
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
});