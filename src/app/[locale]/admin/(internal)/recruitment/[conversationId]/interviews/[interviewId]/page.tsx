import { InterviewMeetingCenter } from "@/features/recruitment/components/InterviewMeetingCenter";

export default async function AdminInterviewCenterPage({
  params,
}: {
  params: Promise<{ locale: string; interviewId: string }>;
}) {
  const { locale, interviewId } = await params;
  return <InterviewMeetingCenter locale={locale} role="staff" interviewId={interviewId} />;
}
