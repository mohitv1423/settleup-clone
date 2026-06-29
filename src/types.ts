export interface Member {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  payerId: string; // The member who paid
  recipientId?: string; // Only used if isSettlement is true
  splitType: 'equal' | 'unequal' | 'shares';
  // for 'equal': keys in shares represent participants (value of 1 means participates)
  // for 'unequal': memberId -> exact amount owed
  // for 'shares': memberId -> weight/ratio of the split
  shares: Record<string, number>; 
  category: string;
  isSettlement: boolean; // true if direct payment from person A to person B
  notes?: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
  createdAt: string;
}

export interface Debt {
  from: string; // memberId
  to: string; // memberId
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  paid: number;
  owes: number;
  net: number; // paid - owes
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}
