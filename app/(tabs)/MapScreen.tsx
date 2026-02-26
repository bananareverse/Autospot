import { supabase } from "@/supabase/supabaseClient";
import type { RootStackParamList } from "@/types/navigation";
import {
  NavigationProp,
  useNavigation
} from "@react-navigation/native";
import * as Location from "expo-location";
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
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

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
            const distance = getDistanceInKm(
                userLocation.latitude,
                userLocation.longitude,
                w.latitude,
                w.longitude
            );

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

    const getDistanceInKm = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
        ) => {
        const R = 6371; // radio tierra km
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
        {workshops.map((workshop) => (
        <Marker
            key={workshop.id}
            coordinate={{
            latitude: workshop.latitude,
            longitude: workshop.longitude,
            }}
            title={workshop.name}
            pinColor={
            selectedWorkshop?.id === workshop.id ? "blue" : "red"
            }
            onPress={() => {
            setSelectedWorkshop(workshop);
            }}
        />
        ))}
      </MapView>

      <View style={styles.listContainer}>
        <FlatList<Workshop>
            data={workshops}
            keyExtractor={(item) => item.id}
            horizontal
            renderItem={({ item }) => (
                <TouchableOpacity
                style={[
                    styles.card,
                    selectedWorkshop?.id === item.id && styles.selectedCard,
                ]}
                onPress={() => {
                    setSelectedWorkshop(item);

                    mapRef.current?.animateToRegion({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                    });
                }}
                >
                <Text style={styles.name}>{item.name}</Text>

                <Text style={styles.distance}>
                    {item.distance.toFixed(2)} km
                </Text>

                <Text style={styles.rating}>
                    ⭐ {item.rating} ({item.total_reviews} reseñas)
                </Text>
                </TouchableOpacity>
            )}
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
    bottom: 20,
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
    width: width * 0.8,
    elevation: 3,
  },
  selectedCard: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
  },
  distance: {
    fontSize: 14,
    marginTop: 4,
    color: "#555",
  },
  rating: {
    fontSize: 14,
    marginTop: 4,
    color: "#333",
  },
});