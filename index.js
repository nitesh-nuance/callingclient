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
                
                call = null;
                if (isIncomingCall) {
                    incomingCall = null;
                }
                logger.info('UI reset after call ended');
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
const functionUrlInput = document.createElement('input');
functionUrlInput.type = 'text';
functionUrlInput.id = 'function-url-input';
functionUrlInput.value = 'https://healthcareagent-functions-ng1.azurewebsites.net';
functionUrlInput.placeholder = 'Azure Function URL';

const getTokenFromFunctionButton = document.createElement('button');
getTokenFromFunctionButton.textContent = 'Get Token from Azure Function';
getTokenFromFunctionButton.id = 'get-token-function-btn';

const triggerTestCallButton = document.createElement('button');
triggerTestCallButton.textContent = 'Trigger Test Call from Azure';
triggerTestCallButton.id = 'trigger-test-call-btn';

// Insert these elements into the DOM (assuming they should go near the token input)
if (userToken && userToken.parentNode) {
    userToken.parentNode.insertBefore(functionUrlInput, userToken);
    userToken.parentNode.insertBefore(document.createElement('br'), userToken);
    userToken.parentNode.insertBefore(getTokenFromFunctionButton, userToken);
    userToken.parentNode.insertBefore(document.createElement('br'), userToken);
    userToken.parentNode.insertBefore(triggerTestCallButton, userToken);
    userToken.parentNode.insertBefore(document.createElement('br'), userToken);
}

// Log DOM elements found
logger.info('DOM Elements initialized', {
    userToken: !!userToken,
    calleeInput: !!calleeInput,
    submitToken: !!submitToken,
    callButton: !!callButton,
    hangUpButton: !!hangUpButton,
    acceptCallButton: !!acceptCallButton,
    functionUrlInput: !!functionUrlInput,
    getTokenFromFunctionButton: !!getTokenFromFunctionButton,
    triggerTestCallButton: !!triggerTestCallButton
});

// Add function to get token from Azure Function
getTokenFromFunctionButton.addEventListener("click", async () => {
    logger.info('Get token from Azure Function button clicked');
    
    const functionUrl = functionUrlInput.value.trim();
    if (!functionUrl) {
        logger.error('No Azure Function URL provided');
        window.alert('Please enter the Azure Function URL');
        return;
    }
    
    try {
        const tokenEndpoint = `${functionUrl}/api/GetToken`;
        logger.info('Requesting token from Azure Function', { endpoint: tokenEndpoint });
        
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}) // Empty body, function will create/reuse user
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const tokenData = await response.json();
        logger.success('Token received from Azure Function', { 
            userId: tokenData.userId,
            expiresOn: tokenData.expiresOn 
        });
        
        // Set the token in the input field
        userToken.value = tokenData.token;
        
        // Store the user ID for reference
        window.currentUserId = tokenData.userId;
        
        logger.info('Token set in input field', { 
            tokenLength: tokenData.token.length,
            userId: tokenData.userId 
        });
        
        // Automatically initialize the call agent
        submitToken.click();
        
    } catch (error) {
        logger.error('Failed to get token from Azure Function', error);
        window.alert(`Failed to get token: ${error.message}`);
    }
});

// Add function to trigger test call from Azure Function
triggerTestCallButton.addEventListener("click", async () => {
    logger.info('Trigger test call button clicked');
    
    const functionUrl = functionUrlInput.value.trim();
    if (!functionUrl) {
        logger.error('No Azure Function URL provided');
        window.alert('Please enter the Azure Function URL');
        return;
    }
    
    if (!callAgent) {
        logger.error('Call agent not initialized - get token first');
        window.alert('Please get a token and initialize the call agent first');
        return;
    }
    
    try {
        const testCallEndpoint = `${functionUrl}/api/MakeTestCall`;
        logger.info('Triggering test call from Azure Function', { endpoint: testCallEndpoint });
        
        const response = await fetch(testCallEndpoint, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.text();
        logger.success('Test call triggered successfully', { response: result });
        
        window.alert('Test call triggered! You should receive an incoming call shortly.');
        
    } catch (error) {
        logger.error('Failed to trigger test call from Azure Function', error);
        window.alert(`Failed to trigger test call: ${error.message}`);
    }
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