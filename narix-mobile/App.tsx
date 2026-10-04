import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  Dimensions, ActivityIndicator, Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeWalkService } from './src/SafeWalkService';
import { supabase } from './src/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

import FakeCallScreen from './src/FakeCallScreen';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [showFakeCall, setShowFakeCall] = useState(false);

  // 1. Check Auth & Get Initial Location
  useEffect(() => {
    async function initializeApp() {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Location permissions for the Map
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
      setLoading(false);
    }
    initializeApp();
  }, []);

  // 2. Auth Flow
  const authenticateTestUser = async () => {
    setLoading(true);
    let { error } = await supabase.auth.signInWithPassword({ email: 'test@narix.com', password: 'password123' });
    if (error) {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: 'test@narix.com', password: 'password123' });
      if (signUpError) {
        Alert.alert('Auth Error', signUpError.message);
      } else if (!data.session) {
        Alert.alert('Email Confirmation Required', 'Please turn off email confirmation in Supabase settings.');
      }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setIsAuthenticated(true);
    setLoading(false);
  };

  // 3. Engine Toggle
  const toggleSafeWalk = async () => {
    try {
      if (isActive) {
        await SafeWalkService.endSession('1234');
        setIsActive(false);
      } else {
        if (!location) {
          Alert.alert("Waiting for GPS", "Please wait for your location to load.");
          return;
        }
        await SafeWalkService.startSession({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          label: 'Current Location'
        });
        setIsActive(true);
      }
    } catch (error: any) {
      Alert.alert('Engine Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FF3366" />
        <Text style={{ marginTop: 20, color: '#666' }}>Initializing NaariX Guardian...</Text>
      </View>
    );
  }

  if (showFakeCall) {
    return <FakeCallScreen onEndCall={() => setShowFakeCall(false)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* MAP LAYER */}
      {location ? (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {isActive && (
            <Marker 
              coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
              title="You"
              description="Safe Walk is Active"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator color="#FF3366" />
          <Text style={{ marginTop: 10 }}>Acquiring satellite signal...</Text>
        </View>
      )}

      {/* TOP HEADER */}
      <View style={[styles.headerContainer, { paddingTop: 40 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NaariX</Text>
          <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{isActive ? 'LIVE' : 'STANDBY'}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* BOTTOM CONTROL SHEET */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleBar} />
        
        {!isAuthenticated ? (
          <View style={styles.cardContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={28} color="#FF3366" />
            </View>
            <Text style={styles.sheetTitle}>Authentication Required</Text>
            <Text style={styles.sheetDesc}>Secure your connection to the cloud engine before starting a Safe Walk.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={authenticateTestUser}>
              <Text style={styles.primaryButtonText}>Connect to Cloud</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.row}>
              <View>
                <Text style={styles.sheetTitle}>Guardian Engine</Text>
                <Text style={styles.sheetDesc}>
                  {isActive 
                    ? "Your location is being actively monitored and streamed to your trusted contacts."
                    : "Tap below to begin streaming your location and activate dark-zone scanning."}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, isActive ? styles.buttonDanger : styles.buttonActive]} 
              onPress={toggleSafeWalk}
            >
              <Ionicons name={isActive ? "shield-checkmark" : "shield"} size={22} color="#FFF" style={{marginRight: 8}}/>
              <Text style={styles.primaryButtonText}>
                {isActive ? "End Safe Walk Session" : "Start Safe Walk"}
              </Text>
            </TouchableOpacity>

            {/* Fake Call Simulate Button */}
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#34C759', marginTop: 12 }]} 
              onPress={() => setShowFakeCall(true)}
            >
              <Ionicons name="call" size={22} color="#FFF" style={{marginRight: 8}}/>
              <Text style={styles.primaryButtonText}>
                Simulate Fake Call
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  map: {
    width: width,
    height: height,
    position: 'absolute',
  },
  mapPlaceholder: {
    width: width,
    height: height,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A24',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeInactive: {
    backgroundColor: '#F1F3F5',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A24',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 51, 102, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A24',
    marginBottom: 8,
  },
  sheetDesc: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonActive: {
    backgroundColor: '#1A1A24',
  },
  buttonDanger: {
    backgroundColor: '#FF3366',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  }
});
