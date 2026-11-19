export class RequirementEntity {
  id: string;
  institutionId: string | null;
  title: string;
  description: string;
  isImmediateDisqualification: boolean;
  category: string;
  displayOrder: number;

  constructor(partial: Partial<RequirementEntity>) {
    Object.assign(this, partial);
  }
}
