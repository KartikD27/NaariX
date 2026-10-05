import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

interface RoadRoutingProps {
  onClose: () => void;
}

export default function RoadRoutingScreen({ onClose }: RoadRoutingProps) {
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  
  const [isSecretModalVisible, setSecretModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [secretWord, setSecretWord] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  const handleVerifyPassword = () => {
    if (password === '1234') { // Dummy password for prototype
      setIsPasswordVerified(true);
      setPassword('');
    } else {
      Alert.alert('Error', 'Incorrect password. Hint: Try 1234');
    }
  };

  const handleSaveSecretWord = () => {
    if (!secretWord.trim()) return;
    Alert.alert(
      'Success',
      `Secret word "${secretWord}" saved.\n\nIf your microphone picks up this exact word on your route, police dispatch will be instantly alerted!`,
      [{ text: 'OK', onPress: () => {
          setSecretModalVisible(false);
          setIsPasswordVerified(false);
          setSecretWord('');
      }}]
    );
  };

  const handleFindRoute = () => {
    if (!startPoint || !endPoint) {
      Alert.alert('Missing Info', 'Please enter both start and end points.');
      return;
    }
    Alert.alert('Route Calculated', 'Finding safest route based on:\n1. Crowd density\n2. Street lighting availability');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={{marginRight: 16}}>
          <Feather name="chevron-left" size={28} color="#1A1A24" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Safe Route Planner</Text>
      </View>

      <View style={styles.mapContainer}>
        {/* Placeholder Map showing a static view for now */}
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: 28.6139,
            longitude: 77.2090,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
        <View style={styles.mapOverlay}>
           <Text style={styles.mapOverlayText}>AI Routing Engine Ready</Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.inputGroup}>
          <Feather name="map-pin" size={20} color="#FF3366" style={styles.inputIcon} />
          <TextInput 
            style={styles.input}
            placeholder="Start Point (e.g. Current Location)"
            placeholderTextColor="#8E8E93"
            value={startPoint}
            onChangeText={setStartPoint}
          />
        </View>

        <View style={styles.inputGroup}>
          <Feather name="flag" size={20} color="#34C759" style={styles.inputIcon} />
          <TextInput 
            style={styles.input}
            placeholder="Destination"
            placeholderTextColor="#8E8E93"
            value={endPoint}
            onChangeText={setEndPoint}
          />
        </View>

        <TouchableOpacity style={styles.routeBtn} onPress={handleFindRoute}>
          <Text style={styles.routeBtnText}>Find Safest Route</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.secretBtn} onPress={() => setSecretModalVisible(true)}>
          <Ionicons name="mic-circle" size={24} color="#FFF" style={{marginRight: 8}} />
          <Text style={styles.secretBtnText}>Set Duress Secret Word</Text>
        </TouchableOpacity>
      </View>

      {/* Secret Word Modal */}
      <Modal visible={isSecretModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Secret Word</Text>
              <TouchableOpacity onPress={() => {
                setSecretModalVisible(false);
                setIsPasswordVerified(false);
              }}>
                <Feather name="x" size={24} color="#1A1A24" />
              </TouchableOpacity>
            </View>

            {!isPasswordVerified ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalDesc}>Enter your master password to access duress settings (Try '1234').</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleVerifyPassword}>
                  <Text style={styles.modalPrimaryBtnText}>Verify</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.modalDesc}>Set a unique word that you can scream or say naturally. The app will constantly listen for this word, and if heard, it instantly triggers dispatch.</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 'PINEAPPLE' or 'HELP ME'"
                  value={secretWord}
                  onChangeText={setSecretWord}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: '#FF3366' }]} onPress={handleSaveSecretWord}>
                  <Text style={styles.modalPrimaryBtnText}>Save Secret Word</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    zIndex: 10,
  },
  headerText: { fontSize: 20, fontWeight: '700', color: '#1A1A24' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapOverlayText: { color: '#FFF', fontWeight: '600' },
  controlsContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, fontSize: 16, color: '#1A1A24' },
  routeBtn: {
    backgroundColor: '#1A1A24',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  routeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#E9ECEF', marginVertical: 20 },
  secretBtn: {
    backgroundColor: '#5E5CE6',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secretBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A24' },
  modalBody: {},
  modalDesc: { fontSize: 15, color: '#6C757D', marginBottom: 20, lineHeight: 22 },
  modalInput: {
    backgroundColor: '#F1F3F5',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    backgroundColor: '#1A1A24',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
