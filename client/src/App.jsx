import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { useEffect } from 'react';
import { useTheme, THEME_STORAGE_KEY } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import CallScreen from './components/CallScreen';
import IncomingCallModal from './components/IncomingCallModal';
import ToastHost from './components/ToastHost';
import ConfirmDialogHost from './components/ConfirmDialogHost';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import Reels from './pages/Reels';
import Messages from './pages/Messages';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Events from './pages/Events';
import Explore from './pages/Explore';
import Search from './pages/Search';
import Moderation from './pages/Moderation';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import LiveRooms from './pages/LiveRooms';
import LiveRoomView from './pages/LiveRoomView';
import AIChat from './pages/AIChat';
import Saved from './pages/Saved';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <BrowserRouter>
            <ThemeSync />
            <AppRoutes />
            <ToastHost />
            <ConfirmDialogHost />
          </BrowserRouter>
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// The server also stores each user's theme choice (Settings > Appearance persists it via
// PUT /users/me/theme), but nothing ever read it back — a fresh browser/device only ever
// saw localStorage's default ('system'). This applies the account's saved preference once,
// the first time this browser has no local choice of its own, without ever overwriting a
// preference the person has already set on this specific device.
function ThemeSync() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  useEffect(() => {
    if (user?.themePreference && localStorage.getItem(THEME_STORAGE_KEY) === null) {
      setTheme(user.themePreference);
    }
  }, [user, setTheme]);
  return null;
}

// Call UI lives outside <Routes> (rendered once, always mounted) so a call keeps ringing
// or stays connected no matter which page the person navigates to — it's not tied to any
// one route's lifecycle. Each component already no-ops (returns null) when there's no
// active/incoming call, so this is a safe, permanent presence in the tree.
function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {user && <IncomingCallModal />}
      {user && <CallScreen />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post/:postId"
          element={
            <ProtectedRoute>
              <PostDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reels"
          element={
            <ProtectedRoute>
              <Reels />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <Saved />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communities"
          element={
            <ProtectedRoute>
              <Communities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/community/:idOrSlug"
          element={
            <ProtectedRoute>
              <CommunityDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderation"
          element={
            <ProtectedRoute>
              <Moderation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live"
          element={
            <ProtectedRoute>
              <LiveRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live/:roomId"
          element={
            <ProtectedRoute>
              <LiveRoomView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-chat"
          element={
            <ProtectedRoute>
              <AIChat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
