import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { AuditService } from './auditService';

export interface OpenSessionParams {
  shopId: string;
  cashierId: string;
  openingFloat: number;
  notes?: string;
}

export interface CloseSessionParams {
  shopId: string;
  sessionId: string;
  closingCashCounted: number;
  closedBy: string;
  notes?: string;
}

export class CashSessionService {
  /**
   * Generates a sequential, audit-compliant session number: CS-YYYYMMDD-XXXX
   */
  public static async generateSessionNumber(
    shopId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `CS-${dateStr}-`;

    try {
      const [seq] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('cash_session_number_seq') AS nextval
      `;
      return `${prefix}${String(seq.nextval).padStart(4, '0')}`;
    } catch {
      const lastSession = await tx.cashSession.findFirst({
        where: { shopId, sessionNumber: { startsWith: prefix } },
        orderBy: { sessionNumber: 'desc' },
      });
      let nextSeq = 1;
      if (lastSession?.sessionNumber) {
        const parts = lastSession.sessionNumber.split('-');
        const parsed = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(parsed)) nextSeq = parsed + 1;
      }
      return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }
  }

  /**
   * Opens a new till shift cash session for a cashier.
   */
  public static async openSession(params: OpenSessionParams) {
    const { shopId, cashierId, openingFloat, notes } = params;

    if (openingFloat < 0) {
      throw new ValidationError('Opening float cannot be negative.');
    }

    return await prisma.$transaction(async (tx) => {
      // Check if cashier already has an active open session
      const existing = await tx.cashSession.findFirst({
        where: { shopId, cashierId, status: 'open' },
      });

      if (existing) {
        return existing;
      }

      const sessionNumber = await this.generateSessionNumber(shopId, tx);

      const session = await tx.cashSession.create({
        data: {
          shopId,
          cashierId,
          sessionNumber,
          status: 'open',
          openingFloat: new Prisma.Decimal(openingFloat),
          notes,
        },
      });

      await AuditService.log(
        {
          shopId,
          actorUserId: cashierId,
          action: 'CASH_SESSION_OPENED',
          entityType: 'cash_session',
          entityId: session.id,
          newValues: {
            sessionNumber,
            openingFloat,
          },
        },
        tx
      );

      return session;
    });
  }

  /**
   * Retrieves the active session and live drawer telemetry for a cashier.
   */
  public static async getCurrentSessionTelemetry(shopId: string, cashierId: string) {
    const session = await prisma.cashSession.findFirst({
      where: { shopId, cashierId, status: 'open' },
      include: {
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Fetch payments tied to this session
    const payments = await prisma.payment.findMany({
      where: {
        shopId,
        cashSessionId: session.id,
      },
    });

    let cashTotal = new Prisma.Decimal(0);
    let telebirrTotal = new Prisma.Decimal(0);
    let cbeBirrTotal = new Prisma.Decimal(0);
    let otherTotal = new Prisma.Decimal(0);

    for (const p of payments) {
      if (p.method === 'cash') cashTotal = cashTotal.add(p.amount);
      else if (p.method === 'telebirr') telebirrTotal = telebirrTotal.add(p.amount);
      else if (p.method === 'cbe_birr') cbeBirrTotal = cbeBirrTotal.add(p.amount);
      else otherTotal = otherTotal.add(p.amount);
    }

    const expectedCash = session.openingFloat.add(cashTotal);

    return {
      session,
      liveTelemetry: {
        openingFloatETB: session.openingFloat.toNumber(),
        cashNetMovementETB: cashTotal.toNumber(),
        telebirrTotalETB: telebirrTotal.toNumber(),
        cbeBirrTotalETB: cbeBirrTotal.toNumber(),
        otherTotalETB: otherTotal.toNumber(),
        expectedCashInDrawerETB: expectedCash.toNumber(),
        totalTransactionsCount: payments.length,
      },
    };
  }

  /**
   * Closes and reconciles a cashier till shift session.
   */
  public static async closeSession(params: CloseSessionParams) {
    const { shopId, sessionId, closingCashCounted, closedBy, notes } = params;

    if (closingCashCounted < 0) {
      throw new ValidationError('Closing counted cash cannot be negative.');
    }

    return await prisma.$transaction(async (tx) => {
      const [session] = await tx.$queryRaw<Array<{ id: string; shopId: string; status: string; openingFloat: Prisma.Decimal }>>`
        SELECT "id", "shopId", "status", "openingFloat"
        FROM "cash_sessions"
        WHERE "id" = ${sessionId} AND "shopId" = ${shopId}
        FOR UPDATE
      `;

      if (!session) throw new NotFoundError('Cash Session', sessionId);
      if (session.status !== 'open') {
        throw new ValidationError(`Session is already ${session.status}.`);
      }

      // Calculate authoritative payment totals
      const payments = await tx.payment.findMany({
        where: { shopId, cashSessionId: sessionId },
      });

      let cashSales = new Prisma.Decimal(0);
      let cashRefunds = new Prisma.Decimal(0);
      let telebirrTotal = new Prisma.Decimal(0);
      let cbeBirrTotal = new Prisma.Decimal(0);
      let otherTotal = new Prisma.Decimal(0);

      for (const p of payments) {
        if (p.method === 'cash') {
          if (p.amount.gte(0)) cashSales = cashSales.add(p.amount);
          else cashRefunds = cashRefunds.add(p.amount.abs());
        } else if (p.method === 'telebirr') telebirrTotal = telebirrTotal.add(p.amount);
        else if (p.method === 'cbe_birr') cbeBirrTotal = cbeBirrTotal.add(p.amount);
        else otherTotal = otherTotal.add(p.amount);
      }

      const netCash = cashSales.sub(cashRefunds);
      const expectedCash = session.openingFloat.add(netCash);
      const counted = new Prisma.Decimal(closingCashCounted);
      const cashDifference = counted.sub(expectedCash);

      const updated = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closingCashCounted: counted,
          expectedCash,
          cashDifference,
          totalSalesCash: cashSales,
          totalRefundsCash: cashRefunds,
          totalTelebirr: telebirrTotal,
          totalCbeBirr: cbeBirrTotal,
          totalOther: otherTotal,
          closedBy,
          notes,
        },
        include: {
          cashier: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      await AuditService.log(
        {
          shopId,
          actorUserId: closedBy,
          action: 'CASH_SESSION_CLOSED',
          entityType: 'cash_session',
          entityId: sessionId,
          newValues: {
            closingCashCounted,
            expectedCash: expectedCash.toString(),
            cashDifference: cashDifference.toString(),
          },
        },
        tx
      );

      return updated;
    });
  }
}
