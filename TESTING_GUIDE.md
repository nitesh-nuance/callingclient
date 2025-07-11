# Azure Communication Services Call Integration Testing Guide

## 🎯 Testing the Integration Between Azure Function and Local Calling Client

Your Azure Function is deployed at: `https://healthcareagent-functions-ng1.azurewebsites.net`
Your local calling client is running at: `http://localhost:8080`

## 📋 Step-by-Step Testing Instructions

### **Step 1: Open the Local Calling Client**
1. Open your browser and go to: `http://localhost:8080`
2. Open the browser console (F12) to see detailed logs

### **Step 2: Get Token from Azure Function**
1. The Azure Function URL should be pre-filled: `https://healthcareagent-functions-ng1.azurewebsites.net`
2. Click **"Get Token from Azure Function"** button
3. This will:
   - Call your `/api/GetToken` endpoint
   - Get a token for a specific user identity
   - Automatically fill the token input field
   - Initialize the call agent

### **Step 3: Verify Call Agent Initialization**
Check the console logs for:
- ✅ "Token received from Azure Function"
- ✅ "Call agent created successfully" 
- ✅ "Audio device permissions granted"
- ✅ "UI updated - call button enabled"

### **Step 4: Trigger Test Call from Azure**
1. Click **"Trigger Test Call from Azure"** button
2. This will call your `/api/MakeTestCall` endpoint
3. The Azure Function should initiate a call to the same user identity that your local client is using

### **Step 5: Answer the Incoming Call**
1. Watch for incoming call logs: 🔔 "INCOMING CALL RECEIVED!"
2. You should hear a beep sound (if audio is enabled)
3. The "Accept Call" button should become enabled
4. Click **"Accept Call"** to answer

## 🔍 **Debugging Tips**

### **If No Incoming Call is Received:**

1. **Check User Identity Match:**
   ```javascript
   // In console, check if the user IDs match
   console.log('Local user ID:', window.currentUserId);
   ```

2. **Check Azure Function Logs:**
   - Go to Azure Portal → Function App → Log Stream
   - Look for any errors in the MakeTestCall function

3. **Verify Token and Identity:**
   - The token from `/api/GetToken` should create the same user identity that `/api/MakeTestCall` is calling

### **Console Log Patterns to Look For:**

**Successful Flow:**
```
[timestamp] ✅ SUCCESS: Token received from Azure Function
[timestamp] ✅ SUCCESS: Call agent created successfully
[timestamp] ⚠️ WARNING: 🔔 INCOMING CALL RECEIVED!
[timestamp] ✅ SUCCESS: Incoming call accepted successfully
```

**Failed Flow:**
```
[timestamp] ❌ ERROR: Failed to get token from Azure Function
[timestamp] ❌ ERROR: Call agent not initialized
```

## 🛠️ **Troubleshooting Common Issues**

### **Issue 1: CORS Errors**
- Make sure your Azure Function has CORS configured for `http://localhost:8080`
- Check if the function app allows wildcard origins (`*`) for testing

### **Issue 2: Token Validation Errors**
- Verify your ACS connection string is properly set in Azure Function settings
- Check that the token hasn't expired

### **Issue 3: Call Not Received**
- Ensure both the token request and test call use the same user identity
- Check that your Azure Function's `MakeTestCall` is calling the correct user ID

### **Issue 4: Audio Permissions**
- Allow microphone access when prompted
- Check browser console for audio device enumeration logs

## 🔧 **Enhanced Features Added**

1. **Automatic Token Management**: Get tokens directly from your Azure Function
2. **Visual/Audio Alerts**: Browser notifications and beep sounds for incoming calls
3. **Detailed Logging**: Every step is logged with timestamps and data
4. **Error Handling**: Comprehensive error messages and stack traces
5. **UI Integration**: Dynamic buttons for Azure Function integration

## 🎯 **Expected Behavior**

When everything works correctly:
1. Click "Get Token from Azure Function" → Token appears in input field
2. Click "Trigger Test Call from Azure" → "Test call triggered!" alert
3. Within seconds → Incoming call notification and beep sound
4. Click "Accept Call" → Call becomes active
5. Click "Hang Up" → Call ends properly

The key is ensuring that both your local client and Azure Function are using the **same ACS user identity** for the call to be properly routed.
