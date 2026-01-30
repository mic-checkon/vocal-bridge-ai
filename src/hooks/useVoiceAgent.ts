'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, ConnectionState, TranscriptionSegment } from 'livekit-client';

// Filter state for dashboard queries
export interface FilterState {
    region?: string;
    product?: string;
    quarter?: string;
    status?: string;
    rep?: string;
    closeMonth?: string;
}

interface VoiceAgentState {
    isConnected: boolean;
    isConnecting: boolean;
    isMicEnabled: boolean;
    error: string | null;
    agentSpeaking: boolean;
    transcript: string;
    agentTranscript: string;
    isProcessing: boolean;
}

type ActionHandler = (action: string, payload: Record<string, unknown>) => void;

/**
 * Hook for managing LiveKit voice agent connection.
 * Handles bidirectional communication between the app and voice AI.
 */
export function useVoiceAgent(onAction?: ActionHandler) {
    const roomRef = useRef<Room | null>(null);
    const [state, setState] = useState<VoiceAgentState>({
        isConnected: false,
        isConnecting: false,
        isMicEnabled: false,
        error: null,
        agentSpeaking: false,
        transcript: '',
        agentTranscript: '',
        isProcessing: false,
    });

    // Setup room and event handlers
    useEffect(() => {
        if (!roomRef.current) {
            roomRef.current = new Room();
        }
        const room = roomRef.current;

        const handleTrackSubscribed = (track: Track) => {
            if (track.kind === Track.Kind.Audio) {
                const audioEl = track.attach() as HTMLAudioElement;
                audioEl.id = 'agent-audio';
                document.body.appendChild(audioEl);
                audioEl.play().catch(console.error);
            }
        };

        const handleTrackUnsubscribed = (track: Track) => {
            if (track.kind === Track.Kind.Audio) {
                track.detach().forEach((el) => el.remove());
            }
        };

        const handleTranscription = (segments: TranscriptionSegment[], participant: unknown) => {
            const isAgent = participant !== room.localParticipant;
            const text = segments.map((s) => s.text).join(' ');

            if (isAgent) {
                setState((s) => ({ ...s, agentTranscript: text, agentSpeaking: true }));
            } else {
                setState((s) => ({ ...s, transcript: text, isProcessing: true }));
            }
        };

        const handleDataReceived = (
            payload: Uint8Array,
            _participant: unknown,
            _kind: unknown,
            topic?: string
        ) => {
            if (topic === 'client_actions') {
                try {
                    const data = JSON.parse(new TextDecoder().decode(payload));
                    if (data.type === 'client_action' && onAction) {
                        console.log('Action received:', data.action, data.payload);
                        setState((s) => ({ ...s, isProcessing: false }));
                        onAction(data.action, data.payload || {});
                    }
                } catch (e) {
                    console.error('Failed to parse action:', e);
                }
            }
        };

        const handleConnectionStateChange = (connectionState: ConnectionState) => {
            setState((s) => ({
                ...s,
                isConnected: connectionState === ConnectionState.Connected,
            }));
        };

        const handleDisconnected = () => {
            setState((s) => ({
                ...s,
                isConnected: false,
                isMicEnabled: false,
                agentSpeaking: false,
                transcript: '',
                agentTranscript: '',
                isProcessing: false,
            }));
            document.getElementById('agent-audio')?.remove();
        };

        const handleActiveSpeakersChanged = (speakers: unknown[]) => {
            const agentSpeaking = speakers.some((s: unknown) =>
                (s as { identity?: string })?.identity?.startsWith('agent')
            );
            setState((s) => ({ ...s, agentSpeaking }));
            if (!agentSpeaking) {
                setTimeout(() => setState((s) => ({ ...s, agentTranscript: '' })), 2000);
            }
        };

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        room.on(RoomEvent.DataReceived, handleDataReceived);
        room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
        room.on(RoomEvent.Disconnected, handleDisconnected);
        room.on(RoomEvent.TranscriptionReceived, handleTranscription);
        room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);

        return () => {
            room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
            room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
            room.off(RoomEvent.DataReceived, handleDataReceived);
            room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
            room.off(RoomEvent.Disconnected, handleDisconnected);
            room.off(RoomEvent.TranscriptionReceived, handleTranscription);
            room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
        };
    }, [onAction]);

    const connect = useCallback(async () => {
        const room = roomRef.current;
        if (!room) return;

        setState((s) => ({ ...s, isConnecting: true, error: null }));

        try {
            const res = await fetch('/api/voice-token');
            if (!res.ok) throw new Error('Failed to get voice token');
            const { livekit_url, token } = await res.json();

            await room.connect(livekit_url, token);
            await room.localParticipant.setMicrophoneEnabled(true);

            setState((s) => ({
                ...s,
                isConnected: true,
                isConnecting: false,
                isMicEnabled: true,
            }));
        } catch (err) {
            console.error('Connection error:', err);
            setState((s) => ({
                ...s,
                isConnecting: false,
                error: err instanceof Error ? err.message : 'Connection failed',
            }));
        }
    }, []);

    const disconnect = useCallback(async () => {
        const room = roomRef.current;
        if (room) await room.disconnect();
    }, []);

    const toggleMic = useCallback(async () => {
        const room = roomRef.current;
        if (!room) return;

        const newEnabled = !state.isMicEnabled;
        await room.localParticipant.setMicrophoneEnabled(newEnabled);
        setState((s) => ({ ...s, isMicEnabled: newEnabled }));
    }, [state.isMicEnabled]);

    const sendDataContext = useCallback(
        async (contextData: Record<string, unknown>) => {
            const room = roomRef.current;
            if (!room || !state.isConnected) return;

            const message = JSON.stringify({
                type: 'client_action',
                action: 'data_context',
                payload: contextData,
            });

            try {
                await room.localParticipant.publishData(
                    new TextEncoder().encode(message),
                    { reliable: true, topic: 'client_actions' }
                );
            } catch (e) {
                console.error('Failed to send context:', e);
            }
        },
        [state.isConnected]
    );

    return {
        ...state,
        connect,
        disconnect,
        toggleMic,
        sendDataContext,
    };
}
