export type TransitMode = "metro" | "bus" | "walk";
export type NodeKind = "metro" | "bus" | "interchange" | "place";

export interface TransitNode {
  id: string;
  name: string;
  kind: NodeKind;
  lat: number;
  lng: number;
  zone: string;
  demandScore: number;
  description: string;
  modes: TransitMode[];
  aliases: string[];
}

export interface TransitEdge {
  id: string;
  from: string;
  to: string;
  mode: TransitMode;
  line: string;
  travelMinutes: number;
  headwayMinutes: number;
  firstDeparture: string;
  lastDeparture: string;
  reliability: number;
}

export interface JourneySegment {
  edge: TransitEdge;
  from: TransitNode;
  to: TransitNode;
  departureTime: Date;
  arrivalTime: Date;
  waitMinutes: number;
  cumulativeMinutes: number;
}

export interface JourneyPlan {
  origin: TransitNode;
  destination: TransitNode;
  generatedAt: Date;
  segments: JourneySegment[];
  totalMinutes: number;
  totalWalkingMinutes: number;
  transferCount: number;
  linesUsed: string[];
  interchanges: string[];
  firstBoardingStop: string;
  firstBoardingMode: TransitMode | null;
  nextDepartureLabel: string;
  reliabilityScore: number;
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface DataSourceNote {
  label: string;
  url: string;
  description: string;
}

