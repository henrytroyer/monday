import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard, PageHeader } from '../components/FormCard';
import {
  COORDINATOR_EMAIL,
  GUIDE_FACTS,
  GUIDE_LOCATIONS,
  GUIDE_TESTIMONIAL,
  GUIDE_VALUES,
} from '../lib/volunteerGuide';

export function VolunteerInfoScreen({
  me,
  onBack,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
}) {
  return (
    <div className="pb-20">
      <BackButton onClick={onBack} />
      <PageHeader
        eyebrow="My Info"
        title="What to expect"
        description="Facts for the field, plus your personal record."
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <FormCard>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
            Your record
          </h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-crm-slate">Name</dt>
              <dd className="font-medium text-navy">{me.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-crm-slate">Email</dt>
              <dd className="max-w-[60%] text-right font-medium text-navy">
                {me.email}
              </dd>
            </div>
          </dl>
        </FormCard>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand/70">
          <img
            src="/brand/volunteer.jpg"
            alt=""
            className="h-48 w-full object-cover"
          />
          <div className="p-5">
            <p className="font-display text-2xl font-semibold text-navy">
              Walk alongside refugees
            </p>
            <p className="mt-2 text-sm leading-relaxed text-crm-slate">
              Support refugees through practical help and genuine relationships,
              motivated by love.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
            Fast facts
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {GUIDE_FACTS.map((fact) => (
              <article
                key={fact.title}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand/70"
              >
                <h3 className="font-semibold text-navy">{fact.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-crm-slate">
                  {fact.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
            Our values
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {GUIDE_VALUES.map((value) => (
              <li
                key={value.title}
                title={value.detail}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-navy ring-1 ring-sand/80"
              >
                {value.title}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
            Locations
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {GUIDE_LOCATIONS.map((place) => (
              <article
                key={place.title}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand/70"
              >
                <img src={place.photo} alt="" className="h-36 w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-semibold text-navy">{place.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-crm-slate">
                    {place.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <blockquote className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-sand/70">
          <p className="text-base leading-relaxed text-navy">
            “{GUIDE_TESTIMONIAL.quote}”
          </p>
          <footer className="mt-3 text-sm text-crm-slate">
            {GUIDE_TESTIMONIAL.attribution}
          </footer>
        </blockquote>
      </div>

      <a
        href={`mailto:${COORDINATOR_EMAIL}`}
        className="fixed bottom-5 right-5 z-20 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-navy-dark"
      >
        Questions? Message us
      </a>
    </div>
  );
}
