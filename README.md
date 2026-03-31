# AutoSpot - Gestión de Talleres
Plataforma para la administración de citas y comunicación en tiempo real entre talleres mecánicos y clientes.

# Características Principales
- **Dashboard de Taller:** Gestión de agenda diaria, actualización de estados de reparación y control de servicios.
- **Portal de Cliente:** Búsqueda de talleres por geolocalización, registro de vehículos y seguimiento detallado de citas.
- **Mensajería en Tiempo Real:** Chat directo entre el taller y el cliente integrado en cada cita.
- **Diseño Premium:** Interfaz de usuario moderna, fluida y adaptada para dispositivos móviles.

## Stack Tecnológico
- **Framework:** [Expo] / React Native
- **Navegación:** [Expo Router]
- **Backend:** [Supabase]

## Guía de Inicio Rápido

### 1. Instalación
Clona el repositorio y accede a la carpeta del proyecto:
```bash
git clone [https://github.com/bananareverse/Autospot.git]
cd Autofix
npm install
```
### 2. Configuración de Variables de Entorno
Crea un archivo 

.env
 en la raíz de la carpeta Autofix y añade tus credenciales de Supabase:
```bash
env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-publica
```

### 3. Ejecución
Inicia el servidor de desarrollo de Expo:

```bash
npx expo start
Puedes usar Expo Go en tu dispositivo físico o un emulador de Android/iOS.
```
