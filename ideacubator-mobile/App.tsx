import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { colors } from './src/theme/colors';
import { Ionicons } from '@expo/vector-icons';

import LandingHomeScreen from './src/screens/LandingHomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import TrackScreen from './src/screens/TrackScreen';
import SubmitIdeaScreen from './src/screens/SubmitIdeaScreen';
import KnowledgeHubScreen from './src/screens/KnowledgeHubScreen';
import { registerForPushNotificationsAsync } from './src/services/notifications';

type TabKey = 'home' | 'knowledge' | 'submit' | 'track';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabKey>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingTabAfterAuth, setPendingTabAfterAuth] = useState<TabKey | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Register push notifications
        registerForPushNotificationsAsync(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentTab('home');
    } catch (e: any) {
      Alert.alert('Sign Out', e.message || 'Could not sign out.');
    }
  };

  const handleOpenAuth = (targetTab?: TabKey) => {
    if (targetTab) {
      setPendingTabAfterAuth(targetTab);
    }
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingTabAfterAuth) {
      setCurrentTab(pendingTabAfterAuth);
      setPendingTabAfterAuth(null);
    }
  };

  const handleTabPress = (tab: TabKey) => {
    setCurrentTab(tab);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing Ideacubator...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.surface} />

        {/* Global Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.brandRow}
            onPress={() => setCurrentTab('home')}
            activeOpacity={0.8}
          >
            <View style={styles.brandBadge}>
              <Ionicons name="bulb-outline" size={18} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.brandName}>Ideacubator</Text>
              <Text style={styles.brandTagline}>Venture Studio</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.userActions}>
            {user ? (
              <>
                <View style={styles.userInfoPill}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.displayName || user.email?.split('@')[0] || 'Founder'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.signOutBtn}
                  onPress={handleSignOut}
                  activeOpacity={0.7}
                  accessibilityLabel="Sign Out"
                >
                  <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.headerSignInBtn}
                onPress={() => handleOpenAuth()}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in-outline" size={16} color="#ffffff" />
                <Text style={styles.headerSignInText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.body}>
          {/* TAB 1: LANDING HOME (PUBLIC) */}
          {currentTab === 'home' && (
            <LandingHomeScreen
              onNavigateToSubmit={() => {
                if (user) {
                  setCurrentTab('submit');
                } else {
                  handleOpenAuth('submit');
                }
              }}
              onNavigateToKnowledge={() => setCurrentTab('knowledge')}
              onNavigateToTrack={() => {
                if (user) {
                  setCurrentTab('track');
                } else {
                  handleOpenAuth('track');
                }
              }}
              onSignInPress={() => handleOpenAuth()}
              isAuthenticated={!!user}
              userName={user?.displayName || user?.email?.split('@')[0]}
            />
          )}

          {/* TAB 2: KNOWLEDGE HUB (PUBLIC) */}
          {currentTab === 'knowledge' && <KnowledgeHubScreen />}

          {/* TAB 3: SUBMIT IDEA (REQUIRES LOGIN) */}
          {currentTab === 'submit' && (
            user ? (
              <SubmitIdeaScreen
                user={user}
                onSubmissionSuccess={() => setCurrentTab('track')}
              />
            ) : (
              <View style={styles.authRequiredContainer}>
                <View style={styles.authRequiredCard}>
                  <View style={[styles.authIconCircle, { backgroundColor: 'rgba(143, 63, 23, 0.2)' }]}>
                    <Ionicons name="bulb-outline" size={32} color={colors.accentAmber} />
                  </View>
                  <Text style={styles.authRequiredTitle}>Founder Sign-In Required</Text>
                  <Text style={styles.authRequiredDesc}>
                    To submit your pitch deck, preserve intellectual property confidentiality, and receive partner review updates, please sign in with your founder account.
                  </Text>
                  <TouchableOpacity
                    style={styles.authRequiredBtn}
                    onPress={() => handleOpenAuth('submit')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#ffffff" />
                    <Text style={styles.authRequiredBtnText}>Sign In to Submit Idea</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.authDismissBtn}
                    onPress={() => setCurrentTab('home')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.authDismissText}>← Return to Public Pages</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}

          {/* TAB 4: TRACK VENTURES (REQUIRES LOGIN) */}
          {currentTab === 'track' && (
            user ? (
              <TrackScreen
                user={user}
                onNavigateToSubmit={() => setCurrentTab('submit')}
              />
            ) : (
              <View style={styles.authRequiredContainer}>
                <View style={styles.authRequiredCard}>
                  <View style={[styles.authIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                    <Ionicons name="compass-outline" size={32} color="#c084fc" />
                  </View>
                  <Text style={styles.authRequiredTitle}>Sign In to Track Ventures</Text>
                  <Text style={styles.authRequiredDesc}>
                    Access your live diligence pipeline, review stage updates, confidential advisor messaging, and scheduled evaluation meetings.
                  </Text>
                  <TouchableOpacity
                    style={styles.authRequiredBtn}
                    onPress={() => handleOpenAuth('track')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#ffffff" />
                    <Text style={styles.authRequiredBtnText}>Sign In to Access Tracker</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.authDismissBtn}
                    onPress={() => setCurrentTab('home')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.authDismissText}>← Return to Public Pages</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
        </View>

        {/* Bottom Tab Navigation */}
        <View style={styles.bottomNav}>
          {/* Tab 1: Home (Public) */}
          <TouchableOpacity
            style={styles.navTab}
            onPress={() => handleTabPress('home')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={currentTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={currentTab === 'home' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'home' && styles.navLabelActive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Knowledge (Public) */}
          <TouchableOpacity
            style={styles.navTab}
            onPress={() => handleTabPress('knowledge')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={currentTab === 'knowledge' ? 'book' : 'book-outline'}
              size={22}
              color={currentTab === 'knowledge' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'knowledge' && styles.navLabelActive,
              ]}
            >
              Knowledge
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Submit Idea */}
          <TouchableOpacity
            style={styles.navTab}
            onPress={() => handleTabPress('submit')}
            activeOpacity={0.8}
          >
            <View style={[styles.submitPill, currentTab === 'submit' && styles.submitPillActive]}>
              <Ionicons
                name={currentTab === 'submit' ? 'add-circle' : 'add-circle-outline'}
                size={20}
                color={currentTab === 'submit' ? '#ffffff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  styles.submitNavLabel,
                  currentTab === 'submit' && styles.submitNavLabelActive,
                ]}
              >
                Submit
              </Text>
            </View>
          </TouchableOpacity>

          {/* Tab 4: My Ideas / Track */}
          <TouchableOpacity
            style={styles.navTab}
            onPress={() => handleTabPress('track')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={currentTab === 'track' ? 'compass' : 'compass-outline'}
              size={22}
              color={currentTab === 'track' ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'track' && styles.navLabelActive,
              ]}
            >
              My Ideas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Global Modal for Auth (can be dismissed anytime) */}
        <Modal
          visible={showAuthModal}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
          onRequestClose={() => setShowAuthModal(false)}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <AuthScreen
              onSuccess={handleAuthSuccess}
              onClose={() => setShowAuthModal(false)}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  brandTagline: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfoPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userName: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  signOutBtn: {
    padding: 6,
  },
  headerSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  headerSignInText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  navLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  submitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  submitPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  submitNavLabel: {
    color: colors.textSecondary,
    marginTop: 0,
    fontSize: 11,
  },
  submitNavLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authRequiredCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  authIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authRequiredTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  authRequiredDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  authRequiredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  authRequiredBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  authDismissBtn: {
    paddingVertical: 6,
  },
  authDismissText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
