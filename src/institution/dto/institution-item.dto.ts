export class InstitutionItemDto {
  id: string;
  name: string;
  address: string;
  city: string;
}

export class InstitutionsListResponseDto {
  success: boolean;
  message: string;
  data: InstitutionItemDto[];
}
