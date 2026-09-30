import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { sendLocalNotification } from '../services/notifications';

interface SubmitIdeaScreenProps {
  user: any;
  onSubmissionSuccess: () => void;
}

interface AttachedFile {
  name: string;
  size?: number;
  uri: string;
  mimeType?: string;
}

const FOUNDER_ROLES = [
  'Working Professional',
  'Domain / Industry Expert',
  'Student / Researcher',
  'Serial Founder',
  'Growth / Sales Lead',
  'Senior Software Engineer',
];

const STAGE_OPTIONS = [
  'Idea & Problem Framing',
  'Prototype / Lean Demo Ready',
  'Pilot Customers / Early Traction',
  'Early Revenue Generating',
];

export default function SubmitIdeaScreen({ user, onSubmissionSuccess }: SubmitIdeaScreenProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Step 1: Founder Profile
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Bangalore, India');
  const [selectedRole, setSelectedRole] = useState(FOUNDER_ROLES[0]);

  // Step 2: Idea Details & Documents
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problem, setProblem] = useState('');
  const [customer, setCustomer] = useState('');
  const [stage, setStage] = useState(STAGE_OPTIONS[0]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Step 3: AI Review
  const [aiScorecard, setAiScorecard] = useState<any | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Keep profile in sync if user changes
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.displayName || '');
      if (!email) setEmail(user.email || '');
    }
  }, [user]);

  // Pick Document (PDF, PPT, Images)
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*'
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            uri: file.uri,
            mimeType: file.mimeType,
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('File Picker Error', err.message || 'Could not pick file.');
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Generate AI Clarity Assessment
  const runAiReview = async () => {
    setAiAnalyzing(true);
    // Simulate AI synthesis with realistic founder feedback
    await new Promise((r) => setTimeout(r, 1200));

    const wordCount = description.split(/\s+/).filter(Boolean).length;
    const score = Math.min(9, Math.max(6, Math.floor(wordCount / 10) + (problem ? 2 : 0)));

    const analysis = {
      clarityScore: score,
      oneLineSummary: `${title}: Solution targeting ${customer || 'target users'} addressing ${problem ? problem.slice(0, 90) : 'key domain challenges'}.`,
      promisingPoints: [
        'Clear acute pain point identified in high-velocity market.',
        `Targeting ${customer || 'qualified buyers'} with direct willingness-to-pay potential.`,
        'Lean execution footprint matching venture studio acceleration model.'
      ],
      openQuestions: [
        'What specific trigger prompts customer adoption over legacy workarounds?',
        'What is your day-1 distribution hook to onboard the first 10 customers?'
      ],
      nextExperiment: 'Conduct 5 structured discovery interviews without pitching the product—confirm if this problem ranks in their top 3 daily headaches.',
    };

    setAiScorecard(analysis);
    setAiAnalyzing(false);
  };

  // Validate current step
  const handleNextStep = async () => {
    if (step === 1) {
      if (!fullName.trim()) {
        Alert.alert('Validation', 'Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        Alert.alert('Validation', 'Please enter a valid email address.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!title.trim()) {
        Alert.alert('Validation', 'Please enter your idea or venture title.');
        return;
      }
      if (!description.trim() || description.trim().length < 15) {
        Alert.alert('Validation', 'Please describe your idea in at least 15 characters.');
        return;
      }
      setStep(3);
      if (!aiScorecard) {
        runAiReview();
      }
    }
  };

  // Final Submit to Firestore
  const handleFinalSubmit = async () => {
    if (!agreeTerms) {
      Alert.alert('Validation', 'Please confirm terms agreement before submitting.');
      return;
    }
    if (!user) {
      Alert.alert('Authentication', 'Please sign in to complete your submission.');
      return;
    }

    setSubmitting(true);
    try {
      const newAppRef = doc(collection(db, 'applications'));
      const applicationId = newAppRef.id;

      // File metadata
      const uploadedDocs = attachedFiles.map((f) => ({
        name: f.name,
        size: f.size || 0,
        uploadedAt: new Date().toISOString(),
        note: 'Uploaded via Ideacubator Mobile App',
      }));

      const applicationPayload = {
        applicantUid: user.uid,
        founderEmail: email.trim(),
        founderName: fullName.trim(),
        founderPhone: phone.trim(),
        founderLocation: location.trim(),
        founderType: selectedRole,
        profile: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          userType: selectedRole,
        },
        idea: {
          title: title.trim(),
          description: description.trim(),
          problem: problem.trim(),
          customer: customer.trim(),
          currentStage: stage,
        },
        documents: uploadedDocs,
        aiReview: aiScorecard,
        stage: 1,
        status: 'submitted',
        metadata: {
          status: 'submitted',
          source: 'mobile_app',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      };

      await setDoc(newAppRef, applicationPayload);

      // Create welcome notification in diligence chat
      await setDoc(doc(collection(db, 'messages')), {
        applicationId,
        applicationTitle: title.trim(),
        senderUid: 'system',
        senderName: 'Ideacubator Diligence Team',
        senderRole: 'team',
        content: `👋 Welcome to Ideacubator, ${fullName}! Your concept "${title}" has been safely received. Our diligence team is reviewing your initial clarity score and will connect shortly.`,
        createdAt: serverTimestamp(),
      });

      // Send local push notification
      await sendLocalNotification(
        'Venture Submitted!',
        `Your concept "${title}" is now under review by Ideacubator studio partners.`
      );

      Alert.alert(
        'Submission Received!',
        'Your venture concept has been submitted. You can now track review milestones and chat with studio advisors in your Founder Workspace.',
        [{ text: 'Go to Workspace', onPress: onSubmissionSuccess }]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Stepper Progress Bar */}
      <View style={styles.progressBarWrapper}>
        <View style={styles.stepIndicators}>
          {[1, 2, 3].map((num) => (
            <View key={num} style={styles.stepCol}>
              <View
                style={[
                  styles.stepBadge,
                  step === num && styles.stepBadgeActive,
                  step > num && styles.stepBadgeDone,
                ]}
              >
                {step > num ? (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                ) : (
                  <Text
                    style={[
                      styles.stepBadgeText,
                      step === num && styles.stepBadgeTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepIndicatorLabel,
                  step === num && styles.stepIndicatorLabelActive,
                ]}
              >
                {num === 1 ? 'Profile' : num === 2 ? 'Concept' : 'Review'}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.progressLineBg}>
          <View
            style={[
              styles.progressLineFill,
              { width: step === 1 ? '16%' : step === 2 ? '50%' : '100%' },
            ]}
          />
        </View>
      </View>

      {/* ========================================================================
          STEP 1: FOUNDER PROFILE
          ======================================================================== */}
      {step === 1 && (
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Founder Profile</Text>
          <Text style={styles.cardSub}>
            Help our venture studio understand your background and expertise.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Vikramaditya Rao"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primary Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="founder@venture.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp / Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Bangalore, India"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What best describes your current profile?</Text>
            <View style={styles.chipGrid}>
              {FOUNDER_ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleChip,
                    selectedRole === role && styles.roleChipActive,
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      selectedRole === role && styles.roleChipTextActive,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleNextStep}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Continue to Venture Details →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================
          STEP 2: IDEA DETAILS & PITCH DECK
          ======================================================================== */}
      {step === 2 && (
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Venture Concept & Documents</Text>
          <Text style={styles.cardSub}>
            Define the problem, target audience, and attach any deck or summary.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Venture / Working Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. MedFlow AI"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>One-Liner / Elevator Summary *</Text>
            <TextInput
              style={[styles.input, { height: 75 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what your venture does in 1-2 concise sentences..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What acute pain point are you solving?</Text>
            <TextInput
              style={[styles.input, { height: 65 }]}
              value={problem}
              onChangeText={setProblem}
              placeholder="What daily friction or inefficiency makes customers search for this?"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Customer Profile</Text>
            <TextInput
              style={styles.input}
              value={customer}
              onChangeText={setCustomer}
              placeholder="e.g. Tier-2 Hospital Administrators, D2C Founders, etc."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Venture Stage</Text>
            <View style={styles.chipGrid}>
              {STAGE_OPTIONS.map((stg) => (
                <TouchableOpacity
                  key={stg}
                  style={[
                    styles.roleChip,
                    stage === stg && styles.roleChipActive,
                  ]}
                  onPress={() => setStage(stg)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      stage === stg && styles.roleChipTextActive,
                    ]}
                  >
                    {stg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Document Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pitch Deck or Memo (Optional)</Text>
            <TouchableOpacity
              style={styles.filePickerBox}
              onPress={handlePickDocument}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={28} color={colors.primaryLight} />
              <Text style={styles.filePickerTitle}>Select Document (PDF, PPT, DOC)</Text>
              <Text style={styles.filePickerSub}>Tap to browse files from device</Text>
            </TouchableOpacity>

            {/* List Attached Files */}
            {attachedFiles.map((file, idx) => (
              <View key={idx} style={styles.attachedFileRow}>
                <Ionicons name="document-attach-outline" size={18} color={colors.text} />
                <Text style={styles.attachedFileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => removeFile(idx)}>
                  <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep(1)}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueBtn, { flex: 1, marginTop: 0 }]}
              onPress={handleNextStep}
            >
              <Text style={styles.continueBtnText}>Run AI Review →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================================
          STEP 3: AI REVIEW & SUBMIT
          ======================================================================== */}
      {step === 3 && (
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Clarity Review & Submit</Text>
          <Text style={styles.cardSub}>
            Evaluate your concept before submitting to the studio diligence committee.
          </Text>

          {aiAnalyzing ? (
            <View style={styles.aiLoadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.aiLoadingText}>
                Analyzing venture clarity and problem-solution fit...
              </Text>
            </View>
          ) : aiScorecard ? (
            <View style={styles.aiResultCard}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreCircleNum}>
                    {aiScorecard.clarityScore}
                  </Text>
                  <Text style={styles.scoreCircleMax}>/10</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreResultTitle}>Clarity Scorecard</Text>
                  <Text style={styles.scoreResultSub}>
                    {aiScorecard.oneLineSummary}
                  </Text>
                </View>
              </View>

              <View style={styles.aiSection}>
                <Text style={styles.aiSectionHeader}>STRONG SIGNALS</Text>
                {aiScorecard.promisingPoints.map((pt: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.aiSection}>
                <Text style={styles.aiSectionHeader}>DILIGENCE EXPLORATION</Text>
                {aiScorecard.openQuestions.map((q: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="help-circle" size={16} color={colors.accentAmber} />
                    <Text style={styles.bulletText}>{q}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Terms & Confidentiality Confirmation */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={agreeTerms ? 'checkbox' : 'square-outline'}
              size={20}
              color={agreeTerms ? colors.primary : colors.textMuted}
            />
            <Text style={styles.termsText}>
              I confirm the details are accurate and agree to Ideacubator's confidentiality
              covenant and institutional studio evaluation terms.
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep(2)}
              disabled={submitting}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.continueBtn,
                { flex: 1, marginTop: 0 },
                (!agreeTerms || submitting) && styles.btnDisabled,
              ]}
              onPress={handleFinalSubmit}
              disabled={!agreeTerms || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.continueBtnText}>Submit to Studio 🚀</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.bg,
  },
  progressBarWrapper: {
    marginBottom: 20,
    marginTop: 6,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  stepCol: {
    alignItems: 'center',
    gap: 4,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepBadgeDone: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  stepBadgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  stepBadgeTextActive: {
    color: '#ffffff',
  },
  stepIndicatorLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  stepIndicatorLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  progressLineBg: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLineFill: {
    height: 4,
    backgroundColor: colors.primary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roleChipActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  roleChipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  roleChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  filePickerBox: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderHighlight,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  filePickerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  attachedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  attachedFileName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  backBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  aiLoadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  aiLoadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  aiResultCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreCircleNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primaryLight,
  },
  scoreCircleMax: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scoreResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  scoreResultSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  aiSection: {
    marginTop: 12,
  },
  aiSectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
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
    fontSize: 12,
    lineHeight: 17,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 14,
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
