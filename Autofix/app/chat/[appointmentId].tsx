import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { 
    ActivityIndicator, 
    FlatList, 
    KeyboardAvoidingView, 
    Platform, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View,
    SafeAreaView,
    StatusBar
} from 'react-native';

const THEME = {
    primary: '#219ebc',
    secondary: '#023047',
    bg: '#F8FAFC',
    white: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    bubbleUser: '#219ebc',
    bubbleOther: '#E2E8F0',
};

export default function ChatScreen() {
    const { appointmentId } = useLocalSearchParams();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        getCurrentUser();
        loadMessages();
        const subscription = subscribeToMessages();
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [appointmentId]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
    };

    const loadMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('appointment_id', appointmentId)
                .order('created_at', { ascending: false });
            
            if (data) setMessages(data);
        } catch (e) {
            console.error("Error loading messages:", e);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMessages = () => {
        return supabase
            .channel(`chat:${appointmentId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `appointment_id=eq.${appointmentId}` 
            }, (payload) => {
                setMessages((current) => [payload.new, ...current]);
            })
            .subscribe();
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !userId) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    appointment_id: appointmentId,
                    sender_id: userId,
                    content: content
                });
            
            if (error) throw error;
        } catch (e) {
            console.error("Error sending message:", e);
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMine = item.sender_id === userId;
        return (
            <View style={[styles.messageRow, isMine ? styles.rowMine : styles.rowOther]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.messageText, isMine ? styles.textMine : styles.textOther]}>
                        {item.content}
                    </Text>
                    <View style={styles.bubbleFooter}>
                        <Text style={[styles.timeText, isMine ? styles.timeMine : styles.timeOther]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen 
                options={{ 
                    title: 'Chat de Cita',
                    headerTitleStyle: { fontWeight: '900', color: THEME.secondary },
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                            <Ionicons name="arrow-back" size={24} color={THEME.secondary} />
                        </TouchableOpacity>
                    ),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: THEME.bg }
                }} 
            />

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="small" color={THEME.primary} /></View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        inverted={true}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.listContent}
                    />
                )}

                <View style={styles.inputArea}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Escribe un mensaje..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                        />
                        <TouchableOpacity 
                            style={[styles.sendButton, !newMessage.trim() && { backgroundColor: THEME.textMuted }]} 
                            onPress={sendMessage}
                            disabled={!newMessage.trim()}
                        >
                            <Ionicons name="send" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    headerBack: { marginLeft: 10, width: 35, height: 35, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 16, paddingVertical: 10 },
    
    messageRow: { marginBottom: 12, flexDirection: 'row', width: '100%' },
    rowMine: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
    bubbleMine: { backgroundColor: THEME.bubbleUser, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: THEME.bubbleOther, borderBottomLeftRadius: 4 },
    
    messageText: { fontSize: 15, lineHeight: 20 },
    textMine: { color: 'white' },
    textOther: { color: THEME.text },
    
    bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    timeText: { fontSize: 10 },
    timeMine: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: THEME.textMuted },

    inputArea: { 
        padding: 12, 
        backgroundColor: THEME.white, 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9',
        paddingBottom: Platform.OS === 'ios' ? 5 : 12 
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F1F5F9',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 8
    },
    input: { 
        flex: 1, 
        fontSize: 15, 
        maxHeight: 120,
        color: THEME.text,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 8
    },
    sendButton: { 
        width: 36, 
        height: 36, 
        borderRadius: 18, 
        backgroundColor: THEME.primary, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 2
    }
});
