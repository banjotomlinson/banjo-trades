export interface Step {
  id: string;
  text: string;
}

export interface Plan {
  id: string;
  title: string;
  steps: Step[];      // Trade plan steps
  risk: Step[];       // Risk management rules
  createdAt: string;
  updatedAt: string;
}
