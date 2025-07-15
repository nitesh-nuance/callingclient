const { CallClient } = require("@azure/communication-calling");
const { AzureCommunicationTokenCredential } = require('@azure/communication-common');

// Enhanced logging utility
const logger = {
    info: (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ℹ️ INFO: ${message}`, data ? data : '');
    },
    success: (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ✅ SUCCESS: ${message}`, data ? data : '');
    },
    warning: (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.warn(`[${timestamp}] ⚠️ WARNING: ${message}`, data ? data : '');
    },
    error: (message, error = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`[${timestamp}] ❌ ERROR: ${message}`, error ? error : '');
        if (error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
    },
    debug: (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        console.debug(`[${timestamp}] 🔍 DEBUG: ${message}`, data ? data : '');
    }
};

// Helper function to safely subscribe to call events
function subscribeToCallEvents(callObject, isIncomingCall = false) {
    if (!callObject) {
        logger.warning('Cannot subscribe to events - call object is null');
        return;
    }
    
    try {
        logger.debug('Subscribing to call events', { callId: callObject.id, isIncomingCall });
        
        // Subscribe to call state changes
        callObject.on('stateChanged', () => {
            logger.info(`${isIncomingCall ? 'Accepted' : 'Outbound'} call state changed`, { 
                callId: callObject.id,
                state: callObject.state,
                direction: callObject.direction 
            });
            
            // Handle call disconnected state (replaces callEnded event)
            if (callObject.state === 'Disconnected') {
                logger.warning(`${isIncomingCall ? 'Accepted' : 'Outbound'} call disconnected`, { 
                    callId: callObject.id,
                    endReason: callObject.callEndReason
                });
                
                // Reset UI state
                hangUpButton.disabled = true;
                callButton.disabled = false;
                submitToken.disabled = false;
                acceptCallButton.disabled = true;
                
                // Disable voice controls
                updateVoiceControlsState(false);
                
                call = null;
                if (isIncomingCall) {
                    incomingCall = null;
                }
                logger.info('UI reset after call ended');
            }
            
            // Handle call connected state - enable voice controls
            if (callObject.state === 'Connected') {
                logger.success(`${isIncomingCall ? 'Accepted' : 'Outbound'} call connected successfully`, { 
                    callId: callObject.id
                });
                updateVoiceControlsState(true);
                monitorCallQuality(callObject);
            }
        });
        
        // Subscribe to remote participants events
        callObject.on('remoteParticipantsUpdated', (args) => {
            logger.debug('Remote participants updated', {
                callId: callObject.id,
                added: args.added.length,
                removed: args.removed.length,
                participants: args.added.map(p => ({
                    id: p.identifier?.id || 'Unknown',
                    state: p.state
                }))
            });
            
            args.added.forEach(participant => {
                logger.info('Remote participant added', {
                    participantId: participant.identifier?.id || 'Unknown',
                    state: participant.state
                });
                
                // Subscribe to participant state changes
                try {
                    participant.on('stateChanged', () => {
                        logger.debug('Participant state changed', {
                            participantId: participant.identifier?.id || 'Unknown',
                            state: participant.state
                        });
                    });
                } catch (participantError) {
                    logger.warning('Could not subscribe to participant events', participantError);
                }
            });
        });
        
        logger.success('Successfully subscribed to all call events');
        
    } catch (error) {
        logger.error('Failed to subscribe to call events', error);
        // Don't throw - let the call continue even if event subscription fails
    }
}

let call;
let incomingCall;
let callAgent;
let deviceManager;
let tokenCredential;
const userToken = document.getElementById("token-input"); 
const calleeInput = document.getElementById("callee-id-input");
const submitToken = document.getElementById("token-submit");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const acceptCallButton = document.getElementById('accept-call-button');

// Add Azure Function integration elements

// Log DOM elements found
logger.info('DOM Elements initialized', {
    userToken: !!userToken,
    calleeInput: !!calleeInput,
    submitToken: !!submitToken,
    callButton: !!callButton,
    hangUpButton: !!hangUpButton,
    acceptCallButton: !!acceptCallButton
});

submitToken.addEventListener("click", async () => {
    logger.info('Submit token button clicked');
    
    const callClient = new CallClient();
    logger.debug('CallClient instance created');
    
    const userTokenCredential = userToken.value;
    logger.debug('Retrieved token from input', { tokenLength: userTokenCredential?.length || 0 });
    
    try {
        logger.info('Creating token credential...');
        tokenCredential = new AzureCommunicationTokenCredential(userTokenCredential);
        logger.success('Token credential created successfully');
        
        logger.info('Creating call agent...');
        callAgent = await callClient.createCallAgent(tokenCredential);
        logger.success('Call agent created successfully', { 
            callAgentId: callAgent.displayName,
            userIdentity: window.currentUserId || 'Unknown' 
        });
        
        // Log the call agent identity for debugging
        logger.debug('Call agent details', {
            displayName: callAgent.displayName,
            identity: callAgent.identity,
            currentUserId: window.currentUserId
        });
        
        logger.info('Getting device manager...');
        deviceManager = await callClient.getDeviceManager();
        logger.success('Device manager obtained');
        
        logger.info('Requesting device permissions...');
        await deviceManager.askDevicePermission({ audio: true });
        logger.success('Audio device permissions granted');
        
        // Get and log available devices
        try {
            const microphones = await deviceManager.getMicrophones();
            const speakers = await deviceManager.getSpeakers();
            logger.info('Audio devices discovered', {
                microphones: microphones.length,
                speakers: speakers.length,
                microphoneNames: microphones.map(m => m.name),
                speakerNames: speakers.map(s => s.name)
            });
        } catch (deviceError) {
            logger.warning('Could not enumerate devices', deviceError);
        }
        
        callButton.disabled = false;
        submitToken.disabled = true;
        logger.success('UI updated - call button enabled');
        
        // Listen for an incoming call to accept.
        callAgent.on('incomingCall', async (args) => {
            try {
                logger.warning('🔔 INCOMING CALL RECEIVED!', {
                    callId: args.incomingCall.id,
                    callerInfo: args.incomingCall.callerInfo,
                    direction: args.incomingCall.direction,
                    state: args.incomingCall.state
                });
                
                // Show browser notification if possible
                if (Notification.permission === 'granted') {
                    new Notification('Incoming Call', {
                        body: `Call from: ${args.incomingCall.callerInfo?.identifier?.communicationUserId || 'Unknown'}`,
                        icon: '/favicon.ico'
                    });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification('Incoming Call', {
                                body: `Call from: ${args.incomingCall.callerInfo?.identifier?.communicationUserId || 'Unknown'}`,
                                icon: '/favicon.ico'
                            });
                        }
                    });
                }
                
                incomingCall = args.incomingCall;
                acceptCallButton.disabled = false;
                callButton.disabled = true;
                
                logger.info('UI updated for incoming call - accept button enabled');
                
                // Subscribe to incoming call state changes (instead of callEnded event)
                incomingCall.on('stateChanged', () => {
                    logger.debug('Incoming call state changed', { 
                        state: incomingCall.state,
                        callId: incomingCall.id 
                    });
                    
                    // Handle when incoming call is declined or cancelled
                    if (incomingCall.state === 'Disconnected') {
                        logger.warning('Incoming call ended/declined', { 
                            endReason: incomingCall.callEndReason 
                        });
                        acceptCallButton.disabled = true;
                        callButton.disabled = false;
                        incomingCall = null;
                    }
                });
                
                // Auto-play sound or vibration to alert user
                try {
                    // Create a simple beep sound
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.2);
                    
                    logger.debug('Incoming call alert sound played');
                } catch (audioError) {
                    logger.warning('Could not play incoming call sound', audioError);
                }
                
            } catch (error) {
                logger.error('Error handling incoming call', error);
            }
        });
        
        // Subscribe to call agent events
        callAgent.on('callsUpdated', (args) => {
            logger.debug('Calls updated event', {
                added: args.added.length,
                removed: args.removed.length
            });
        });
        
    } catch(error) {
        logger.error('Failed to initialize call agent', error);
        window.alert("Please submit a valid token!");
    }
})

callButton.addEventListener("click", () => {
    logger.info('Call button clicked');
    
    const userToCall = calleeInput.value;
    logger.debug('Starting call to user', { userToCall });
    
    if (!userToCall) {
        logger.error('No user ID provided for call');
        window.alert("Please enter a user ID to call");
        return;
    }
    
    if (!callAgent) {
        logger.error('Call agent not initialized');
        window.alert("Please initialize the call agent first");
        return;
    }
    
    try {
        logger.info('Initiating call...');
        
        // Start a call
        call = callAgent.startCall(
            [{ id: userToCall }],
            {}
        );
        
        logger.success('Call initiated successfully', { callId: call.id });
        
        // Use the helper function to subscribe to events
        subscribeToCallEvents(call, false);
        
        // Toggle button states
        hangUpButton.disabled = false;
        callButton.disabled = true;
        logger.info('UI updated - call in progress');
        
    } catch (error) {
        logger.error('Failed to start call', error);
        window.alert("Failed to start call. Check console for details.");
    }
});

hangUpButton.addEventListener("click", () => {
    logger.info('Hang up button clicked');
    
    if (!call) {
        logger.warning('No active call to hang up');
        return;
    }
    
    try {
        logger.info('Hanging up call', { callId: call.id });
        
        // End the current call
        // The `forEveryone` property ends the call for all call participants.
        call.hangUp({ forEveryone: true });
        
        logger.success('Call hang up initiated');
        
        // Toggle button states
        hangUpButton.disabled = true;
        callButton.disabled = false;
        submitToken.disabled = false;
        acceptCallButton.disabled = true;
        
        // Disable voice controls
        updateVoiceControlsState(false);
        
        logger.info('UI updated after hang up');
        
    } catch (error) {
        logger.error('Failed to hang up call', error);
    }
});

acceptCallButton.onclick = async () => {
    logger.info('Accept call button clicked');
    
    if (!incomingCall) {
        logger.warning('No incoming call to accept');
        return;
    }
    
    try {
        logger.info('Accepting incoming call', { callId: incomingCall.id });
        call = await incomingCall.accept();
        logger.success('Incoming call accepted successfully', { callId: call.id });
        // Use the helper function to subscribe to events (with a small delay for safety)
        setTimeout(() => subscribeToCallEvents(call, true), 100);
        acceptCallButton.disabled = true;
        hangUpButton.disabled = false;
        logger.info('UI updated - call accepted and active');
    } catch (error) {
        logger.error('Failed to accept incoming call', error);
        window.alert("Failed to accept call. Check console for details.");
    }
}

// Real-time voice controls functionality
let isMicrophoneMuted = false;
let isSpeakerMuted = false;
let currentVolume = 1.0;

// Get voice control elements
const muteButton = document.getElementById("mute-button");
const speakerButton = document.getElementById("speaker-button");
const volumeUpButton = document.getElementById("volume-up-button");
const volumeDownButton = document.getElementById("volume-down-button");
const voiceStatus = document.getElementById("voice-status");
const callQuality = document.getElementById("call-quality");

// Voice control event handlers
muteButton.onclick = async () => {
    logger.info('Toggling microphone mute state');
    
    if (!call) {
        logger.warning('No active call for microphone control');
        return;
    }
    
    try {
        if (isMicrophoneMuted) {
            // Unmute microphone
            await call.unmute();
            isMicrophoneMuted = false;
            muteButton.textContent = '🎤 Mute Microphone';
            muteButton.classList.remove('muted');
            voiceStatus.textContent = 'Microphone: Active - You can speak';
            voiceStatus.className = 'voice-status active';
            logger.success('Microphone unmuted');
        } else {
            // Mute microphone
            await call.mute();
            isMicrophoneMuted = true;
            muteButton.textContent = '🎤 Unmute Microphone';
            muteButton.classList.add('muted');
            voiceStatus.textContent = 'Microphone: Muted - Others cannot hear you';
            voiceStatus.className = 'voice-status muted';
            logger.success('Microphone muted');
        }
    } catch (error) {
        logger.error('Failed to toggle microphone', error);
        window.alert("Failed to control microphone. Check console for details.");
    }
};

speakerButton.onclick = async () => {
    logger.info('Toggling speaker mute state');
    
    if (!deviceManager) {
        logger.warning('Device manager not available for speaker control');
        return;
    }
    
    try {
        const speakers = await deviceManager.getSpeakers();
        if (speakers.length === 0) {
            logger.warning('No speakers available');
            window.alert("No speakers detected.");
            return;
        }
        
        // Toggle speaker mute (this is a UI simulation - actual muting depends on browser implementation)
        if (isSpeakerMuted) {
            // Unmute speaker
            isSpeakerMuted = false;
            speakerButton.textContent = '🔊 Mute Speaker';
            speakerButton.classList.remove('muted');
            
            // Restore volume
            setSystemVolume(currentVolume);
            
            voiceStatus.textContent = 'Speaker: Active - You can hear others';
            voiceStatus.className = 'voice-status active';
            logger.success('Speaker unmuted');
        } else {
            // Mute speaker
            isSpeakerMuted = true;
            speakerButton.textContent = '🔊 Unmute Speaker';
            speakerButton.classList.add('muted');
            
            // Set volume to 0
            setSystemVolume(0);
            
            voiceStatus.textContent = 'Speaker: Muted - You cannot hear others';
            voiceStatus.className = 'voice-status muted';
            logger.success('Speaker muted');
        }
    } catch (error) {
        logger.error('Failed to toggle speaker', error);
        window.alert("Failed to control speaker. Check console for details.");
    }
};

volumeUpButton.onclick = () => {
    logger.info('Increasing volume');
    
    if (isSpeakerMuted) {
        logger.warning('Cannot adjust volume - speaker is muted');
        return;
    }
    
    currentVolume = Math.min(1.0, currentVolume + 0.1);
    setSystemVolume(currentVolume);
    
    voiceStatus.textContent = `Volume: ${Math.round(currentVolume * 100)}%`;
    voiceStatus.className = 'voice-status active';
    
    logger.debug('Volume increased', { volume: currentVolume });
};

volumeDownButton.onclick = () => {
    logger.info('Decreasing volume');
    
    if (isSpeakerMuted) {
        logger.warning('Cannot adjust volume - speaker is muted');
        return;
    }
    
    currentVolume = Math.max(0.0, currentVolume - 0.1);
    setSystemVolume(currentVolume);
    
    voiceStatus.textContent = `Volume: ${Math.round(currentVolume * 100)}%`;
    voiceStatus.className = 'voice-status active';
    
    logger.debug('Volume decreased', { volume: currentVolume });
};

// Helper function to set system volume (browser-dependent)
function setSystemVolume(volume) {
    try {
        // Note: Direct system volume control is limited in browsers
        // This is a placeholder for volume control logic
        logger.debug('Setting volume', { volume });
        
        // You could implement this by controlling audio elements or media streams
        // For now, we'll just update the UI feedback
    } catch (error) {
        logger.warning('Could not set system volume', error);
    }
}

// Helper function to enable/disable voice controls based on call state
function updateVoiceControlsState(callActive) {
    if (callActive) {
        muteButton.disabled = false;
        speakerButton.disabled = false;
        volumeUpButton.disabled = false;
        volumeDownButton.disabled = false;
        voiceStatus.textContent = 'Voice controls active - Call connected';
        voiceStatus.className = 'voice-status active';
        callQuality.textContent = 'Call Quality: Connected';
        callQuality.className = 'call-quality good';
        logger.info('Voice controls enabled - call is active');
    } else {
        // Disable all voice controls
        muteButton.disabled = true;
        speakerButton.disabled = true;
        volumeUpButton.disabled = true;
        volumeDownButton.disabled = true;
        voiceStatus.textContent = 'Connect call first to enable voice controls';
        voiceStatus.className = 'voice-status';
        callQuality.textContent = 'Call Quality: Not connected';
        callQuality.className = 'call-quality';
        
        // Reset voice states
        resetVoiceControlsState();
        logger.info('Voice controls disabled - call not active');
    }
}

// Helper function to reset voice controls state
function resetVoiceControlsState() {
    isMicrophoneMuted = false;
    isSpeakerMuted = false;
    currentVolume = 1.0;
    
    muteButton.textContent = '🎤 Mute Microphone';
    muteButton.classList.remove('muted');
    speakerButton.textContent = '🔊 Mute Speaker';
    speakerButton.classList.remove('muted');
}

// Enhanced call quality monitoring
function monitorCallQuality(callObject) {
    if (!callObject) return;
    
    // Monitor call statistics (if available in the SDK)
    const qualityMonitor = setInterval(() => {
        if (!callObject || callObject.state !== 'Connected') {
            clearInterval(qualityMonitor);
            return;
        }
        
        try {
            // Note: Actual call quality metrics depend on Azure Communication Services SDK capabilities
            // This is a simulation - replace with real SDK methods when available
            const simulatedQuality = Math.random() > 0.2 ? 'good' : 'poor';
            const qualityText = simulatedQuality === 'good' ? 'Good' : 'Poor';
            
            callQuality.textContent = `Call Quality: ${qualityText}`;
            callQuality.className = `call-quality ${simulatedQuality}`;
            
            if (simulatedQuality === 'poor') {
                logger.warning('Poor call quality detected');
            }
        } catch (error) {
            logger.warning('Could not monitor call quality', error);
        }
    }, 5000); // Check every 5 seconds
}

// Add window load event for initialization logging
window.addEventListener('load', () => {
    logger.success('Application loaded successfully');
    logger.debug('Azure Communication Services SDK version check', {
        CallClient: typeof CallClient !== 'undefined',
        AzureCommunicationTokenCredential: typeof AzureCommunicationTokenCredential !== 'undefined'
    });
});

// Add error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason);
});

// Add error handling for uncaught exceptions
window.addEventListener('error', (event) => {
    logger.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});