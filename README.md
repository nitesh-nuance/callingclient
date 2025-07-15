# Azure Communication Services - Calling Client

A modern web application for voice calling using Azure Communication Services. This client provides a complete calling experience with advanced voice controls, real-time call quality monitoring, and an intuitive user interface.

## 🎯 Features

- **Voice Calling**: Make and receive calls using Azure Communication Services
- **Real-time Voice Controls**: 
  - Microphone mute/unmute during calls
  - Speaker volume control
  - Real-time call quality monitoring
- **Enhanced User Experience**:
  - Modern, responsive UI with gradient design
  - Real-time call state updates
  - Comprehensive event logging
  - Browser notifications for incoming calls
  - Audio alerts for incoming calls
- **Call Management**:
  - Outbound call initiation
  - Incoming call acceptance
  - Call hang-up with participant control
  - Automatic UI state management

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Azure Communication Services resource
- Valid Azure Communication Services access token

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd callingclient
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start -dev
```

The application will open automatically in your browser at `http://localhost:8080`.

## 🔧 Development

### Available Scripts

- `npm start` - Start development server with auto-reload
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests (currently not configured)

### Project Structure

```
callingclient/
├── index.html          # Main HTML file with UI components
├── index.js            # Core application logic and Azure SDK integration
├── package.json        # Project dependencies and scripts
├── webpack.config.js   # Webpack configuration for bundling
├── README.md          # This file
├── TESTING_GUIDE.md   # Testing documentation
└── FIXED_EVENT_SUBSCRIPTION_ERROR.md  # Technical documentation
```

## 📋 How to Use

### 1. Get Access Token
- Obtain a valid Azure Communication Services access token from your backend service
- The token should be generated for a specific user identity

### 2. Initialize Connection
- Enter your access token in the "User access token" field
- Click "🔑 Submit Token" to initialize the calling client
- The application will request microphone permissions

### 3. Making Calls
- Enter the target user's communication ID in "Who would you like to call?"
- Click "📞 Start Call" to initiate the call
- Use voice controls during the call for optimal experience

### 4. Receiving Calls
- When someone calls you, you'll see a browser notification
- Click "✅ Accept Call" to answer the incoming call
- The UI will automatically update to show call controls

### 5. Voice Controls During Calls
- **🎤 Mute/Unmute**: Control your microphone
- **🔊 Speaker Control**: Mute/unmute speaker output
- **🔊+ Volume Up / 🔊- Volume Down**: Adjust speaker volume
- **Call Quality Monitor**: Real-time display of connection quality

## 🔊 Voice Controls Features

### Microphone Management
- **Mute**: Prevents others from hearing you
- **Unmute**: Allows others to hear you
- **Visual Feedback**: Button state changes and status text updates

### Speaker Management
- **Mute Speaker**: Stop hearing other participants
- **Volume Control**: Adjust output volume in 10% increments
- **Quality Monitoring**: Real-time call quality assessment

### Status Indicators
- **Voice Status**: Shows current microphone and speaker state
- **Call Quality**: Displays connection quality (Good/Poor)
- **Visual Cues**: Color-coded status indicators

## 🎨 UI Components

### Design Features
- **Modern Gradient Background**: Purple to blue gradient design
- **Responsive Layout**: Works on desktop and mobile devices
- **Intuitive Controls**: Large, clearly labeled buttons
- **Real-time Feedback**: Dynamic status updates and visual cues
- **Accessibility**: High contrast and clear typography

### Button States
- **Disabled State**: Buttons are disabled when not applicable
- **Active State**: Visual indication of current call state
- **Muted State**: Special styling for muted controls

## 🔧 Technical Details

### Dependencies
- **@azure/communication-calling**: Azure Communication Services Calling SDK
- **@azure/communication-common**: Common utilities for Azure Communication Services
- **Webpack**: Module bundler for development and production builds
- **Babel**: JavaScript transpilation for browser compatibility

### Browser Compatibility
- Modern browsers with WebRTC support
- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- Requires HTTPS for microphone access (except localhost)

### Security Considerations
- Access tokens should be generated server-side
- Never expose Azure Communication Services connection strings in client code
- Use HTTPS in production for secure media transmission

## 🐛 Debugging

### Logging
The application includes comprehensive logging:
- **INFO**: General application events
- **SUCCESS**: Successful operations
- **WARNING**: Non-critical issues
- **ERROR**: Critical errors with stack traces
- **DEBUG**: Detailed debugging information

### Common Issues
1. **Token Issues**: Ensure your access token is valid and not expired
2. **Microphone Permissions**: Grant microphone access when prompted
3. **Network Connectivity**: Check internet connection for call quality
4. **Browser Compatibility**: Use a supported modern browser

### Console Logs
Check browser developer console for detailed logs:
- Call state changes
- Device enumeration
- Event subscriptions
- Error details

## 📖 Documentation

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Comprehensive testing procedures
- [FIXED_EVENT_SUBSCRIPTION_ERROR.md](./FIXED_EVENT_SUBSCRIPTION_ERROR.md) - Technical issue resolution
- [Azure Communication Services Documentation](https://docs.microsoft.com/en-us/azure/communication-services/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the console logs for detailed error information
2. Review the [TESTING_GUIDE.md](./TESTING_GUIDE.md) for troubleshooting
3. Ensure all prerequisites are met
4. Verify Azure Communication Services resource configuration

## 🔗 Related Projects

This calling client is designed to work with Azure Communication Services and can be integrated with:
- Backend token generation services
- User management systems
- Call recording solutions
- Customer support platforms
