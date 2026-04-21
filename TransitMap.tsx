import { TransitEdge, TransitMode, TransitNode } from "../types/transit";

interface TransitMapProps {
  nodes: TransitNode[];
  edges: TransitEdge[];
  routeEdges: TransitEdge[];
  activeMode: "all" | TransitMode;
}

const mapWidth = 900;
const mapHeight = 620;

const bounds = {
  minLat: 12.82,
  maxLat: 13.22,
  minLng: 77.44,
  maxLng: 77.79,
};

const modeColor: Record<Exclude<TransitMode, "walk">, string> = {
  metro: "#47d7bb",
  bus: "#ffb454",
};

const projectNode = (node: TransitNode) => {
  const x =
    ((node.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * mapWidth;
  const y =
    mapHeight -
    ((node.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * mapHeight;

  return { x, y };
};

export default function TransitMap({
  nodes,
  edges,
  routeEdges,
  activeMode,
}: TransitMapProps) {
  const visibleNodes = nodes.filter((node) => {
    if (activeMode === "all") {
      return true;
    }

    return node.modes.includes(activeMode);
  });

  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => {
    if (edge.mode === "walk") {
      return false;
    }

    if (activeMode !== "all" && edge.mode !== activeMode) {
      return false;
    }

    return visibleIds.has(edge.from) && visibleIds.has(edge.to);
  });

  const highlightedEdgeIds = new Set(routeEdges.map((edge) => edge.id));
  const highlightedNodeIds = new Set(
    routeEdges.flatMap((edge) => [edge.from, edge.to]),
  );

  const labelNodes = nodes.filter(
    (node) => node.demandScore >= 72 || highlightedNodeIds.has(node.id),
  );

  return (
    <div className="map-shell">
      <svg
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="transit-map"
        role="img"
        aria-label="Stylized Bengaluru public transport heatmap"
      >
        <defs>
          <linearGradient id="city-shell" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(61, 209, 186, 0.22)" />
            <stop offset="50%" stopColor="rgba(255, 180, 84, 0.12)" />
            <stop offset="100%" stopColor="rgba(4, 16, 28, 0.9)" />
          </linearGradient>
          <filter id="soft-glow">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <path
          d="M120 80C215 35 320 55 415 72C535 92 680 102 770 210C845 299 835 440 742 520C648 596 511 595 383 572C250 548 128 503 85 402C44 306 34 145 120 80Z"
          fill="url(#city-shell)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
        />

        {visibleNodes.map((node) => {
          const point = projectNode(node);
          const glowSize = 22 + node.demandScore * 0.55;
          const fillColor =
            node.modes.includes("metro") && !node.modes.includes("bus")
              ? modeColor.metro
              : node.modes.includes("bus") && !node.modes.includes("metro")
                ? modeColor.bus
                : "#f3fffb";

          return (
            <circle
              key={`${node.id}-glow`}
              cx={point.x}
              cy={point.y}
              r={glowSize}
              fill={fillColor}
              opacity={0.08}
              filter="url(#soft-glow)"
            />
          );
        })}

        {visibleEdges.map((edge) => {
          const from = nodes.find((node) => node.id === edge.from);
          const to = nodes.find((node) => node.id === edge.to);

          if (!from || !to) {
            return null;
          }

          const start = projectNode(from);
          const end = projectNode(to);
          const isHighlighted = highlightedEdgeIds.has(edge.id);

          return (
            <line
              key={edge.id}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={modeColor[edge.mode]}
              strokeWidth={isHighlighted ? 8 : 3}
              strokeOpacity={isHighlighted ? 0.95 : 0.22}
              strokeLinecap="round"
            />
          );
        })}

        {visibleNodes.map((node) => {
          const point = projectNode(node);
          const isHighlighted = highlightedNodeIds.has(node.id);
          const fillColor =
            node.modes.includes("metro") && !node.modes.includes("bus")
              ? modeColor.metro
              : node.modes.includes("bus") && !node.modes.includes("metro")
                ? modeColor.bus
                : "#ffffff";

          return (
            <g key={node.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isHighlighted ? 9 : 6}
                fill={fillColor}
                stroke="rgba(4, 15, 24, 0.85)"
                strokeWidth="2"
              />
              {isHighlighted ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={16}
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="2"
                />
              ) : null}
            </g>
          );
        })}

        {labelNodes.map((node) => {
          const point = projectNode(node);
          return (
            <text
              key={`${node.id}-label`}
              x={point.x + 12}
              y={point.y - 10}
              className="map-label"
            >
              {node.name}
            </text>
          );
        })}
      </svg>

      <div className="map-legend">
        <span>
          <i className="legend-dot metro-dot" />
          Metro corridor
        </span>
        <span>
          <i className="legend-dot bus-dot" />
          Bus corridor
        </span>
        <span>
          <i className="legend-dot route-dot" />
          Planned fastest path
        </span>
      </div>
    </div>
  );
}

