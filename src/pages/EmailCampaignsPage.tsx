/**
 * EmailCampaignsPage.tsx — Communications → Email campaigns.
 */

export default function EmailCampaignsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-4xl font-semibold text-crm-heading">
          Email campaigns
        </h1>
        <p className="mt-2 text-crm-slate">
          Plan and send email campaigns to volunteers, donors, and prospects.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-crm-taupe/28 bg-crm-surface p-6 text-crm-slate">
        <p className="text-sm font-medium text-crm-heading">Coming next</p>
        <p className="mt-2 text-sm">
          Campaign drafts, audience lists, and send history will live here.
          Permission keys for view / create / send are already in CRM roles.
        </p>
      </div>
    </div>
  );
}
