import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function WorkshopProfile({ route }: any) {
  const [workshop, setWorkshop] = useState<any>(null);
  const { id } = useLocalSearchParams();
  const workshopId = Array.isArray(id) ? id[0] : id;
  console.log("ID:", id);
  console.log("WORKSHOP ID:", workshopId);

  useEffect(() => {
    fetchWorkshop();
  }, []);

  const fetchWorkshop = async () => {
    const { data, error } = await supabase
      .from("workshops")
      .select(`
        *,
        workshop_services (
          custom_price,
          service_catalog (
            name,
            description,
            estimated_price
          )
        ),
        workshop_reviews (
          rating,
          comment
        ),
        workshop_images (
          image_url
        )
      `)
      .eq("id", workshopId)
      .single();

    if (error) {
      console.log("ERROR:", error);
      return;
    }

    console.log("DATA:", data);
    setWorkshop(data);
  };

  if (!workshop) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando taller...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{workshop.name}</Text>
      <Text>{workshop.address}</Text>

      {/* IMÁGENES */}
      <ScrollView horizontal>
        {workshop.workshop_images?.length > 0 ? (
          <ScrollView horizontal>
            {workshop.workshop_images.map((img: any, i: number) => (
              <Image
                key={i}
                source={{ uri: img.image_url }}
                style={styles.image}
              />
            ))}
          </ScrollView>
        ) : (
          <Text>No hay imágenes disponibles</Text>
        )}
      </ScrollView>

      {/* SERVICIOS */}
      <Text style={styles.section}>Servicios</Text>
      {workshop.workshop_services?.length > 0 ? (
        workshop.workshop_services.map((s: any, i: number) => (
          <Text key={i}>
            • {s.service_catalog.name} - $
            {s.custom_price || s.service_catalog.estimated_price}
          </Text>
        ))
      ) : (
        <Text>No hay servicios registrados</Text>
      )}

      {/* RESEÑAS */}
      <Text style={styles.section}>Reseñas</Text>
      {workshop.workshop_reviews?.length > 0 ? (
        workshop.workshop_reviews.map((r: any, i: number) => (
          <View key={i}>
            <Text>⭐ {r.rating}</Text>
            <Text>{r.comment}</Text>
          </View>
        ))
      ) : (
        <Text>Aún no hay reseñas</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
  },
  section: {
    marginTop: 15,
    fontWeight: "bold",
    color: "#219ebc",
  },
  text: {
    color: "#333",
  },
  image: { width: 200, height: 120, marginRight: 10, borderRadius: 10 },
});