export class FaqItemEntity {
  id: string;
  institutionId: string | null;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;

  constructor(partial: Partial<FaqItemEntity>) {
    Object.assign(this, partial);
  }
}

