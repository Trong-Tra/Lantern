export type AgentIntent = "swap" | "payment" | "bridge";

export interface DemoAgent {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly role: string;
  readonly reputation: number;
  readonly executions: number;
  readonly failures: number;
  readonly capabilities: readonly AgentIntent[];
  readonly description: string;
}

export interface IntentDefinition {
  readonly label: string;
  readonly example: string;
  readonly permission: string;
  readonly route: readonly string[];
}

export type PreviewDialogMode = "profile" | "execution";
