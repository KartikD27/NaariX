import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

interface FakeCallProps {
  onEndCall: () => void;
}

export default function FakeCallScreen({ onEndCall }: FakeCallProps) {
  const [callState, setCallState] = useState<'ringing' | 'active' | 'ended'>('ringing');
  const [seconds, setSeconds] = useState(0);

  // Initialize the audio player for the fake voice
  const voicePlayer = useAudioPlayer(require('../assets/aj_sound.mp3'));

  useEffect(() => {
    // Ensure audio plays even if the phone is on silent
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
    }).catch(console.error);
  }, []);

  // Haptic feedback loop for ringing state
  useEffect(() => {
    if (callState === 'ringing') {
      Vibration.vibrate([0, 1000, 2000], true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [callState]);

  // Live call timer
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

  const handleAccept = () => {
    setCallState('active');
    console.log("Call accepted.");
    // We won't play audio automatically anymore, we wait for the user to choose a phrase!
  };

  const handleDeclineOrEnd = () => {
    setCallState('ended');
    console.log("Call ended. Pausing audio.");
    voicePlayer.pause();
    onEndCall();
  };

  const playPhrase = (phraseNum: number) => {
    // Currently mapping all phrases to aj_sound.mp3 until you add more files
    let source = require('../assets/aj_sound.mp3');
    
    // Example of how you will map them once you have the files:
    // if (phraseNum === 1) source = require('../assets/phrase1.mp3');
    // if (phraseNum === 2) source = require('../assets/phrase2.mp3');
    // if (phraseNum === 3) source = require('../assets/phrase3.mp3');
    // if (phraseNum === 4) source = require('../assets/phrase4.mp3');

    voicePlayer.replace(source);
    voicePlayer.volume = 1.0;
    voicePlayer.play();
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
            <TouchableOpacity style={[styles.button, styles.declineBtn]} onPress={handleDeclineOrEnd}>
              <Feather name="phone-off" size={28} color="#FFFFFF" style={styles.iconSpacing} />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={handleAccept}>
              <Feather name="phone-call" size={28} color="#FFFFFF" style={styles.iconSpacing} />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.activeCallControls}>
             <View style={styles.phrasesGrid}>
                <TouchableOpacity style={styles.phraseBtn} onPress={() => playPhrase(1)}>
                   <Text style={styles.phraseText}>"Where are you?"</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.phraseBtn} onPress={() => playPhrase(2)}>
                   <Text style={styles.phraseText}>"I'm almost there"</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.phraseBtn} onPress={() => playPhrase(3)}>
                   <Text style={styles.phraseText}>"Are you okay?"</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.phraseBtn} onPress={() => playPhrase(4)}>
                   <Text style={styles.phraseText}>"Wait for me"</Text>
                </TouchableOpacity>
             </View>

            <TouchableOpacity style={[styles.button, styles.endBtn]} onPress={handleDeclineOrEnd}>
              <Feather name="phone-off" size={28} color="#FFFFFF" style={styles.iconSpacing} />
              <Text style={styles.buttonText}>End Call</Text>
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
    backgroundColor: '#000000',
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
    fontWeight: '400',
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
  activeCallControls: {
    alignItems: 'center',
    width: '100%',
  },
  phrasesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 10,
  },
  phraseBtn: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  phraseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    width: 85,
    height: 85,
    borderRadius: 12,
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
    fontWeight: '800',
  },
});
