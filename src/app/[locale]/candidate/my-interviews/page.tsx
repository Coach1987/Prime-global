import { ConversationCenter } from "@/features/recruitment/components/ConversationCenter";

export default async function CandidateMyInterviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ConversationCenter locale={locale} role="candidate" detailBasePath={`/${locale}/candidate/supervised-conversations`} />;
}
