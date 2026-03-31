# AutoSpot - Gestión Integral de Talleres
Plataforma premium para la administración de citas y comunicación en tiempo real entre talleres mecánicos y clientes.


## ✨ Características Principales
- **Dashboard de Taller:** Gestión de agenda diaria, actualización de estados de reparación y control de servicios.
- **Portal de Cliente:** Búsqueda de talleres por geolocalización, registro de vehículos y seguimiento detallado de citas.
- **Mensajería en Tiempo Real:** Chat directo entre el taller y el cliente integrado en cada cita.
- **Diseño Premium:** Interfaz de usuario moderna, fluida y adaptada para dispositivos móviles.

## 🛠️ Stack Tecnológico
- **Framework:** [Expo](https://expo.dev) / React Native
- **Navegación:** [Expo Router](https://docs.expo.dev/router/introduction/) (Routing basado en archivos)
- **Backend:** [Supabase](https://supabase.com) (Base de datos PostgreSQL, Auth y Realtime)
- **Estado:** Context API para manejo de autenticación global.

### 1. Instalación
Clona el repositorio y accede a la carpeta del proyecto:
```bash
git clone [tu-url-del-repo]
cd Autofix
npm install
```

### 2. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz de la carpeta `Autofix` y añade tus credenciales de Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-publica
```

### 3. Ejecución
Inicia el servidor de desarrollo de Expo:
```bash
npx expo start
```
Puedes usar **Expo Go** en tu dispositivo físico o un emulador de Android/iOS.

## Estructura de Carpetas
- `/app`: Rutas y pantallas de la aplicación.
- `/components`: Elementos de UI reutilizables y tematizados.
- `/ctx`: Lógica de autenticación vinculada a Supabase.
- `/lib`: Clientes de API y configuraciones base.
- `/supabase`: Archivos relacionados con el esquema de la base de datos.