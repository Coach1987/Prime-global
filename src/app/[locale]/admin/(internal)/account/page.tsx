import { AdminAccountCenter } from "@/features/admin/components/AdminAccountCenter";

export default async function AdminAccountPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	return <AdminAccountCenter locale={locale} />;
}
