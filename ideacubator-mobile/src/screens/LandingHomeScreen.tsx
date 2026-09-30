import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface LandingHomeScreenProps {
  onNavigateToSubmit: () => void;
  onNavigateToKnowledge: () => void;
  onNavigateToTrack: () => void;
  onSignInPress: () => void;
  isAuthenticated: boolean;
  userName?: string | null;
}

export default function LandingHomeScreen({
  onNavigateToSubmit,
  onNavigateToKnowledge,
  onNavigateToTrack,
  onSignInPress,
  isAuthenticated,
  userName,
}: LandingHomeScreenProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. HERO SECTION ── */}
      <View style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#ffffff" />
            <Text style={styles.heroBadgeText}>Institutional Venture Studio</Text>
          </View>
          {!isAuthenticated && (
            <TouchableOpacity
              style={styles.signInPill}
              onPress={onSignInPress}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={15} color={colors.accentAmber} />
              <Text style={styles.signInPillText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.heroHeadline}>
          Turn Conviction into a Scalable Venture.
        </Text>

        <Text style={styles.heroSubhead}>
          Ideacubator partners with visionary founders from day zero to co-build
          production MVPs, validate hypotheses, and prepare for institutional capital.
        </Text>

        {/* Quick action buttons */}
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onNavigateToSubmit}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Submit an Idea</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onNavigateToKnowledge}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={18} color={colors.text} />
            <Text style={styles.secondaryBtnText}>Knowledge Hub</Text>
          </TouchableOpacity>
        </View>

        {/* Value pills */}
        <View style={styles.valueRow}>
          <View style={styles.valueItem}>
            <Ionicons name="checkmark-circle" size={15} color={colors.accentEmerald} />
            <Text style={styles.valueText}>100% Founder IP</Text>
          </View>
          <View style={styles.valueItem}>
            <Ionicons name="checkmark-circle" size={15} color={colors.accentEmerald} />
            <Text style={styles.valueText}>Full-Stack Builders</Text>
          </View>
          <View style={styles.valueItem}>
            <Ionicons name="checkmark-circle" size={15} color={colors.accentEmerald} />
            <Text style={styles.valueText}>No Upfront Fees</Text>
          </View>
        </View>
      </View>

      {/* ── 2. QUICK SHORTCUTS ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Explore Ideacubator</Text>
        <Text style={styles.sectionSubtitle}>
          Public resources available to everyone. Sign in anytime to track your ideas.
        </Text>
      </View>

      <View style={styles.shortcutsGrid}>
        {/* Shortcut 1: Submit */}
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={onNavigateToSubmit}
          activeOpacity={0.8}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: 'rgba(143, 63, 23, 0.2)' }]}>
            <Ionicons name="bulb-outline" size={24} color={colors.accentAmber} />
          </View>
          <View style={styles.shortcutTextCol}>
            <Text style={styles.shortcutTitle}>Submit Venture Idea</Text>
            <Text style={styles.shortcutDesc}>
              Pitch your concept with deck and market hypotheses for partner review.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Shortcut 2: Knowledge Hub */}
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={onNavigateToKnowledge}
          activeOpacity={0.8}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Ionicons name="library-outline" size={24} color="#38bdf8" />
          </View>
          <View style={styles.shortcutTextCol}>
            <View style={styles.badgeTitleRow}>
              <Text style={styles.shortcutTitle}>Knowledge Hub</Text>
              <View style={styles.publicTag}>
                <Text style={styles.publicTagText}>Public</Text>
              </View>
            </View>
            <Text style={styles.shortcutDesc}>
              Frameworks on dilution, SAFEs, AI product building, and validation.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Shortcut 3: Track Ideas */}
        <TouchableOpacity
          style={styles.shortcutCard}
          onPress={onNavigateToTrack}
          activeOpacity={0.8}
        >
          <View style={[styles.shortcutIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
            <Ionicons name="compass-outline" size={24} color="#c084fc" />
          </View>
          <View style={styles.shortcutTextCol}>
            <Text style={styles.shortcutTitle}>Track My Submissions</Text>
            <Text style={styles.shortcutDesc}>
              {isAuthenticated
                ? `Logged in as ${userName || 'Founder'}. View your live pipeline.`
                : 'Sign in to access your review status, partner chat, and documents.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── 3. HOW IT WORKS / JOURNEY ── */}
      <View style={styles.journeyCard}>
        <Text style={styles.journeyHeader}>The Ideacubator Journey</Text>
        <Text style={styles.journeySub}>
          From raw spark to institutionally verified MVP in 4 structured milestones.
        </Text>

        <View style={styles.timeline}>
          {/* Step 1 */}
          <View style={styles.timelineItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Concept Submission</Text>
              <Text style={styles.stepDesc}>
                Submit your problem statement, target persona, and product thesis.
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.timelineItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Partner Diligence &amp; AI Analysis</Text>
              <Text style={styles.stepDesc}>
                Structured review on unit economics, technical feasibility, and TAM.
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.timelineItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Co-Building the MVP</Text>
              <Text style={styles.stepDesc}>
                Dedicated studio engineers and AI architects build your core product.
              </Text>
            </View>
          </View>

          {/* Step 4 */}
          <View style={styles.timelineItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Launch &amp; Institutional Scale</Text>
              <Text style={styles.stepDesc}>
                Customer acquisition engine and direct introductions to top venture funds.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── 4. TRUST & DISCLAIMER ── */}
      <View style={styles.trustBanner}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.accentEmerald} />
        <Text style={styles.trustText}>
          Non-disclosure by default. All intellectual property, code, and patents remain 100% founder-owned.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(143, 63, 23, 0.25)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  signInPillText: {
    color: colors.accentAmber,
    fontSize: 12,
    fontWeight: '600',
  },
  heroHeadline: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 10,
  },
  heroSubhead: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  shortcutsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  shortcutIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTextCol: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  shortcutTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  publicTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  publicTagText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  shortcutDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  journeyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 20,
  },
  journeyHeader: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  journeySub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  timeline: {
    gap: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  trustText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
