import { FormEvent, useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import TransitMap from "./components/TransitMap";
import {
  dataSourceNotes,
  DEFAULT_DESTINATION,
  DEFAULT_ORIGIN,
  transitEdges,
  transitNodes,
} from "./data/transitData";
import {
  findNodeByQuery,
  formatClock,
  formatMinutes,
  planTransitJourney,
} from "./lib/transitPlanner";
import { TransitMode, UserProfile } from "./types/transit";

const storageKey = "namma-connect-user";

const averageHeadway = Math.round(
  transitEdges
    .filter((edge) => edge.mode !== "walk")
    .reduce((sum, edge) => sum + edge.headwayMinutes, 0) /
    transitEdges.filter((edge) => edge.mode !== "walk").length,
);

const highestDemandHub = [...transitNodes].sort(
  (left, right) => right.demandScore - left.demandScore,
)[0];

const transitModes: Array<"all" | TransitMode> = ["all", "metro", "bus"];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as UserProfile) : null;
    } catch {
      return null;
    }
  });
  const [originInput, setOriginInput] = useState(DEFAULT_ORIGIN);
  const [destinationInput, setDestinationInput] = useState(DEFAULT_DESTINATION);
  const [plannedOriginId, setPlannedOriginId] = useState(
    findNodeByQuery(DEFAULT_ORIGIN)?.id ?? "koramangala",
  );
  const [plannedDestinationId, setPlannedDestinationId] = useState(
    findNodeByQuery(DEFAULT_DESTINATION)?.id ?? "whitefield",
  );
  const [activeMode, setActiveMode] = useState<"all" | TransitMode>("all");
  const [planTime, setPlanTime] = useState(() => new Date());
  const [errorMessage, setErrorMessage] = useState("");

  const routePlan = planTransitJourney(plannedOriginId, plannedDestinationId, planTime);

  useEffect(() => {
    try {
      if (user) {
        window.localStorage.setItem(storageKey, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      return;
    }
  }, [user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPlanTime(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handlePlanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const origin = findNodeByQuery(originInput);
    const destination = findNodeByQuery(destinationInput);

    if (!origin || !destination) {
      setErrorMessage(
        "Choose locations from the supported Bengaluru hubs listed in the suggestions.",
      );
      return;
    }

    setErrorMessage("");
    setPlannedOriginId(origin.id);
    setPlannedDestinationId(destination.id);
    setPlanTime(new Date());
  };

  if (!user) {
    return <LoginScreen onSubmit={handleLogin} />;
  }

  return (
    <main className="app-shell">
      <section className="top-band">
        <div>
          <p className="eyebrow">Hello, {user.name}</p>
          <h1>NammaConnect dashboard</h1>
          <p className="subtle-copy">
            See where Bengaluru transit demand clusters, then plan the fastest
            bus-and-metro chain without stitching the route together manually.
          </p>
        </div>

        <div className="top-band-actions">
          <div className="mini-stat">
            <span>Fastest model</span>
            <strong>{routePlan ? formatMinutes(routePlan.totalMinutes) : "No route"}</strong>
          </div>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </section>

      <section className="insight-strip">
        <article className="insight-card">
          <span>Busiest interchange</span>
          <strong>{highestDemandHub.name}</strong>
          <p>{highestDemandHub.description}</p>
        </article>
        <article className="insight-card">
          <span>Average service headway</span>
          <strong>{averageHeadway} min</strong>
          <p>Balanced between metro frequency and bus corridor variability.</p>
        </article>
        <article className="insight-card">
          <span>Network reach</span>
          <strong>{transitNodes.length} mapped hubs</strong>
          <p>Seeded across metro, bus, feeder, airport, and tech-corridor zones.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel-card map-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Bangalore heatmap</p>
              <h2>High-demand public transport zones</h2>
            </div>

            <div className="mode-toggle">
              {transitModes.map((mode) => (
                <button
                  key={mode}
                  className={activeMode === mode ? "mode-button active" : "mode-button"}
                  onClick={() => setActiveMode(mode)}
                  type="button"
                >
                  {mode === "all" ? "All" : mode}
                </button>
              ))}
            </div>
          </div>

          <TransitMap
            activeMode={activeMode}
            nodes={transitNodes}
            edges={transitEdges}
            routeEdges={routePlan?.segments.map((segment) => segment.edge) ?? []}
          />
        </article>

        <div className="side-stack">
          <article className="panel-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Route planner</p>
                <h2>Find the shortest public transport chain</h2>
              </div>
            </div>

            <form className="planner-form" onSubmit={handlePlanSubmit}>
              <label htmlFor="origin-input">Start location</label>
              <input
                id="origin-input"
                list="location-options"
                value={originInput}
                onChange={(event) => setOriginInput(event.target.value)}
                placeholder="Koramangala"
              />

              <label htmlFor="destination-input">Destination</label>
              <input
                id="destination-input"
                list="location-options"
                value={destinationInput}
                onChange={(event) => setDestinationInput(event.target.value)}
                placeholder="Whitefield"
              />

              <datalist id="location-options">
                {transitNodes.map((node) => (
                  <option key={node.id} value={node.name} />
                ))}
              </datalist>

              <button type="submit">Plan fastest route</button>
            </form>

            {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}

            <div className="supported-locations">
              {transitNodes.slice(0, 12).map((node) => (
                <span key={node.id}>{node.name}</span>
              ))}
            </div>
          </article>

          <article className="panel-card route-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Journey output</p>
                <h2>
                  {routePlan
                    ? `${routePlan.origin.name} to ${routePlan.destination.name}`
                    : "Journey preview"}
                </h2>
              </div>
            </div>

            {routePlan ? (
              <>
                <div className="route-summary-grid">
                  <div className="summary-chip">
                    <span>Total time</span>
                    <strong>{formatMinutes(routePlan.totalMinutes)}</strong>
                  </div>
                  <div className="summary-chip">
                    <span>Transfers</span>
                    <strong>{routePlan.transferCount}</strong>
                  </div>
                  <div className="summary-chip">
                    <span>First boarding</span>
                    <strong>{routePlan.firstBoardingStop}</strong>
                  </div>
                  <div className="summary-chip">
                    <span>Next departure</span>
                    <strong>{routePlan.nextDepartureLabel}</strong>
                  </div>
                </div>

                <div className="route-callout">
                  <p>
                    Use{" "}
                    <strong>{routePlan.linesUsed.join(" + ") || "a direct connector"}</strong>
                    {" "}to reach your destination. Expected walking time is{" "}
                    <strong>{formatMinutes(routePlan.totalWalkingMinutes)}</strong>, and the
                    route confidence is{" "}
                    <strong>{Math.round(routePlan.reliabilityScore * 100)}%</strong>.
                  </p>
                </div>

                <ol className="itinerary-list">
                  {routePlan.segments.map((segment) => (
                    <li key={segment.edge.id} className={`segment ${segment.edge.mode}`}>
                      <div className="segment-header">
                        <strong>{segment.edge.line}</strong>
                        <span>{segment.edge.mode}</span>
                      </div>
                      <p>
                        {segment.from.name} to {segment.to.name}
                      </p>
                      <p className="segment-timing">
                        Depart {formatClock(segment.departureTime)} - Arrive{" "}
                        {formatClock(segment.arrivalTime)} - Travel{" "}
                        {formatMinutes(segment.edge.travelMinutes)}
                      </p>
                      {segment.waitMinutes > 0 ? (
                        <p className="segment-wait">
                          Estimated wait before boarding: {formatMinutes(segment.waitMinutes)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>

                <div className="route-footer-note">
                  <p>
                    Planned at {formatClock(routePlan.generatedAt)}. Interchanges:
                    {" "}
                    {routePlan.interchanges.length > 0
                      ? routePlan.interchanges.join(", ")
                      : "Direct journey with no line changes"}
                  </p>
                </div>
              </>
            ) : (
              <p className="subtle-copy">
                Pick a start and destination to generate the trip chain.
              </p>
            )}
          </article>

          <article className="panel-card sources-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Open-data strategy</p>
                <h2>Ready for live feed integration</h2>
              </div>
            </div>

            <div className="source-list">
              {dataSourceNotes.map((source) => (
                <a href={source.url} key={source.label} target="_blank" rel="noreferrer">
                  <strong>{source.label}</strong>
                  <p>{source.description}</p>
                </a>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
