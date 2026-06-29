import { Group, Member, Expense, MemberBalance, Debt } from './types';

// Format currency beautifully
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Get initials of a name
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Generate random bright background color for member initials
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500', 
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 
    'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500', 
    'bg-amber-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Calculate the detailed balances for all members in the group
export function calculateBalances(group: Group): MemberBalance[] {
  const { members, expenses } = group;
  
  // Initialize balances map
  const balancesMap: Record<string, { paid: number; owes: number }> = {};
  for (const m of members) {
    balancesMap[m.id] = { paid: 0, owes: 0 };
  }

  for (const exp of expenses) {
    const { amount, payerId, recipientId, splitType, shares, isSettlement } = exp;

    // Skip if payer is no longer in the group
    if (!balancesMap[payerId]) continue;

    if (isSettlement) {
      // In a settlement, payerId pays recipientId
      // So payer's "paid" balance increases (credited)
      // recipient's "paid" balance decreases (debited) OR owes increases.
      // Settle Up treats settlements as direct offset payments.
      // To simplify: Payer gets credit (paid increases), Recipient gets debit (owes increases).
      if (recipientId && balancesMap[recipientId]) {
        balancesMap[payerId].paid += amount;
        balancesMap[recipientId].owes += amount;
      }
    } else {
      // Normal expense
      // 1. Add amount to the payer's total paid
      balancesMap[payerId].paid += amount;

      // 2. Calculate what each person owes
      if (splitType === 'equal') {
        // Find which members are included. If shares has keys, only those participate.
        // Otherwise, everyone in the group participates.
        const shareKeys = Object.keys(shares).filter(k => shares[k] > 0);
        const participants = shareKeys.length > 0 ? shareKeys : members.map(m => m.id);
        
        // Filter out any invalid participant IDs (who might have been removed)
        const validParticipants = participants.filter(id => !!balancesMap[id]);
        
        if (validParticipants.length > 0) {
          const splitAmount = amount / validParticipants.length;
          for (const pid of validParticipants) {
            balancesMap[pid].owes += splitAmount;
          }
        }
      } else if (splitType === 'unequal') {
        // Exact amounts are specified in shares[memberId]
        for (const mId of Object.keys(shares)) {
          if (balancesMap[mId]) {
            balancesMap[mId].owes += shares[mId];
          }
        }
      } else if (splitType === 'shares') {
        // Weighted shares (e.g. 1 share, 2 shares)
        const validShares = Object.entries(shares).filter(([mId, weight]) => balancesMap[mId] && weight > 0);
        const totalWeights = validShares.reduce((sum, [_, weight]) => sum + weight, 0);

        if (totalWeights > 0) {
          for (const [mId, weight] of validShares) {
            const calculatedOwe = amount * (weight / totalWeights);
            balancesMap[mId].owes += calculatedOwe;
          }
        } else {
          // Fallback to equal split among everyone if total weights is 0
          const splitAmount = amount / members.length;
          for (const m of members) {
            balancesMap[m.id].owes += splitAmount;
          }
        }
      }
    }
  }

  // Map back to output interface
  return members.map(m => {
    const bal = balancesMap[m.id] || { paid: 0, owes: 0 };
    return {
      memberId: m.id,
      paid: bal.paid,
      owes: bal.owes,
      net: Number((bal.paid - bal.owes).toFixed(2))
    };
  });
}

// Minimize Cash Flow Algorithm to simplify debts
export function simplifyDebts(group: Group): Debt[] {
  const balances = calculateBalances(group);
  
  // Separate into debtors and creditors
  // { memberId, net }
  const debtors: { id: string; net: number }[] = [];
  const creditors: { id: string; net: number }[] = [];

  for (const b of balances) {
    if (b.net < -0.01) {
      debtors.push({ id: b.memberId, net: b.net });
    } else if (b.net > 0.01) {
      creditors.push({ id: b.memberId, net: b.net });
    }
  }

  // Sort debtors in ascending order (most negative net balance first)
  debtors.sort((a, b) => a.net - b.net);
  // Sort creditors in descending order (most positive net balance first)
  creditors.sort((a, b) => b.net - a.net);

  const simplifiedDebts: Debt[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const oweAmount = Math.abs(debtor.net);
    const receiveAmount = creditor.net;

    const transferAmount = Number(Math.min(oweAmount, receiveAmount).toFixed(2));

    if (transferAmount > 0) {
      simplifiedDebts.push({
        from: debtor.id,
        to: creditor.id,
        amount: transferAmount
      });
    }

    // Update remaining balances
    debtor.net += transferAmount;
    creditor.net -= transferAmount;

    // Move pointers if fully settled
    if (Math.abs(debtor.net) < 0.01) {
      dIdx++;
    }
    if (Math.abs(creditor.net) < 0.01) {
      cIdx++;
    }
  }

  return simplifiedDebts;
}
