import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';

const SERVER_URL = 'http://192.168.1.181:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Данные для экранов
  const [reminders, setReminders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [serverStatus, setServerStatus] = useState('unknown');
  const [dataTab, setDataTab] = useState(0); // 0 - Напоминания, 1 - Заметки, 2 - Задачи

  const pagerRef = useRef(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      fetchData();
    } else if (activeTab === 2) {
      checkServerStatus();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setDataLoading(true);
    
    // Очищаем старые данные перед загрузкой новых
    setReminders([]);
    setNotes([]);
    setTasks([]);

    try {
      // Запрашиваем параллельно все три эндпоинта
      const [remRes, notesRes, tasksRes] = await Promise.allSettled([
        axios.get(`${SERVER_URL}/reminders`, { timeout: 5000 }),
        axios.get(`${SERVER_URL}/notes`, { timeout: 5000 }),
        axios.get(`${SERVER_URL}/tasks`, { timeout: 5000 })
      ]);

      if (remRes.status === 'fulfilled') setReminders(remRes.value.data || []);
      if (notesRes.status === 'fulfilled') setNotes(notesRes.value.data || []);
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data || []);
      
    } catch (error) {
      console.log("Ошибка загрузки данных:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/history?limit=50`, { timeout: 5000 });
      if (res.data.history) {
        setMessages(res.data.history);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 500);
      }
    } catch (error) {
      console.log("Не удалось загрузить историю", error);
    }
  };

  const checkServerStatus = async () => {
    try {
      await axios.get(`${SERVER_URL}/reminders`, { timeout: 3000 });
      setServerStatus('online');
    } catch (error) {
      setServerStatus('offline');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await axios.post(`${SERVER_URL}/chat`, { message: userMsg }, { timeout: 60000 });
      setMessages(prev => [...prev, { role: 'jarvis', text: response.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'jarvis', text: '⚠️ Ошибка связи с ноутбуком.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    Alert.alert("Очистка", "Очистить историю диалога?", [
      { text: "Отмена", style: "cancel" },
      { text: "Очистить", onPress: async () => {
          try {
            await axios.post(`${SERVER_URL}/clear`);
            setMessages([]);
          } catch (e) {
            setMessages([]);
          }
      }}
    ]);
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Скопировано", "Текст в буфере обмена.");
  };

  // --- ЭКРАН 1: ЧАТ ---
  const renderChat = () => (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.page}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Чат</Text>
          <TouchableOpacity onPress={clearHistory}>
            <Text style={styles.clearBtn}>Очистить 🗑</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && <Text style={styles.emptyText}>Напиши Джарвису...</Text>}
          {messages.map((msg, index) => (
            <TouchableOpacity 
              key={index} 
              onLongPress={() => copyToClipboard(msg.text)}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.jarvisBubble]}
            >
              <Text style={msg.role === 'user' ? styles.userText : styles.jarvisText}>{msg.text}</Text>
            </TouchableOpacity>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#007AFF" />
              <Text style={styles.loadingText}>Джарвис думает...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Сообщение..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  // --- ЭКРАН 2: ДАННЫЕ (Напоминания, Заметки, Задачи) ---
  const renderData = () => (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Данные</Text>
        <TouchableOpacity onPress={fetchData}>
          <Text style={{color: '#4A90E2'}}>Обновить</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dataTabs}>
        <TouchableOpacity style={[styles.dataTabBtn, dataTab === 0 && styles.dataTabActive]} onPress={() => setDataTab(0)}>
          <Text style={[styles.dataTabText, dataTab === 0 && styles.dataTabTextActive]}>Напоминания</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dataTabBtn, dataTab === 1 && styles.dataTabActive]} onPress={() => setDataTab(1)}>
          <Text style={[styles.dataTabText, dataTab === 1 && styles.dataTabTextActive]}>Заметки</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dataTabBtn, dataTab === 2 && styles.dataTabActive]} onPress={() => setDataTab(2)}>
          <Text style={[styles.dataTabText, dataTab === 2 && styles.dataTabTextActive]}>Задачи</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.chatArea}>
        {dataLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* НАПОМИНАНИЯ */}
            {dataTab === 0 && (
              reminders.length === 0 ? (
                <Text style={styles.emptyText}>Нет данных</Text>
              ) : (
                reminders.map((item) => (
                  <View key={item.id} style={styles.noteCard}>
                    <Text style={styles.noteText}>{item.text}</Text>
                    <Text style={styles.noteDate}>{item.created_at}</Text>
                  </View>
                ))
              )
            )}

            {/* ЗАМЕТКИ */}
            {dataTab === 1 && (
              notes.length === 0 ? (
                <Text style={styles.emptyText}>Нет данных</Text>
              ) : (
                notes.map((item) => (
                  <View key={item.id} style={[styles.noteCard, { borderLeftColor: '#4CAF50' }]}>
                    <Text style={styles.noteTitle}>{item.title || 'Без названия'}</Text>
                    <Text style={styles.noteText}>{item.content}</Text>
                    <Text style={styles.noteDate}>{item.created_at}</Text>
                  </View>
                ))
              )
            )}

            {/* ЗАДАЧИ */}
            {dataTab === 2 && (
              tasks.length === 0 ? (
                <Text style={styles.emptyText}>Нет данных</Text>
              ) : (
                tasks.map((item) => (
                  <View key={item.id} style={[styles.noteCard, { borderLeftColor: '#FFC107' }]}>
                    <Text style={styles.noteText}>{item.title}</Text>
                    <Text style={styles.noteDate}>
                      Статус: {item.status} • {item.created_at}
                    </Text>
                  </View>
                ))
              )
            )}
          </>
        )}
      </ScrollView>
    </View>
  );

  // --- ЭКРАН 3: СИСТЕМА ---
  const renderSystem = () => (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Система</Text>
      </View>
      <View style={{ padding: 20 }}>
        <Text style={styles.sysText}>
          Статус сервера: {serverStatus === 'online' ? '🟢 Онлайн' : serverStatus === 'offline' ? '🔴 Оффлайн' : '⏳ Проверка...'}
        </Text>
        <Text style={styles.sysText}>IP ноутбука: 192.168.1.181</Text>
        <Text style={styles.sysText}>Модель: DeepSeek</Text>
        <TouchableOpacity onPress={checkServerStatus} style={styles.refreshBtn}>
          <Text style={{ color: '#FFF' }}>Обновить статус</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <PagerView 
          style={{ flex: 1 }} 
          initialPage={0}
          onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
          ref={pagerRef}
        >
          <View key="0" style={{ flex: 1 }}>{renderChat()}</View>
          <View key="1" style={{ flex: 1 }}>{renderData()}</View>
          <View key="2" style={{ flex: 1 }}>{renderSystem()}</View>
        </PagerView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => pagerRef.current?.setPage(0)}>
            <Text style={[styles.navText, activeTab === 0 && styles.navActive]}>💬 Чат</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => pagerRef.current?.setPage(1)}>
            <Text style={[styles.navText, activeTab === 1 && styles.navActive]}>📝 Данные</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => pagerRef.current?.setPage(2)}>
            <Text style={[styles.navText, activeTab === 2 && styles.navActive]}>⚙️ Система</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0B1A' },
  page: { flex: 1, backgroundColor: '#0A0B1A' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1A1C3A', backgroundColor: '#12142A' },
  topBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  clearBtn: { color: '#FF6B6B', fontSize: 14 },
  chatArea: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 50, fontSize: 16 },
  messageBubble: { padding: 14, borderRadius: 16, marginBottom: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#1E88E5', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  jarvisBubble: { backgroundColor: '#1A1C3A', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#2A2D5A' },
  userText: { color: '#FFFFFF', fontSize: 16 },
  jarvisText: { color: '#E0E0E0', fontSize: 16 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 10 },
  loadingText: { marginLeft: 8, color: '#4A90E2', fontStyle: 'italic' },
  inputArea: { flexDirection: 'row', padding: 10, paddingBottom: Platform.OS === 'android' ? 15 : 10, backgroundColor: '#12142A', borderTopWidth: 1, borderTopColor: '#1A1C3A', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#1A1C3A', borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 16, color: '#FFF', maxHeight: 100 },
  sendButton: { backgroundColor: '#1E88E5', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendButtonDisabled: { backgroundColor: '#2A2D5A' },
  sendButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  
  bottomNav: { flexDirection: 'row', backgroundColor: '#12142A', borderTopWidth: 1, borderTopColor: '#1A1C3A', paddingBottom: Platform.OS === 'android' ? 10 : 0 },
  navBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  navText: { color: '#666', fontSize: 14, fontWeight: 'bold' },
  navActive: { color: '#4A90E2' },

  dataTabs: { flexDirection: 'row', backgroundColor: '#12142A', padding: 5 },
  dataTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  dataTabActive: { backgroundColor: '#1A1C3A' },
  dataTabText: { color: '#666', fontSize: 14 },
  dataTabTextActive: { color: '#4A90E2', fontWeight: 'bold' },

  noteCard: { backgroundColor: '#1A1C3A', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#1E88E5' },
  noteTitle: { color: '#4A90E2', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  noteText: { color: '#FFF', fontSize: 16, marginBottom: 5 },
  noteDate: { color: '#666', fontSize: 12 },
  
  sysText: { color: '#E0E0E0', fontSize: 16, marginBottom: 15 },
  refreshBtn: { backgroundColor: '#1E88E5', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 }
});