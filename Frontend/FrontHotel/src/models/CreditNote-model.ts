
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
}