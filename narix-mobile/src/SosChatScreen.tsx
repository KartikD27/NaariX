import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from './supabaseClient'; 

interface Message {
  id: string;
  text: string;
  sender: 'victim' | 'dispatch';
  timestamp: Date;
}

interface SOSChatProps {
  onClose: () => void;
}

export default function SOSChatScreen({ onClose }: SOSChatProps) {
  const [inputText, setInputText] = useState('');
  // Starting with one automated message to show the UI
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'SOS ACTIVATED. Dispatch has been notified and is monitoring your GPS location.',
      sender: 'dispatch',
      timestamp: new Date(),
    }
  ]);

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'victim',
      timestamp: new Date(),
    };

    // 1. Update the UI instantly for the user
    setMessages((prev) => [...prev, newMessage]);
    if (!overrideText) setInputText('');

    // 2. Push to Supabase so it appears on your Next.js Police Dashboard
    try {
      const { error } = await supabase
        .from('dispatch_messages') // Replace with your actual table name
        .insert([{ 
          message_text: newMessage.text, 
          sender_role: 'victim',
          // incident_id: 'CURRENT_INCIDENT_ID' // Wire this up later
        }]);

      if (error) console.error("Supabase Error:", error);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isDispatch = item.sender === 'dispatch';
    return (
      <View style={[styles.messageBubble, isDispatch ? styles.dispatchBubble : styles.victimBubble]}>
        <Text style={[styles.messageText, isDispatch && styles.dispatchText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={{marginRight: 16}}>
          <Feather name="chevron-left" size={28} color="#FF3B30" />
        </TouchableOpacity>
        <Feather name="shield" size={24} color="#FF3B30" />
        <Text style={styles.headerText}>SECURE DISPATCH LINE</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        inverted={false}
      />

      <View style={styles.quickReplyContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyScroll}>
          {['Send Police Now', 'I am being followed', 'Call my emergency contacts', 'Send Ambulance'].map((phrase) => (
            <TouchableOpacity key={phrase} style={styles.quickReplyBtn} onPress={() => sendMessage(phrase)}>
              <Text style={styles.quickReplyText}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          placeholder="Type message to dispatch..."
          placeholderTextColor="#8E8E93"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}>
          <Feather name="send" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 40, // Replaced SafeAreaView
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerText: {
    color: '#F8F9FA',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 1,
  },
  chatList: {
    padding: 20,
    paddingBottom: 40,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 8, // Flat, geometric corners
    marginBottom: 12,
  },
  victimBubble: {
    backgroundColor: '#34C759', // Safety Green for the user
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2, // Sharp corner indicating sender side
  },
  dispatchBubble: {
    backgroundColor: '#1C1C1E', // Dark grey for dispatch
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#FF3B30', // Red outline to indicate authority/emergency
  },
  messageText: {
    color: '#F8F9FA',
    fontSize: 16,
    fontWeight: '400',
  },
  dispatchText: {
    color: '#F8F9FA',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    backgroundColor: '#000000',
  },
  quickReplyContainer: {
    backgroundColor: '#000000',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  quickReplyScroll: {
    paddingHorizontal: 16,
  },
  quickReplyBtn: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  quickReplyText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    backgroundColor: '#121212',
    color: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  sendButton: {
    backgroundColor: '#FF3B30', // Action red
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
