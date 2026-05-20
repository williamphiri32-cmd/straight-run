import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy | Straight Run" },
      {
        name: "description",
        content:
          "How Straight Run collects, uses, and protects your personal information.",
      },
    ],
  }),
});

function PrivacyPage() {
  const lastUpdated = "May 20, 2026";
  const contactEmail = "support@straight-run.app";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-8 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </nav>

      <article className="prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p>
            Straight Run ("we", "our", "the app") helps savings groups in Zambia
            manage contributions, loans, and share-outs. This policy explains
            what data we collect, how we use it, and the choices you have.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">2. Information we collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account info:</strong> email, name, and authentication
              identifiers.
            </li>
            <li>
              <strong>Group & financial records:</strong> members, contributions,
              loans, repayments, and selected payment method (MTN, Airtel,
              Zamtel, or Cash). We do not store mobile-money PINs or bank
              credentials.
            </li>
            <li>
              <strong>Device & log data:</strong> basic technical info needed to
              operate the app securely (IP, device type, error logs).
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">3. How we use your data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide and maintain the app's core features.</li>
            <li>Authenticate users and protect accounts.</li>
            <li>Display group balances, loan history, and reports.</li>
            <li>Detect abuse and comply with legal obligations.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">4. Sharing</h2>
          <p>
            We do not sell your personal data. Data is shared only with: (a)
            other members of your savings group as required by the app's
            features, and (b) infrastructure providers (hosting, database, and
            authentication) bound by confidentiality.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">5. Data retention</h2>
          <p>
            We retain account and group records for as long as your account is
            active. You can request deletion at any time by emailing us.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">6. Your rights</h2>
          <p>
            You may access, correct, export, or delete your personal data.
            Contact us using the details below to exercise these rights.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">7. Security</h2>
          <p>
            We use industry-standard measures including encryption in transit,
            row-level security on the database, and authenticated server
            endpoints. No system is 100% secure; please use a strong password
            and keep your device protected.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">8. Children</h2>
          <p>
            Straight Run is not directed to children under 13. We do not
            knowingly collect data from children.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">9. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will
            be communicated in-app or by email.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">10. Contact</h2>
          <p>
            Questions or requests? Email{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium underline"
            >
              {contactEmail}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
