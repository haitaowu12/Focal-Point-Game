export const SHARED_MODEL_FIELDS = [
  { id: "vision", name: "Vision", group: "border" },
  { id: "scope", name: "Scope", group: "border" },
  { id: "logisticalConstraints", name: "Logistical Constraints", group: "border" },
  { id: "resourcesKnowledge", name: "Resources & Knowledge", group: "border" },
  { id: "internalStakeholders", name: "Internal Stakeholders", group: "border" },
  { id: "externalStakeholders", name: "External Stakeholders", group: "border" },
  { id: "rationale", name: "Rationale", group: "core" },
  { id: "asIsState", name: "As-Is State", group: "core" },
  { id: "strategy", name: "Strategy", group: "core" },
  { id: "teamGovernance", name: "Team Governance", group: "core" },
  { id: "kpis", name: "KPIs", group: "core" },
  { id: "responsibleAccountable", name: "Responsible/Accountable", group: "core" },
  { id: "successCriteria", name: "Success Criteria", group: "core" },
];

export const BOARD_LAYOUT = [
  ["", "", "vision", "", "scope"],
  ["logisticalConstraints", "rationale", "asIsState", "strategy", "resourcesKnowledge"],
  ["internalStakeholders", "teamGovernance", "kpis", "responsibleAccountable", "externalStakeholders"],
  ["", "", "successCriteria", "", ""],
];
