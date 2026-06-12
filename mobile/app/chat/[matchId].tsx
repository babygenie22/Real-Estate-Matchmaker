import { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, Image,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { api, getToken } from "@/lib/api";
import { API_URL, Colors } from "@/lib/constants";

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  createdAt: string;
}

interface Match {
  id: string;
  agent: { id: string; name: string; photo: string | null };
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMatch();
    loadMessages();
    setupSocket();
    return () => { socketRef.current?.disconnect(); };
  }, [matchId]);

  async function loadMatch() {
    try {
      const matches = await api.get<Match[]>("/api/matches");
      const m = matches.find((x) => x.id === matchId);
      if (m) {
        setMatch(m);
        navigation.setOptions({ title: m.agent.name });
      }
    } catch {}
  }

  async function loadMessages() {
    try {
      const data = await api.get<Message[]>(`/api/matches/${matchId}/messages`);
      setMessages(data);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function setupSocket() {
    const token = await getToken();
    const socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join-match", matchId);
    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    try {
      await api.post("/api/messages", { matchId, content });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Agent header */}
      {match && (
        <View style={styles.agentBar}>
          <Image
            source={{ uri: match.agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.agent.name)}&size=80&background=dbeafe&color=2563eb` }}
            style={styles.agentAvatar}
          />
          <View style={styles.agentBarInfo}>
            <Text style={styles.agentName}>{match.agent.name}</Text>
            <Text style={styles.agentSub}>Real Estate Agent</Text>
          </View>
          <View style={styles.agentBarActions}>
            <TouchableOpacity
              style={styles.agentBarBtn}
              onPress={() => router.push(`/agent/${match.agent.id}` as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.agentBarBtnText}>👤 Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.agentBarBtn, styles.agentBarBtnPrimary]}
              onPress={() => router.push(`/booking/${match.agent.id}` as any)}
              activeOpacity={0.75}
            >
              <Text style={[styles.agentBarBtnText, styles.agentBarBtnTextPrimary]}>📅 Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>👋 Say hello to {match?.agent.name}!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                  {item.content}
                </Text>
                <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.mutedForeground}
            multiline
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim()}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  agentBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.card },
  agentAvatar: { width: 42, height: 42, borderRadius: 21 },
  agentBarInfo: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: "700", color: Colors.foreground },
  agentSub: { fontSize: 12, color: Colors.mutedForeground },
  agentBarActions: { flexDirection: "row", gap: 6 },
  agentBarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  agentBarBtnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  agentBarBtnText: { fontSize: 12, fontWeight: "600", color: Colors.foreground },
  agentBarBtnTextPrimary: { color: "#fff" },
  messageList: { padding: 16, gap: 8, paddingBottom: 8 },
  emptyChat: { flex: 1, alignItems: "center", paddingTop: 80 },
  emptyChatText: { color: Colors.mutedForeground, fontSize: 16 },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: "flex-start", backgroundColor: Colors.muted, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: Colors.foreground },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.6)" },
  bubbleTimeThem: { color: Colors.mutedForeground },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  textInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.foreground, maxHeight: 100, backgroundColor: Colors.card },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: "#fff", fontSize: 18, marginLeft: 2 },
});
