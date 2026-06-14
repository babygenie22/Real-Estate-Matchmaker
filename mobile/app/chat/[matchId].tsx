import { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert, Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { api, getToken } from "@/lib/api";
import { API_URL, HIT_SLOP } from "@/lib/constants";
import { useTheme, type ThemeColors } from "@/lib/theme";

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  createdAt: string;
  status?: "sending" | "failed";
}

// The other party in the conversation, normalized across buyer/agent views.
interface Peer {
  name: string;
  photo: string | null;
  subtitle: string;
  agentId?: string; // present only when the peer is an agent (buyer's view)
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuth();
  const isAgentRole = user?.role === "agent";
  const sendPath = isAgentRole ? "/api/agent-portal/messages" : "/api/messages";
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentTyping, setAgentTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMatch();
    loadMessages();
    setupSocket();
    return () => {
      socketRef.current?.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (typingHideTimeout.current) clearTimeout(typingHideTimeout.current);
    };
  }, [matchId]);

  async function loadMatch() {
    try {
      if (isAgentRole) {
        // Agent view: the peer is the matched buyer.
        const matches = await api.get<any[]>("/api/agent-portal/matches");
        const m = matches.find((x) => x.id === matchId);
        if (m?.user) {
          const name = [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || "Client";
          setPeer({ name, photo: m.user.photo ?? null, subtitle: "Client" });
          navigation.setOptions({ title: name });
        }
      } else {
        // Buyer view: the peer is the matched agent.
        const matches = await api.get<any[]>("/api/matches");
        const m = matches.find((x) => x.id === matchId);
        if (m?.agent) {
          setPeer({ name: m.agent.name, photo: m.agent.photo ?? null, subtitle: "Real Estate Agent", agentId: m.agent.id });
          navigation.setOptions({ title: m.agent.name });
        }
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
      setAgentTyping(false);
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
    socket.on("typing", ({ isTyping }: { matchId: string; isTyping: boolean }) => {
      setAgentTyping(isTyping);
      if (typingHideTimeout.current) clearTimeout(typingHideTimeout.current);
      // Safety: auto-hide if the stop signal never arrives.
      if (isTyping) typingHideTimeout.current = setTimeout(() => setAgentTyping(false), 6000);
    });
  }

  function emitTyping() {
    socketRef.current?.emit("typing", matchId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit("typing", matchId, false);
    }, 1800);
  }

  async function deliver(content: string, tempId: string) {
    try {
      const saved = await api.post<Message>(sendPath, { matchId, content });
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
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socketRef.current?.emit("typing", matchId, false);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? "me",
      senderType: isAgentRole ? "agent" : "user",
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
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Conversation header */}
      {peer && (
        <View style={styles.agentBar}>
          <Image
            source={{ uri: peer.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name)}&size=160&background=dbeafe&color=2563eb` }}
            style={styles.agentAvatar}
          />
          <View style={styles.agentBarInfo}>
            <Text style={styles.agentName}>{peer.name}</Text>
            <Text style={styles.agentSub}>{peer.subtitle}</Text>
          </View>
          {/* Profile/Book only make sense when the buyer is viewing an agent. */}
          {peer.agentId && (
            <View style={styles.agentBarActions}>
              <TouchableOpacity
                style={styles.agentBarBtn}
                onPress={() => router.push(`/agent/${peer.agentId}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.agentBarBtnRow}>
                  <Feather name="user" size={13} color={colors.foreground} />
                  <Text style={styles.agentBarBtnText}>Profile</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.agentBarBtn, styles.agentBarBtnPrimary]}
                onPress={() => router.push(`/booking/${peer.agentId}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.agentBarBtnRow}>
                  <Feather name="calendar" size={13} color="#fff" />
                  <Text style={[styles.agentBarBtnText, styles.agentBarBtnTextPrimary]}>Book</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
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
              <Text style={styles.emptyChatText}>👋 Say hello to {peer?.name ?? "your match"}!</Text>
              <Text style={styles.emptyChatSub}>Not sure where to start? Try one of these:</Text>
              <View style={styles.promptList}>
                {(isAgentRole
                  ? [
                      "Hi! Thanks for matching — how can I help?",
                      "What kind of home are you looking for?",
                      "Happy to set up a time to chat. When works?",
                    ]
                  : [
                      "Hi! When are you available for a call?",
                      "What areas do you know best?",
                      "I'd like to schedule a consultation.",
                    ]
                ).map((p) => (
                  <TouchableOpacity key={p} style={styles.promptChip} onPress={() => setInput(p)} activeOpacity={0.7}>
                    <Text style={styles.promptChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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

        {agentTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>{peer?.name ?? "They"} {peer ? "is" : "are"} typing…</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={(t) => { setInput(t); if (t) emitTyping(); }}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim()}>
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  agentBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
  agentAvatar: { width: 42, height: 42, borderRadius: 21 },
  agentBarInfo: { flex: 1 },
  agentName: { fontSize: 16, fontWeight: "700", color: c.foreground },
  agentSub: { fontSize: 12, color: c.mutedForeground },
  agentBarActions: { flexDirection: "row", gap: 8 },
  agentBarBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  agentBarBtnPrimary: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  agentBarBtnRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  agentBarBtnText: { fontSize: 12, fontWeight: "600", color: c.foreground },
  agentBarBtnTextPrimary: { color: "#fff" },
  messageList: { padding: 16, gap: 8, paddingBottom: 8 },
  emptyChat: { flex: 1, alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyChatText: { color: c.foreground, fontSize: 17, fontWeight: "600" },
  emptyChatSub: { color: c.mutedForeground, fontSize: 13, marginTop: 6, marginBottom: 14 },
  promptList: { gap: 8, alignSelf: "stretch" },
  promptChip: {
    borderWidth: 1.5,
    borderColor: c.primaryLight,
    backgroundColor: c.primaryLight + "55",
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  promptChipText: { color: c.primary, fontSize: 14, fontWeight: "600", textAlign: "center" },
  typingRow: { paddingHorizontal: 20, paddingBottom: 4 },
  typingText: { fontSize: 12, color: c.mutedForeground, fontStyle: "italic" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: c.primary, borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: "flex-start", backgroundColor: c.muted, borderBottomLeftRadius: 4 },
  bubbleFailed: { backgroundColor: c.destructive },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: c.foreground },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  bubbleTime: { fontSize: 10 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.6)" },
  bubbleTimeThem: { color: c.mutedForeground },
  bubbleCheck: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  retryRow: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 2 },
  retryText: { fontSize: 11, color: c.destructive, fontWeight: "600" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background },
  textInput: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: c.foreground, maxHeight: 100, backgroundColor: c.card },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: "#fff", fontSize: 18, marginLeft: 2 },
});
