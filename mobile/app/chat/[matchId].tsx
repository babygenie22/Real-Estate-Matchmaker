import { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, Image,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { api, getToken } from "@/lib/api";
import { API_URL, Colors, HIT_SLOP } from "@/lib/constants";

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  createdAt: string;
  status?: "sending" | "failed";
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
        // Reconcile: if this is our own message echoed back, drop the optimistic copy.
        const withoutOptimistic = prev.filter(
          (m) => !(m.status === "sending" && m.senderId === msg.senderId && m.content === msg.content)
        );
        return [...withoutOptimistic, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }

  async function deliver(content: string, tempId: string) {
    try {
      const saved = await api.post<Message>("/api/messages", { matchId, content });
      // Replace the optimistic bubble with the server copy (socket may also do this).
      setMessages((prev) => {
        if (saved?.id && prev.find((m) => m.id === saved.id)) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? { ...saved, status: undefined } : m));
      });
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    }
  }

  function sendMessage() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? "me",
      senderType: "buyer",
      content,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    deliver(content, tempId);
  }

  function retryMessage(msg: Message) {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "sending" } : m)));
    deliver(msg.content, msg.id);
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
            const failed = item.status === "failed";
            const sending = item.status === "sending";
            return (
              <View>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, failed && styles.bubbleFailed]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                    {item.content}
                  </Text>
                  <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                      {sending ? "Sending…" : formatTime(item.createdAt)}
                    </Text>
                    {!sending && !failed && isMe && (
                      <Text style={styles.bubbleCheck}>✓</Text>
                    )}
                  </View>
                </View>
                {failed && (
                  <TouchableOpacity onPress={() => retryMessage(item)} hitSlop={HIT_SLOP} style={styles.retryRow}>
                    <Text style={styles.retryText}>Failed to send · Tap to retry</Text>
                  </TouchableOpacity>
                )}
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
  agentBarActions: { flexDirection: "row", gap: 8 },
  agentBarBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
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
  bubbleFailed: { backgroundColor: Colors.destructive },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: Colors.foreground },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  bubbleTime: { fontSize: 10 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.6)" },
  bubbleTimeThem: { color: Colors.mutedForeground },
  bubbleCheck: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  retryRow: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 2 },
  retryText: { fontSize: 11, color: Colors.destructive, fontWeight: "600" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  textInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.foreground, maxHeight: 100, backgroundColor: Colors.card },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: "#fff", fontSize: 18, marginLeft: 2 },
});
