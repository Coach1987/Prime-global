import { ConversationCenter } from "@/features/recruitment/components/ConversationCenter";

export default async function EmployerSupervisedConversationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ConversationCenter locale={locale} role="employer" detailBasePath={`/${locale}/employers/supervised-conversations`} />;
}