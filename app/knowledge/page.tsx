import type { Metadata } from 'next';
import KnowledgeHubClient from '@/components/KnowledgeHubClient';

export const metadata: Metadata = {
  title: 'Knowledge Center — Practical Founder Resources | Ideacubator',
  description:
    'Practical founder resources from Ideacubator: prepare your idea, validate the problem, build a pitch, plan your startup roadmap, build an MVP, launch to market, and scale with conviction.',
  openGraph: {
    title: 'Knowledge Center — Ideacubator',
    description:
      'Practical founder resources: prepare your idea, craft your pitch, plan milestones, build an MVP, launch to market, and scale.',
    images: ['/assets/knowledge-hero.jpg']
  }
};

export default function KnowledgePage() {
  return (
    <main className="kh-page">
      <KnowledgeHubClient />
    </main>
  );
}
