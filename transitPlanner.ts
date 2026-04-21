import { transitEdges, transitNodes } from "../data/transitData";
import { JourneyPlan, JourneySegment, TransitEdge, TransitNode } from "../types/transit";

const adjacency = new Map<string, TransitEdge[]>();
const nodeLookup = new Map<string, TransitNode>();

transitNodes.forEach((node) => {
  nodeLookup.set(node.id, node);
});

transitEdges.forEach((edge) => {
  const bucket = adjacency.get(edge.from) ?? [];
  bucket.push(edge);
  adjacency.set(edge.from, bucket);
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

const normalize = (value: string) => value.trim().toLowerCase();

const parseClockOnDay = (clock: string, reference: Date): Date => {
  const [hours, minutes] = clock.split(":").map(Number);
  const copy = new Date(reference);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
};

const minutesBetween = (from: Date, to: Date) =>
  Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));

const createStateKey = (nodeId: string, currentLine: string | null) =>
  `${nodeId}::${currentLine ?? "none"}`;

const getTraversalWeight = (currentLine: string | null, edge: TransitEdge) => {
  if (edge.mode === "walk") {
    return edge.travelMinutes;
  }

  const stayingOnSameLine = currentLine === edge.line;
  const waitPenalty = stayingOnSameLine ? 0 : Math.max(2, edge.headwayMinutes / 2);
  const transferPenalty =
    currentLine && currentLine !== edge.line ? 3 : 0;

  return edge.travelMinutes + waitPenalty + transferPenalty;
};

export const formatClock = (value: Date) => timeFormatter.format(value);

export const formatMinutes = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (remainder === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
};

export const findNodeByQuery = (query: string) => {
  const normalizedQuery = normalize(query);

  return (
    transitNodes.find((node) => normalize(node.name) === normalizedQuery) ??
    transitNodes.find((node) =>
      node.aliases.some((alias) => normalize(alias) === normalizedQuery),
    )
  );
};

export const getNextDeparture = (edge: TransitEdge, after: Date) => {
  if (edge.mode === "walk") {
    return new Date(after);
  }

  const first = parseClockOnDay(edge.firstDeparture, after);
  const last = parseClockOnDay(edge.lastDeparture, after);

  if (after.getTime() <= first.getTime()) {
    return first;
  }

  if (after.getTime() > last.getTime()) {
    const tomorrow = new Date(after);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return parseClockOnDay(edge.firstDeparture, tomorrow);
  }

  const elapsed = minutesBetween(first, after);
  const departuresSinceStart = Math.ceil(elapsed / edge.headwayMinutes);
  const departure = new Date(first);
  departure.setMinutes(first.getMinutes() + departuresSinceStart * edge.headwayMinutes);

  return departure;
};

export const planTransitJourney = (
  originId: string,
  destinationId: string,
  departureTime: Date,
): JourneyPlan | null => {
  const origin = nodeLookup.get(originId);
  const destination = nodeLookup.get(destinationId);

  if (!origin || !destination) {
    return null;
  }

  if (origin.id === destination.id) {
    return {
      origin,
      destination,
      generatedAt: departureTime,
      segments: [],
      totalMinutes: 0,
      totalWalkingMinutes: 0,
      transferCount: 0,
      linesUsed: [],
      interchanges: [],
      firstBoardingStop: origin.name,
      firstBoardingMode: null,
      nextDepartureLabel: "You're already at your destination",
      reliabilityScore: 1,
    };
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, { previousKey: string | null; edge: TransitEdge | null }>();
  const queue: Array<{
    key: string;
    nodeId: string;
    currentLine: string | null;
    cost: number;
  }> = [];

  const startKey = createStateKey(origin.id, null);
  distances.set(startKey, 0);
  previous.set(startKey, { previousKey: null, edge: null });
  queue.push({ key: startKey, nodeId: origin.id, currentLine: null, cost: 0 });
  let bestDestinationKey: string | null = null;

  while (queue.length > 0) {
    queue.sort((left, right) => left.cost - right.cost);
    const current = queue.shift();

    if (!current) {
      break;
    }

    if (current.nodeId === destination.id) {
      bestDestinationKey = current.key;
      break;
    }

    if (current.cost > (distances.get(current.key) ?? Number.POSITIVE_INFINITY)) {
      continue;
    }

    const outgoing = adjacency.get(current.nodeId) ?? [];

    outgoing.forEach((edge) => {
      const nextLine = edge.mode === "walk" ? null : edge.line;
      const nextKey = createStateKey(edge.to, nextLine);
      const candidateCost =
        current.cost + getTraversalWeight(current.currentLine, edge);

      if (candidateCost < (distances.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextKey, candidateCost);
        previous.set(nextKey, { previousKey: current.key, edge });
        queue.push({
          key: nextKey,
          nodeId: edge.to,
          currentLine: nextLine,
          cost: candidateCost,
        });
      }
    });
  }

  if (!bestDestinationKey) {
    return null;
  }

  const orderedEdges: TransitEdge[] = [];
  let cursorKey = bestDestinationKey;

  while (cursorKey !== startKey) {
    const step = previous.get(cursorKey);

    if (!step?.edge || !step.previousKey) {
      return null;
    }

    orderedEdges.unshift(step.edge);
    cursorKey = step.previousKey;
  }

  const segments: JourneySegment[] = [];
  let timeline = new Date(departureTime);
  let activeLine: string | null = null;

  orderedEdges.forEach((edge) => {
    const from = nodeLookup.get(edge.from)!;
    const to = nodeLookup.get(edge.to)!;
    const stayingOnSameLine = edge.mode !== "walk" && activeLine === edge.line;
    const departure =
      edge.mode === "walk" || stayingOnSameLine
        ? new Date(timeline)
        : getNextDeparture(edge, timeline);
    const waitMinutes =
      edge.mode === "walk" || stayingOnSameLine
        ? 0
        : minutesBetween(timeline, departure);
    const arrival = new Date(departure);
    arrival.setMinutes(arrival.getMinutes() + edge.travelMinutes);
    timeline = arrival;
    activeLine = edge.mode === "walk" ? null : edge.line;

    segments.push({
      edge,
      from,
      to,
      departureTime: departure,
      arrivalTime: arrival,
      waitMinutes,
      cumulativeMinutes: minutesBetween(departureTime, arrival),
    });
  });

  const transitSegments = segments.filter((segment) => segment.edge.mode !== "walk");
  const linesUsed = Array.from(new Set(transitSegments.map((segment) => segment.edge.line)));

  let transferCount = 0;
  const interchanges: string[] = [];

  transitSegments.forEach((segment, index) => {
    const previousSegment = transitSegments[index - 1];

    if (previousSegment && previousSegment.edge.line !== segment.edge.line) {
      transferCount += 1;
      interchanges.push(segment.from.name);
    }
  });

  const firstTransitSegment = transitSegments[0] ?? null;
  const reliabilityScore =
    transitSegments.length === 0
      ? 1
      : Number(
          (
            transitSegments.reduce(
              (sum, segment) => sum + segment.edge.reliability,
              0,
            ) / transitSegments.length
          ).toFixed(2),
        );

  return {
    origin,
    destination,
    generatedAt: departureTime,
    segments,
    totalMinutes: minutesBetween(departureTime, timeline),
    totalWalkingMinutes: segments
      .filter((segment) => segment.edge.mode === "walk")
      .reduce((sum, segment) => sum + segment.edge.travelMinutes, 0),
    transferCount,
    linesUsed,
    interchanges,
    firstBoardingStop: firstTransitSegment?.from.name ?? origin.name,
    firstBoardingMode: firstTransitSegment?.edge.mode ?? null,
    nextDepartureLabel: firstTransitSegment
      ? formatClock(firstTransitSegment.departureTime)
      : "No transit boarding required",
    reliabilityScore,
  };
};
