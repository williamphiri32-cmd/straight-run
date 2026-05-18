import { differenceInCalendarDays } from "date-fns";

export type LoanLike = {
  principal: number | string;
  interest_rate: number | string;
  due_date: string | null;
  status: string;
  penalty_rate?: number | string | null;
  penalty_period_days?: number | null;
};

export function computeLoanStats(loan: LoanLike, repaid: number, today = new Date()) {
  const principal = Number(loan.principal);
  const interestRate = Number(loan.interest_rate) / 100;
  const interest = principal * interestRate;
  const baseOwed = principal + interest;

  let daysOverdue = 0;
  let periodsOverdue = 0;
  let penalty = 0;

  if (loan.due_date && loan.status !== "paid") {
    const due = new Date(loan.due_date);
    daysOverdue = Math.max(0, differenceInCalendarDays(today, due));
    const periodDays = Math.max(1, loan.penalty_period_days ?? 7);
    periodsOverdue = Math.floor(daysOverdue / periodDays);
    const penaltyRate = Number(loan.penalty_rate ?? 0);
    const outstandingBeforePenalty = Math.max(0, baseOwed - repaid);
    penalty = outstandingBeforePenalty * penaltyRate * periodsOverdue;
  }

  const totalOwed = Math.max(0, baseOwed + penalty - repaid);
  return {
    principal,
    interest,
    baseOwed,
    repaid,
    daysOverdue,
    periodsOverdue,
    penalty,
    totalOwed,
    isOverdue: daysOverdue > 0,
    fullyPaid: totalOwed === 0,
  };
}

export function projectShareOut(
  memberContribution: number,
  groupTotalContribution: number,
  groupPool: number,
) {
  if (groupTotalContribution <= 0) return 0;
  return (memberContribution / groupTotalContribution) * groupPool;
}
