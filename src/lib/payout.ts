// End-of-cycle payout calculation.
// Profit pool per month = loan interest + penalties collected that month.
// Each member's monthly profit share = (their contribution that month /
// total group contribution that month) × monthly profit pool.

export type ContribRow = {
  member_id: string;
  amount: number | string;
  contribution_date: string;
};

export type RepaymentRow = {
  loan_id: string;
  amount: number | string;
  paid_date: string;
};

export type LoanRow = {
  id: string;
  principal: number | string;
  interest_rate: number | string;
  penalty_rate?: number | string | null;
};

const monthKey = (d: string) => d.slice(0, 7); // YYYY-MM

export type MemberPayout = {
  member_id: string;
  contributions: number;
  profit: number;
  total: number;
};

export function computeCyclePayouts(
  members: Array<{ id: string }>,
  contributions: ContribRow[],
  repayments: RepaymentRow[],
  loans: LoanRow[],
): { perMember: MemberPayout[]; totalContributions: number; totalProfit: number } {
  const loanById = new Map(loans.map((l) => [l.id, l]));

  // Per repayment, profit portion = amount × (interest+penalty) / (principal+interest+penalty)
  // This proportionally allocates each payment between principal recovery and profit.
  const monthlyProfit = new Map<string, number>();
  for (const r of repayments) {
    const loan = loanById.get(r.loan_id);
    if (!loan) continue;
    const principal = Number(loan.principal) || 0;
    const interest = principal * (Number(loan.interest_rate) || 0) / 100;
    // Penalty handling: penalty_rate is per overdue period; we conservatively
    // treat penalty collected as zero unless captured in repayment amount that
    // exceeds principal+interest. Approximate by allocating proportionally.
    const totalDue = principal + interest;
    if (totalDue <= 0) continue;
    const profitShare = (Number(r.amount) || 0) * (interest / totalDue);
    const key = monthKey(r.paid_date);
    monthlyProfit.set(key, (monthlyProfit.get(key) ?? 0) + profitShare);
  }

  // Per month: total contributions and per-member contributions
  const monthlyTotalContrib = new Map<string, number>();
  const monthlyMemberContrib = new Map<string, Map<string, number>>();
  for (const c of contributions) {
    const key = monthKey(c.contribution_date);
    const amt = Number(c.amount) || 0;
    monthlyTotalContrib.set(key, (monthlyTotalContrib.get(key) ?? 0) + amt);
    let mm = monthlyMemberContrib.get(key);
    if (!mm) {
      mm = new Map();
      monthlyMemberContrib.set(key, mm);
    }
    mm.set(c.member_id, (mm.get(c.member_id) ?? 0) + amt);
  }

  // Per-member totals
  const memberContribTotal = new Map<string, number>();
  for (const c of contributions) {
    const amt = Number(c.amount) || 0;
    memberContribTotal.set(
      c.member_id,
      (memberContribTotal.get(c.member_id) ?? 0) + amt,
    );
  }

  const memberProfit = new Map<string, number>();
  for (const [month, pool] of monthlyProfit) {
    const groupTotal = monthlyTotalContrib.get(month) ?? 0;
    if (groupTotal <= 0 || pool <= 0) continue;
    const mm = monthlyMemberContrib.get(month);
    if (!mm) continue;
    for (const [memberId, memberAmt] of mm) {
      const share = (memberAmt / groupTotal) * pool;
      memberProfit.set(memberId, (memberProfit.get(memberId) ?? 0) + share);
    }
  }

  const perMember: MemberPayout[] = members.map((m) => {
    const c = memberContribTotal.get(m.id) ?? 0;
    const p = memberProfit.get(m.id) ?? 0;
    return {
      member_id: m.id,
      contributions: c,
      profit: p,
      total: c + p,
    };
  });

  const totalContributions = perMember.reduce((a, m) => a + m.contributions, 0);
  const totalProfit = perMember.reduce((a, m) => a + m.profit, 0);
  return { perMember, totalContributions, totalProfit };
}
