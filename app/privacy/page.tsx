export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto">

        <div className="mb-12">
          <div className="inline-block px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-widest">
            Echo AI
          </div>

          <h1 className="text-5xl font-black mt-6 mb-4">
            Privacy Policy
          </h1>

          <p className="text-zinc-400">
            Last updated: June 2026
          </p>
        </div>

        <div className="space-y-12">

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              1. Introduction
            </h2>

            <p className="text-zinc-300 leading-8">
              Welcome to Echo AI ("Echo AI", "we", "our", or "us"),
              operated by Nicholas Gagnon.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              This Privacy Policy explains how Echo AI collects,
              uses, stores, and protects information when you use
              our services through echosai.ca.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              2. Information We Collect
            </h2>

            <ul className="space-y-3 text-zinc-300">
              <li>• Email address and account information</li>
              <li>• Authentication provider information</li>
              <li>• Calendar events and scheduling data</li>
              <li>• Notes and content created by users</li>
              <li>• Technical information required to operate the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              3. Google Calendar Access
            </h2>

            <p className="text-zinc-300 leading-8">
              When you choose to connect your Google account,
              Echo AI may access calendar information that you
              explicitly authorize through Google OAuth.
            </p>

            <div className="mt-6 border border-cyan-500/20 rounded-2xl p-6 bg-cyan-500/5">
              <p className="text-zinc-300 mb-4">
                This access is used exclusively to:
              </p>

              <ul className="space-y-2 text-zinc-300">
                <li>• Display calendar events</li>
                <li>• Synchronize events with Google Calendar</li>
                <li>• Create events on behalf of the user</li>
                <li>• Modify existing events</li>
                <li>• Remove events when requested by the user</li>
              </ul>
            </div>

            <p className="text-zinc-300 leading-8 mt-6">
              Echo AI does not sell Google user data and does not
              use Google Calendar data for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              4. Data Storage
            </h2>

            <p className="text-zinc-300 leading-8">
              User information is stored using Supabase
              infrastructure and associated services required
              for the operation of the platform.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              Authentication tokens and synchronization data may
              be securely stored to maintain user sessions and
              calendar synchronization features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              5. Data Sharing
            </h2>

            <p className="text-zinc-300 leading-8">
              Echo AI does not sell personal information.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              Information may only be shared with service providers
              required to operate the platform or when legally required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              6. Account & Data Deletion
            </h2>

            <p className="text-zinc-300 leading-8">
              Users may request deletion of their account and
              associated data at any time.
            </p>

            <p className="text-zinc-300 leading-8 mt-4">
              Once deletion is requested, Echo AI will make
              reasonable efforts to permanently remove stored
              information associated with the account unless
              retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              7. Security
            </h2>

            <p className="text-zinc-300 leading-8">
              We take reasonable technical and organizational
              measures to protect user information against
              unauthorized access, disclosure, alteration,
              or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              8. Contact
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