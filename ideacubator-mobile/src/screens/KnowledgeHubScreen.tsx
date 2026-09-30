import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking
} from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface StageItem {
  id: string;
  no: string;
  title: string;
  sub: string;
  icon: string;
  summary: string;
  deliverables: string[];
  keyQuestion: string;
  metrics: string[];
}

const STAGES: StageItem[] = [
  {
    id: 'idea',
    no: '01',
    title: 'Idea',
    sub: 'Discover & Validate',
    icon: 'bulb-outline',
    summary:
      'Transform raw founder observation into an acute, validated problem statement before committing time or code.',
    keyQuestion: 'Does this problem cause intense daily friction that buyers actively spend money to fix?',
    deliverables: [
      'Problem-hypothesis canvas & customer persona',
      '15+ recorded customer discovery interviews',
      'Evidence of current workarounds and expenditure'
    ],
    metrics: ['Interview-to-pain validation rate (>70%)', 'Urgency score (Must-have vs nice-to-have)']
  },
  {
    id: 'pitch',
    no: '02',
    title: 'Pitch',
    sub: '5-Box Story',
    icon: 'disc-outline',
    summary:
      'Distill your venture into a concise, undeniable narrative that excites co-founders, early hires, and venture partners.',
    keyQuestion: 'Why this team, why now, and why will this become a $100M+ enterprise category leader?',
    deliverables: [
      '5-Box Pitch memo (Problem, Solution, Moat, Market, Team)',
      '10-slide institutional diligence deck',
      '2-minute video founder demo or Loom walkthrough'
    ],
    metrics: ['Deck review engagement rate', 'Clarity score across non-technical stakeholders']
  },
  {
    id: 'plan',
    no: '03',
    title: 'Plan',
    sub: 'Architecture & Capital',
    icon: 'document-text-outline',
    summary:
      'Architect a realistic 18-month capitalization, milestone timeline, and core unit economics model.',
    keyQuestion: 'What are the 3 critical de-risking milestones required before raising external venture capital?',
    deliverables: [
      '18-month hiring & engineering roadmap',
      'Pre-seed / Seed cap table & capitalization budget',
      'Go-to-market experiment matrix'
    ],
    metrics: ['Runway in months (>14 mo)', 'Burn rate vs milestone velocity']
  },
  {
    id: 'prototype',
    no: '04',
    title: 'Prototype',
    sub: 'Lean MVP',
    icon: 'cube-outline',
    summary:
      'Build the thinnest slice of product that delivers undeniable proof-of-value to your first 10 customers.',
    keyQuestion: 'Can customers extract immediate utility without needing months of feature bloat?',
    deliverables: [
      'High-fidelity interactive prototype / demo',
      'End-to-end user journey with telemetry',
      'Pilot customer feedback loop'
    ],
    metrics: ['Time-to-first-value (<5 minutes)', 'Core workflow completion rate (>65%)']
  },
  {
    id: 'launch',
    no: '05',
    title: 'Launch',
    sub: 'Go-to-Market',
    icon: 'rocket-outline',
    summary:
      'Deploy the repeatable acquisition channel and onboard high-conviction reference clients.',
    keyQuestion: 'How will you acquire your first 50 customers profitably without burning paid ad capital?',
    deliverables: [
      'Design partner agreements and reference case studies',
      'Outbound SDR playbook or organic distribution loop',
      'Customer success onboarding protocol'
    ],
    metrics: ['Customer Acquisition Cost (CAC)', 'Activation rate (% completing onboard)']
  },
  {
    id: 'grow',
    no: '06',
    title: 'Grow',
    sub: 'Scale & Optimize',
    icon: 'trending-up-outline',
    summary:
      'Scale unit economics, expand net revenue retention, and secure institutional Series A capitalization.',
    keyQuestion: 'Are existing customers expanding usage and referring adjacent peers?',
    deliverables: [
      'Data room for institutional diligence',
      'Audited unit economics & cohort retention model',
      'Scalable management and leadership tier'
    ],
    metrics: ['Net Revenue Retention (>115%)', 'LTV / CAC Ratio (>3.5x)']
  }
];

export default function KnowledgeHubScreen() {
  const [expandedId, setExpandedId] = useState<string>('idea');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? '' : id);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>VENTURE PLAYBOOK</Text>
        <Text style={styles.headerTitle}>Knowledge Hub</Text>
        <Text style={styles.headerSub}>
          The 6 institutional milestones from problem discovery to institutional Series A.
        </Text>
      </View>

      {/* Stage Cards */}
      <View style={styles.stagesList}>
        {STAGES.map((stage) => {
          const isExpanded = expandedId === stage.id;
          return (
            <View key={stage.id} style={styles.stageCard}>
              <TouchableOpacity
                style={styles.stageCardHeader}
                onPress={() => toggleExpand(stage.id)}
                activeOpacity={0.8}
              >
                <View style={styles.stageBadge}>
                  <Text style={styles.stageNo}>{stage.no}</Text>
                </View>

                <View style={styles.stageHeaderInfo}>
                  <Text style={styles.stageTitle}>{stage.title}</Text>
                  <Text style={styles.stageSub}>{stage.sub}</Text>
                </View>

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.stageContent}>
                  <Text style={styles.stageSummary}>{stage.summary}</Text>

                  {/* Core Invariant */}
                  <View style={styles.questionBox}>
                    <Ionicons name="help-circle" size={18} color={colors.accentAmber} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.questionLabel}>CRITICAL VALIDATION QUESTION</Text>
                      <Text style={styles.questionText}>{stage.keyQuestion}</Text>
                    </View>
                  </View>

                  {/* Key Deliverables */}
                  <View style={styles.deliverablesSection}>
                    <Text style={styles.sectionHeader}>CORE DELIVERABLES</Text>
                    {stage.deliverables.map((item, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="checkmark-done" size={16} color={colors.accentGreen} />
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Target Metrics */}
                  <View style={styles.deliverablesSection}>
                    <Text style={styles.sectionHeader}>SUCCESS METRICS</Text>
                    {stage.metrics.map((m, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="analytics-outline" size={16} color={colors.primaryLight} />
                        <Text style={styles.bulletText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Diligence FAQs */}
      <View style={styles.faqCard}>
        <View style={styles.faqHeader}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.primaryLight} />
          <Text style={styles.faqTitle}>Studio Diligence FAQ</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>How does Ideacubator evaluate submissions?</Text>
          <Text style={styles.faqA}>
            We screen for founder-problem fit, acute daily buyer pain, and market velocity.
            Ideas with validated customer discovery and clear distribution clarity receive
            priority diligence invitations.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Is my pitch deck confidential?</Text>
          <Text style={styles.faqA}>
            Yes. Every submission is protected under strict studio confidentiality covenants.
            Your intellectual property and proprietary insights remain 100% yours.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: colors.bg,
  },
  header: {
    marginBottom: 20,
    marginTop: 6,
  },
  eyebrow: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  stagesList: {
    gap: 12,
    marginBottom: 24,
  },
  stageCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  stageBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNo: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '800',
  },
  stageHeaderInfo: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  stageSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stageContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  stageSummary: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  questionBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  questionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentAmber,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  questionText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  deliverablesSection: {
    marginTop: 10,
  },
  sectionHeader: {
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
    marginBottom: 6,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  faqItem: {
    marginBottom: 14,
  },
  faqQ: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  faqA: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
