export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <div className="inline-block px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-widest">
            Echo AI
          </div>

          <h1 className="text-5xl font-black mt-6 mb-4">
            Terms of Service
          </h1>

          <p className="text-zinc-400">
            Last updated: June 2026
          </p>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              1. Acceptance of Terms
            </h2>

            <p className="text-zinc-300 leading-8">
              By accessing or using Echo AI, you agree to be bound by
              these Terms of Service. If you do not agree with these
              terms, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              2. Description of Service
            </h2>

            <p className="text-zinc-300 leading-8">
              Echo AI is a productivity and planning platform that may
              provide note management, scheduling features, calendar
              synchronization, and AI-assisted tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              3. User Accounts
            </h2>

            <p className="text-zinc-300 leading-8">
              Users are responsible for maintaining the security of
              their accounts and authentication credentials.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              You are responsible for all activities that occur under
              your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              4. Google Calendar Integration
            </h2>

            <p className="text-zinc-300 leading-8">
              When authorized by the user, Echo AI may access and
              synchronize Google Calendar data in accordance with the
              permissions granted through Google OAuth.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              Users may revoke Google access at any time through their
              Google account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              5. Acceptable Use
            </h2>

            <p className="text-zinc-300 leading-8">
              Users agree not to:
            </p>

            <ul className="mt-4 space-y-3 text-zinc-300">
              <li>• Violate applicable laws or regulations.</li>
              <li>• Attempt unauthorized access to the platform.</li>
              <li>• Interfere with the operation or security of the service.</li>
              <li>• Use the service for harmful or abusive activities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              6. Data Deletion
            </h2>

            <p className="text-zinc-300 leading-8">
              Users may request deletion of their account and
              associated data at any time.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              Upon deletion, Echo AI will make reasonable efforts to
              permanently remove user information unless retention is
              required by law or security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              7. Disclaimer
            </h2>

            <p className="text-zinc-300 leading-8">
              Echo AI is provided on an "as is" and "as available"
              basis without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              8. Limitation of Liability
            </h2>

            <p className="text-zinc-300 leading-8">
              To the maximum extent permitted by law, Echo AI and its
              operator shall not be liable for indirect, incidental,
              special, consequential, or punitive damages resulting
              from the use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              9. Changes to These Terms
            </h2>

            <p className="text-zinc-300 leading-8">
              We may modify these Terms of Service at any time.
              Updated versions will be published on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              10. Contact Information
            </h2>

            <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
              <p className="text-zinc-300">
                <strong>Operator:</strong> Nicholas Gagnon
              </p>

              <p className="text-zinc-300 mt-2">
                <strong>Country:</strong> Canada
              </p>

              <p className="text-cyan-400 mt-2 font-semibold">
                support@echosai.ca
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}