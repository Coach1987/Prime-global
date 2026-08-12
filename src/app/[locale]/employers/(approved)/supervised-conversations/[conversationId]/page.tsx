import { ConversationDetail } from "@/features/recruitment/components/ConversationDetail";

export default async function EmployerSupervisedConversationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; conversationId: string }>;
}) {
  const { locale, conversationId } = await params;
  return <ConversationDetail locale={locale} role="employer" conversationId={conversationId} />;
}