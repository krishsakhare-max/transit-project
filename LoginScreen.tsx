import { FormEvent, useState } from "react";
import { UserProfile } from "../types/transit";

interface LoginScreenProps {
  onSubmit: (profile: UserProfile) => void;
}

const featureNotes = [
  "See Bengaluru demand clusters at a glance",
  "Link metro and BMTC-style corridors in one route",
  "Reduce transfer guesswork with timed segments",
];

export default function LoginScreen({ onSubmit }: LoginScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim(),
    });
  };

  return (
    <main className="auth-shell">
      <section className="hero-copy">
        <div className="brand-badge">NammaConnect</div>
        <h1>Make Bengaluru public transport feel connected, not confusing.</h1>
        <p>
          This frontend prototype helps riders discover the fastest chain of metro
          and bus links between two city points, with demand-aware heat zones and
          clear interchange timing.
        </p>

        <div className="feature-grid">
          {featureNotes.map((note) => (
            <article className="feature-tile" key={note}>
              <span className="feature-index">0{featureNotes.indexOf(note) + 1}</span>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="auth-card">
        <p className="eyebrow">Login to start planning</p>
        <h2>Save your search context</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            placeholder="Krish Sakhare"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="krish@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <button type="submit">Open the transit dashboard</button>
        </form>

        <p className="helper-copy">
          The current build is a frontend MVP with a seeded Bengaluru transit graph,
          ready for later GTFS and live-feed upgrades.
        </p>
      </section>
    </main>
  );
}

