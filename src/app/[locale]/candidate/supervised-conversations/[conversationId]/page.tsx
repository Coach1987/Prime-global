import { ConversationDetail } from "@/features/recruitment/components/ConversationDetail";

export default async function CandidateSupervisedConversationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; conversationId: string }>;
}) {
  const { locale, conversationId } = await params;
  return <ConversationDetail locale={locale} role="candidate" conversationId={conversationId} />;
}