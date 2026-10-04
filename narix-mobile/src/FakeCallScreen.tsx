import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Feather } from '@expo/vector-icons'; 

interface FakeCallProps {
  onEndCall: () => void;
}

export default function FakeCallScreen({ onEndCall }: FakeCallProps) {
  const [callState, setCallState] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [seconds, setSeconds] = useState(0);

  // Haptic feedback loop for ringing state
  useEffect(() => {
    if (callState === 'ringing') {
      Vibration.vibrate([0, 1000, 2000], true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [callState]);

  // Live Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'active') {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAccept = async () => {
    setCallState('active');
    console.log("Audio playing simulated (expo-av removed for Expo Go compatibility)");
  };

  const handleDeclineOrEnd = async () => {
    setCallState('ended');
    onEndCall(); 
  };

  return (
    <View style={styles.container}>
      <View style={styles.callerInfo}>
        <Text style={styles.callerName}>Dad</Text>
        <Text style={styles.callStatus}>
          {callState === 'ringing' ? 'Mobile...' : formatTime(seconds)}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {callState === 'ringing' ? (
          <>
            {/* Decline Button: Red + Phone Off Icon */}
            <TouchableOpacity style={[styles.button, styles.declineBtn]} onPress={handleDeclineOrEnd}>
              <Feather name="phone-off" size={28} color="#FFFFFF" style={styles.iconSpacing} />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
            
            {/* Accept Button: Green + Phone Call Icon */}
            <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={handleAccept}>
              <Feather name="phone-call" size={28} color="#FFFFFF" style={styles.iconSpacing} />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.button, styles.endBtn]} onPress={handleDeclineOrEnd}>
            <Feather name="phone-off" size={28} color="#FFFFFF" style={styles.iconSpacing} />
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black for OLED battery & glare reduction
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  callerName: {
    fontSize: 42,
    color: '#F8F9FA',
    fontWeight: '400', // Bumped up from 200 for stress legibility
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: '400',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  button: {
    width: 85, // Massive touch target
    height: 85,
    borderRadius: 12, // Structural, not a pill
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#FF3B30',
  },
  acceptBtn: {
    backgroundColor: '#34C759',
  },
  endBtn: {
    backgroundColor: '#FF3B30',
    width: 220,
    flexDirection: 'row',
  },
  iconSpacing: {
    marginBottom: 4,
  },
  buttonText: {
    color: '#F8F9FA',
    fontSize: 14,
    fontWeight: '800', // Ultra-bold for critical action
  },
});
