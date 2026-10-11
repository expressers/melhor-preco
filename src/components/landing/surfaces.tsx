import type { Surface } from "@/lib/types";

/** Initial commercial surfaces, read from the data layer (BRIEF §3.3). */
export function Surfaces({ active, upcoming }: { active: Surface[]; upcoming: Surface[] }) {
  return (
    <section aria-labelledby="superficies" className="border-y border-line bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 id="superficies" className="max-w-[18ch] text-3xl sm:text-[2.75rem]">
          Onde os nossos agentes já estão
        </h2>

        <ul className="mt-10 border-t border-ink md:mt-14">
          {active.map((s) => (
            <li
              key={s.id}
              className="grid gap-1 border-b border-line py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,2fr)_minmax(0,5fr)] md:items-baseline md:gap-6"
            >
              <h3 className="text-2xl sm:text-[2rem]">{s.name}</h3>
              <p className="font-mono text-sm tracking-wide text-ink uppercase">{s.area}</p>
              <p className="text-ink-2 md:text-right">{s.location}</p>
            </li>
          ))}
        </ul>

        {upcoming.length > 0 && (
          <p className="measure mt-8 leading-relaxed text-ink-2">
            A seguir:{" "}
            {upcoming.map((s, i) => (
              <span key={s.id}>
                <span className="text-ink">{s.name}</span> ({s.area})
                {i < upcoming.length - 2 ? ", " : i === upcoming.length - 2 ? " e " : "."}
              </span>
            ))}{" "}
            Outras superfícies entram à medida que a rede de agentes cresce.
          </p>
        )}
      </div>
    </section>
  );
}
