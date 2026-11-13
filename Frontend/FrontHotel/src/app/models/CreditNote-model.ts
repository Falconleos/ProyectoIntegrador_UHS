export interface CreditNoteDtoRequest {
  accountId: number;
  amount: number;
}

export interface CreditNoteDtoResponse {
  id: number;
  accountId: number;
  amount: number;
  reason: string;
  issuedAt: string;
  paid: boolean;
  clientName?: string;
  clientLastName?: string;
  username?: string;
}