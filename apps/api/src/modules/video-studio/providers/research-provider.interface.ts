import { ResearchDTO } from "../schemas/phase2-deliverables.schema";

export interface IResearchProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  gatherResearch(topic: string, audience: string): Promise<ResearchDTO | null>;
}
