import { Link } from "@/i18n/routing";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Prime Global Interview Portal</h1>
        <p className="mt-3 text-sm text-text-secondary">Secure access for candidates, employers, and Prime Global staff.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Candidate</h2>
            <p className="mt-2 text-sm text-text-secondary">View My Interviews, invitations, waiting room, and protected meeting access.</p>
            <Link href="/candidate/login" className="mt-4 inline-flex rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">Open My Interviews</Link>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Employer</h2>
            <p className="mt-2 text-sm text-text-secondary">Access Interview Center, schedule flow, and supervised protected communications.</p>
            <Link href="/employers/login" className="mt-4 inline-flex rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">Open Interview Center</Link>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Prime Global Staff</h2>
            <p className="mt-2 text-sm text-text-secondary">Open Control Center for moderation, supervision, and interview room governance.</p>
            <Link href="/admin/login" className="mt-4 inline-flex rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">Open Control Center</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
