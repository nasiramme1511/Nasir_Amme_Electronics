import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ReportService } from '@/services/reportService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');

    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;

    const summary = await ReportService.getFinancialSummary(DEFAULT_SHOP_ID, startDate, endDate);

    return jsonSuccess(summary);
  } catch (error) {
    return jsonError(error);
  }
}
