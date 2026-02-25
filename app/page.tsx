import Link from "next/link";
import SliderFromAPI from "@/components/SliderFromAPI";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="card card-lg space-y-4">
        <div className="flex items-start gap-5">
          <img
            src="/tds-logo.png"
            alt="TDS — Tissage de Soleil"
            className="w-32 h-32 md:w-36 md:h-36 object-contain relative -top-1"
          />
          <h1 className="text-5xl font-semibold leading-tight">
            Textile fabriqué à Ksar Hellal — TDS{" "}
            <span className="text-2xl md:text-3xl opacity-90">(anciennement TISOL)</span>
          </h1>
          <span className="badge">Depuis 1980</span>
        </div>
        <p className="text-gray-700 max-w-3xl">
          TDS — Tissage de Soleil est une usine textile tunisienne fondée en 1980,
          spécialisée dans la fabrication de tissus, foutas, serviettes, draps,
          nappes, tapis et articles pour l’hôtellerie, les entreprises et les particuliers.
        </p>
        <div className="flex gap-3">
          <Link className="btn btn-primary" href="/shop">
            Voir la boutique
          </Link>
          <a className="btn" href="#products">
            Découvrir nos gammes
          </a>
        </div>
      </section>

      <section className="mx-[calc(50%-50vw)] w-screen">
        <SliderFromAPI />
      </section>

      <section id="products" className="space-y-3">
        <h2 className="text-2xl font-semibold">Nos gammes</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {["Fouta", "Serviettes", "Tissus", "Draps", "Nappes", "Tapis"].map((p) => (
            <li key={p} className="card">
              <p className="font-medium">{p}</p>
              <p className="text-sm text-gray-600">Fabrication & qualité industrielle.</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
