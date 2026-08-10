declare const currencyCodeBrand: unique symbol;
declare const goalIdBrand: unique symbol;
declare const transactionIdBrand: unique symbol;

export type CurrencyCode = string & {
  readonly [currencyCodeBrand]: "CurrencyCode";
};

export type GoalId = string & { readonly [goalIdBrand]: "GoalId" };
export type TransactionId = string & {
  readonly [transactionIdBrand]: "TransactionId";
};

export type TransactionKind = "opening" | "deposit" | "withdrawal";

export interface Goal {
  readonly id: GoalId;
  readonly name: string;
  readonly targetMinorUnits: number;
  readonly currency: CurrencyCode;
  readonly withdrawalWarningPercent: number;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly iconDataUrl?: string;
}

export interface Transaction {
  readonly id: TransactionId;
  readonly goalId: GoalId;
  readonly kind: TransactionKind;
  readonly amountMinorUnits: number;
  readonly occurredAt: string;
  readonly reason?: string;
}

export interface SavingsState {
  readonly goals: readonly Goal[];
  readonly transactions: readonly Transaction[];
}
