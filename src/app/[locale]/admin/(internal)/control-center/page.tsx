import { StaffRecruitmentCenter } from "@/features/recruitment/components/StaffRecruitmentCenter";

export default async function AdminControlCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StaffRecruitmentCenter locale={locale} />;
}
