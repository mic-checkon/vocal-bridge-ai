'use client';

import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface VoiceControlProps {
    isConnected: boolean;
    isConnecting: boolean;
    isMicEnabled: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onToggleMic: () => void;
}

export function VoiceControl({
    isConnected,
    isConnecting,
    isMicEnabled,
    onConnect,
    onDisconnect,
    onToggleMic,
}: VoiceControlProps) {
    return (
        <div className="flex items-center gap-3">
            {/* Voice Status */}
            {isConnected && (
                <div className="flex items-center gap-2">
                    {/* Voice Waveform */}
                    <div className="flex items-center gap-1 h-8">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className={`voice-wave-bar ${!isMicEnabled ? 'opacity-30' : ''}`}
                                style={{
                                    animationPlayState: isMicEnabled ? 'running' : 'paused',
                                    height: isMicEnabled ? undefined : '8px',
                                }}
                            />
                        ))}
                    </div>

                    {/* Status Text */}
                    <span className="text-sm text-gray-400 ml-2">
                        {isMicEnabled ? 'Listening...' : 'Muted'}
                    </span>
                </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center gap-2">
                {isConnected ? (
                    <>
                        {/* Mute/Unmute */}
                        <button
                            onClick={onToggleMic}
                            className={`p-3 rounded-full transition-all ${isMicEnabled
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                }`}
                            title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
                        >
                            {isMicEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>

                        {/* Disconnect */}
                        <button
                            onClick={onDisconnect}
                            className="p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                            title="End voice session"
                        >
                            <PhoneOff size={20} />
                        </button>
                    </>
                ) : (
                    /* Connect Button */
                    <button
                        onClick={onConnect}
                        disabled={isConnecting}
                        className={`voice-button flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium ${isConnecting ? 'opacity-70 cursor-wait' : ''
                            }`}
                    >
                        <Phone size={20} />
                        {isConnecting ? 'Connecting...' : 'Start Voice'}
                    </button>
                )}
            </div>
        </div>
    );
}
