import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

// Lazily and safely load expo-notifications only in standalone / development builds
// Expo removed Android push notification functionality from Expo Go in SDK 53+,
// so importing it unconditionally in Expo Go throws a fatal runtime exception.
function getNotificationsModule() {
  if (Platform.OS === 'web' || isRunningInExpoGo()) {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

// Safely configure notification handler only outside of Expo Go
const Notifications = getNotificationsModule();
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('Notification handler setup skipped in current runtime');
  }
}

export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) {
    // In Expo Go or Web, push notifications are gracefully bypassed
    return null;
  }

  let token: string | null = null;

  try {
    const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await NotificationsModule.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Pass projectId if available in app config
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const tokenResponse = await NotificationsModule.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    token = tokenResponse.data;

    if (userId && token) {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          pushToken: token,
          pushTokenUpdatedAt: new Date().toISOString(),
          platform: Platform.OS,
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.log('Push token registration gracefully bypassed:', error);
  }

  if (Platform.OS === 'android') {
    try {
      await NotificationsModule.setNotificationChannelAsync('default', {
        name: 'Ideacubator Notifications',
        importance: NotificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8f3f17',
      });
    } catch (e) {
      // Ignore channel creation errors on Expo Go
    }
  }

  return token;
}

export async function sendLocalNotification(title: string, body: string, data?: any) {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) {
    console.log('Local notification simulated in dev / Expo Go:', title);
    return;
  }

  try {
    await NotificationsModule.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.log('Local notification simulated in dev:', title);
  }
}
