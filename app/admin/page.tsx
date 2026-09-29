import { notFound } from 'next/navigation';

export default function AdminPage() {
  // Directly trigger 404 - standard route disabled for security
  notFound();
}
