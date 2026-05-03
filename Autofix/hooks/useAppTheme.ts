import { useColorScheme } from 'react-native';

export const LIGHT_THEME = {
  primary: '#219ebc',
  secondary: '#023047',
  accent: '#fb8500',
  bg: '#F9FAFB',     // Fondo muy claro
  card: '#FFFFFF',   // Tarjetas blancas
  text: '#111827',   // Texto oscuro
  textSoft: '#6B7280',
  textMuted: '#6B7280', // Alias
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#10B981',
  status: {
    scheduled: '#219ebc',
    confirmed: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
  }
};

export const DARK_THEME = {
  primary: '#219ebc',   // Mantenemos colores de marca
  secondary: '#023047', 
  accent: '#fb8500',
  bg: '#111827',     // Fondo gris muy oscuro (Casi negro)
  card: '#1F2937',   // Tarjetas gris oscuro
  text: '#F9FAFB',   // Texto casi blanco
  textSoft: '#9CA3AF', // Texto secundario gris claro
  textMuted: '#9CA3AF', // Alias
  border: '#374151', // Bordes sutiles
  danger: '#EF4444',
  success: '#10B981',
  status: {
    scheduled: '#219ebc',
    confirmed: '#10B981',
    completed: '#9CA3AF', // Lighter gray for dark mode completed
    cancelled: '#EF4444',
  }
};

// Hook personalizado para obtener el tema actual basado en el sistema
export function useAppTheme() {
  const colorScheme = useColorScheme(); // 'light' | 'dark' | null
  return colorScheme === 'dark' ? DARK_THEME : LIGHT_THEME;
}
