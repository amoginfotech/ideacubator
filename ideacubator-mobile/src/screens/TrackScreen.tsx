import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  FlatList,
  KeyboardAvoidingView
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { sendLocalNotification } from '../services/notifications';

interface TrackScreenProps {
  user: any;
  onNavigateToSubmit: () => void;
}

const STAGES = [
  { id: 'submitted', label: 'Submitted', icon: 'document-text-outline' },
  { id: 'under_review', label: 'Under Review', icon: 'search-outline' },
  { id: 'diligence', label: 'Diligence Call', icon: 'videocam-outline' },
  { id: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
];

const TIME_SLOTS = [
  '10:00 AM – 10:45 AM IST',
  '11:30 AM – 12:15 PM IST',
  '02:00 PM – 02:45 PM IST',
  '04:00 PM – 04:45 PM IST',
  '05:30 PM – 06:15 PM IST',
];

export default function TrackScreen({ user, onNavigateToSubmit }: TrackScreenProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatScrollRef = useRef<FlatList>(null);

  // Meeting Scheduler State
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [meetingSlot, setMeetingSlot] = useState(TIME_SLOTS[0]);
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  // Subscribe to applications for current founder
  useEffect(() => {
    if (!user) {
      setApplications([]);
      setLoading(false);
      return;
    }

    const userEmail = (user.email || '').toLowerCase().trim();
    const userUid = user.uid;

    const q = query(collection(db, 'applications'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const docEmail = (data.founderEmail || data.email || data.profile?.email || '').toLowerCase().trim();
          const docUid = data.applicantUid || data.userId || data.uid;

          if (docUid === userUid || (userEmail && docEmail === userEmail)) {
            apps.push({
              id: d.id,
              ...data,
              title: data.idea?.title || data.ideaName || data.title || 'Untitled Working Concept',
              description: data.idea?.description || data.ideaSummary || data.description || '',
              status: data.status || data.metadata?.status || 'submitted',
              createdAt: data.metadata?.createdAt || data.submittedAt || data.createdAt,
            });
          }
        });

        apps.sort((a, b) => {
          const tA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tB - tA;
        });

        setApplications(apps);
        if (apps.length > 0 && !selectedApp) {
          setSelectedApp(apps[0]);
        } else if (apps.length > 0 && selectedApp) {
          const refreshed = apps.find((a) => a.id === selectedApp.id);
          if (refreshed) setSelectedApp(refreshed);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Applications subscription error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Subscribe to real-time chat for selected application
  useEffect(() => {
    if (!selectedApp) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('applicationId', '==', selectedApp.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() });
        });

        msgs.sort((a, b) => {
          const tA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tA - tB;
        });

        setMessages(msgs);
      },
      (error) => {
        console.warn('Messages error:', error);
      }
    );

    return () => unsubscribe();
  }, [selectedApp]);

  // Handle Send Message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedApp) return;

    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.title,
        senderUid: user.uid,
        senderName: user.displayName || 'Founder',
        senderRole: 'founder',
        content: newMessage.trim(),
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('Send Error', err.message || 'Could not send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Handle Schedule Meeting
  const handleScheduleMeeting = async () => {
    if (!user || !selectedApp) return;
    if (!meetingDate.trim()) {
      Alert.alert('Validation', 'Please select a valid date.');
      return;
    }

    setSchedulingMeeting(true);
    try {
      const newMtg = {
        applicantUid: user.uid,
        founderName: user.displayName || selectedApp.founderName || 'Founder',
        founderEmail: user.email || selectedApp.founderEmail || '',
        founderPhone: selectedApp.founderPhone || '',
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.title,
        title: `Strategy Review: ${selectedApp.title}`,
        description: meetingAgenda || 'Founder deep-dive session with Ideacubator studio partners.',
        date: meetingDate,
        time: meetingSlot,
        location: 'Ideacubator In-App Session Room',
        status: 'confirmed',
        mailboxRecipient: 'team@ideacubator.in',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'meetings'), newMtg);

      // Dispatch to studio mailbox
      await addDoc(collection(db, 'mailbox'), {
        meetingId: docRef.id,
        type: 'meeting_scheduled',
        to: 'team@ideacubator.in',
        secondary: 'submitidea@ideacubator.in',
        from: user.email,
        applicantUid: user.uid,
        founderName: newMtg.founderName,
        founderEmail: user.email,
        founderPhone: newMtg.founderPhone,
        applicationTitle: newMtg.applicationTitle,
        date: meetingDate,
        timeSlot: meetingSlot,
        agenda: newMtg.description,
        status: 'unread',
        createdAt: serverTimestamp(),
      });

      // Post automated announcement in chat
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.title,
        senderUid: 'system',
        senderName: 'Ideacubator Scheduler',
        senderRole: 'team',
        content: `📅 Partner Strategy Session booked for ${meetingDate} at ${meetingSlot}. Diligence team has been alerted!`,
        createdAt: serverTimestamp(),
      });

      await sendLocalNotification(
        'Meeting Confirmed!',
        `Your diligence session for ${selectedApp.title} is scheduled for ${meetingDate} at ${meetingSlot}.`
      );

      Alert.alert(
        'Session Scheduled!',
        `Strategy review scheduled for ${meetingDate} at ${meetingSlot}. Studio partners have been notified.`
      );
      setIsMeetingOpen(false);
      setMeetingAgenda('');
    } catch (err: any) {
      Alert.alert('Scheduling Error', err.message || 'Could not schedule meeting.');
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const getStageIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('accept') || s.includes('admit')) return 3;
    if (s.includes('diligence') || s.includes('call') || s.includes('interview')) return 2;
    if (s.includes('review') || s.includes('screening')) return 1;
    return 0; // submitted
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Syncing founder workspace...</Text>
      </View>
    );
  }

  // Zero State: Founder has not submitted an idea yet
  if (applications.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBadge}>
            <Ionicons name="rocket-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Ready to Build Your Venture?</Text>
          <Text style={styles.emptyDesc}>
            You haven't submitted an idea yet. Share your concept with Ideacubator's
            institutional venture studio to get instant AI clarity review, mentorship,
            and pre-seed incubation.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={onNavigateToSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionBtnText}>Submit an Idea →</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresRow}>
          <View style={styles.featureBox}>
            <Ionicons name="flash-outline" size={20} color={colors.accentAmber} />
            <Text style={styles.featureTitle}>Instant AI Review</Text>
            <Text style={styles.featureText}>Heuristic clarity evaluation in 60 seconds.</Text>
          </View>
          <View style={styles.featureBox}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.accentBlue} />
            <Text style={styles.featureTitle}>Direct Diligence Chat</Text>
            <Text style={styles.featureText}>Real-time founder line with studio principals.</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  const currentStageIdx = selectedApp ? getStageIndex(selectedApp.status) : 0;
  const aiReview = selectedApp?.aiReview;

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Application Selector (if multiple) */}
        {applications.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.appSelectorScroll}
            contentContainerStyle={styles.appSelectorContainer}
          >
            {applications.map((app) => (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.appPill,
                  selectedApp?.id === app.id && styles.appPillActive,
                ]}
                onPress={() => setSelectedApp(app)}
              >
                <Text
                  style={[
                    styles.appPillText,
                    selectedApp?.id === app.id && styles.appPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {app.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Selected Idea Summary Card */}
        {selectedApp && (
          <View style={styles.ideaCard}>
            <View style={styles.ideaCardHeader}>
              <View style={styles.titleArea}>
                <Text style={styles.ideaTitle}>{selectedApp.title}</Text>
                <Text style={styles.ideaSubmittedDate}>
                  Submitted on{' '}
                  {selectedApp.createdAt?.toDate
                    ? selectedApp.createdAt.toDate().toLocaleDateString()
                    : 'Recently'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor:
                      currentStageIdx === 3
                        ? 'rgba(16, 185, 129, 0.15)'
                        : currentStageIdx === 2
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'rgba(59, 130, 246, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    {
                      color:
                        currentStageIdx === 3
                          ? colors.accentGreen
                          : currentStageIdx === 2
                          ? colors.statusDiligence
                          : colors.accentBlue,
                    },
                  ]}
                >
                  {STAGES[currentStageIdx]?.label.toUpperCase() || 'SUBMITTED'}
                </Text>
              </View>
            </View>

            <Text style={styles.ideaDescription} numberOfLines={3}>
              {selectedApp.description}
            </Text>

            {/* Visual Milestone Stepper */}
            <View style={styles.stepperContainer}>
              <Text style={styles.sectionLabel}>MILESTONE PROGRESSION</Text>
              <View style={styles.stepperTrack}>
                {STAGES.map((s, idx) => {
                  const isDone = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  return (
                    <View key={s.id} style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepNode,
                          isCurrent && styles.stepNodeCurrent,
                          isDone && styles.stepNodeDone,
                        ]}
                      >
                        <Ionicons
                          name={
                            isDone
                              ? 'checkmark'
                              : isCurrent
                              ? (s.icon as any)
                              : (s.icon as any)
                          }
                          size={14}
                          color={
                            isCurrent
                              ? '#ffffff'
                              : isDone
                              ? colors.accentGreen
                              : colors.textMuted
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCurrent && styles.stepLabelCurrent,
                          isDone && styles.stepLabelDone,
                        ]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setIsChatOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles" size={16} color="#ffffff" />
                <Text style={styles.actionBtnText}>
                  Chat with Diligence Team ({messages.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => setIsMeetingOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.accentAmber} />
                <Text style={styles.actionBtnSecondaryText}>Schedule Strategy Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Scorecard Summary */}
        {aiReview && (
          <View style={styles.scorecardCard}>
            <View style={styles.scorecardHeader}>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreNumber}>
                  {aiReview.clarityScore || 8}
                </Text>
                <Text style={styles.scoreOutOf}>/10</Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scorecardTitle}>AI Diligence Scorecard</Text>
                <Text style={styles.scorecardSub}>
                  Clarity & Problem Validation Assessment
                </Text>
              </View>
            </View>

            {aiReview.oneLineSummary ? (
              <View style={styles.scorecardSection}>
                <Text style={styles.scorecardSectionLabel}>ONE-LINE SYNTHESIS</Text>
                <Text style={styles.scorecardBodyText}>{aiReview.oneLineSummary}</Text>
              </View>
            ) : null}

            {aiReview.promisingPoints && aiReview.promisingPoints.length > 0 && (
              <View style={styles.scorecardSection}>
                <Text style={styles.scorecardSectionLabel}>KEY STRENGTHS</Text>
                {aiReview.promisingPoints.map((pt: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                ))}
              </View>
            )}

            {aiReview.openQuestions && aiReview.openQuestions.length > 0 && (
              <View style={styles.scorecardSection}>
                <Text style={styles.scorecardSectionLabel}>DILIGENCE QUESTIONS</Text>
                {aiReview.openQuestions.map((q: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="help-circle" size={16} color={colors.accentAmber} />
                    <Text style={styles.bulletText}>{q}</Text>
                  </View>
                ))}
              </View>
            )}

            {aiReview.nextExperiment ? (
              <View style={styles.experimentBox}>
                <Ionicons name="flask-outline" size={18} color={colors.primaryLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.experimentLabel}>RECOMMENDED NEXT SPRINT</Text>
                  <Text style={styles.experimentText}>{aiReview.nextExperiment}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Submit Another Idea Option */}
        <TouchableOpacity
          style={styles.submitAnotherBtn}
          onPress={onNavigateToSubmit}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.submitAnotherText}>Submit Another Venture Concept</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ========================================================================
          REAL-TIME CHAT MODAL
          ======================================================================== */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        onRequestClose={() => setIsChatOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.chatModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Chat Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalHeaderTitle}>Diligence Line</Text>
              <Text style={styles.modalHeaderSub} numberOfLines={1}>
                {selectedApp?.title || 'Ideacubator Team'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsChatOpen(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Messages Feed */}
          <FlatList
            ref={chatScrollRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.chatEmptyView}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text style={styles.chatEmptyText}>
                  No messages yet. Ask a question or share updates with your diligence partner!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isFounder = item.senderRole === 'founder' || item.senderUid === user?.uid;
              const isSystem = item.senderRole === 'team' && item.senderUid === 'system';

              if (isSystem) {
                return (
                  <View style={styles.systemMsgBox}>
                    <Ionicons name="information-circle" size={16} color={colors.accentAmber} />
                    <Text style={styles.systemMsgText}>{item.content}</Text>
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.messageRow,
                    isFounder ? styles.messageRowFounder : styles.messageRowStudio,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isFounder ? styles.bubbleFounder : styles.bubbleStudio,
                    ]}
                  >
                    <Text style={styles.msgSenderName}>
                      {isFounder ? 'You' : item.senderName || 'Ideacubator Diligence Team'}
                    </Text>
                    <Text style={styles.msgContent}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Chat Input Bar */}
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type your message to studio advisors..."
              placeholderTextColor={colors.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !newMessage.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sendingMsg}
            >
              {sendingMsg ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================
          SCHEDULE MEETING MODAL
          ======================================================================== */}
      <Modal
        visible={isMeetingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsMeetingOpen(false)}
      >
        <View style={styles.meetingModalBackdrop}>
          <View style={styles.meetingModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Schedule Diligence Call</Text>
                <Text style={styles.modalHeaderSub}>
                  45-minute venture strategy session
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsMeetingOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.meetingFormScroll}>
              <Text style={styles.formSectionLabel}>DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.meetingInput}
                value={meetingDate}
                onChangeText={setMeetingDate}
                placeholder="2026-10-05"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formSectionLabel}>SELECT TIME SLOT</Text>
              <View style={styles.slotGrid}>
                {TIME_SLOTS.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotChip,
                      meetingSlot === slot && styles.slotChipActive,
                    ]}
                    onPress={() => setMeetingSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        meetingSlot === slot && styles.slotChipTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formSectionLabel}>DISCUSSION TOPIC / AGENDAS</Text>
              <TextInput
                style={[styles.meetingInput, { height: 80 }]}
                placeholder="e.g. Discuss MVP architecture, go-to-market plan, or seed terms"
                placeholderTextColor={colors.textMuted}
                value={meetingAgenda}
                onChangeText={setMeetingAgenda}
                multiline
              />

              <TouchableOpacity
                style={styles.confirmMeetingBtn}
                onPress={handleScheduleMeeting}
                disabled={schedulingMeeting}
              >
                {schedulingMeeting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmMeetingBtnText}>
                    Confirm Strategy Session
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: 20,
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  featureText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  appSelectorScroll: {
    marginBottom: 14,
  },
  appSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  appPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    maxWidth: 200,
  },
  appPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appPillText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  appPillTextActive: {
    color: '#ffffff',
  },
  ideaCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
  },
  ideaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  ideaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  ideaSubmittedDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ideaDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  stepperContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  stepperTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNodeCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNodeDone: {
    borderColor: colors.accentGreen,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: colors.accentGreen,
  },
  actionButtonsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnSecondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  scorecardCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
  },
  scorecardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreNumber: {
    color: colors.primaryLight,
    fontSize: 24,
    fontWeight: '900',
  },
  scoreOutOf: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  scoreInfo: {
    flex: 1,
  },
  scorecardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  scorecardSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  scorecardSection: {
    marginBottom: 14,
  },
  scorecardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  scorecardBodyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  experimentBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  experimentLabel: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  experimentText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  submitAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  submitAnotherText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalCloseBtn: {
    padding: 6,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  chatEmptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  chatEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 10,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  messageRowFounder: {
    justifyContent: 'flex-end',
  },
  messageRowStudio: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 16,
  },
  bubbleFounder: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleStudio: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderBottomLeftRadius: 4,
  },
  msgSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  msgContent: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  systemMsgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  systemMsgText: {
    flex: 1,
    color: colors.accentAmber,
    fontSize: 12,
    lineHeight: 16,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  meetingModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  meetingModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  meetingFormScroll: {
    padding: 20,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  meetingInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  slotGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  slotChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  slotChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  slotChipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  slotChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  confirmMeetingBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmMeetingBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
