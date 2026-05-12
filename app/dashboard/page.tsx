import { Card, CardHeader, CardTitle, CardValue, CardFooter } from "@/components/ui/card";
import { fmtMoneyMulti, fmtNumber } from "@/lib/format";
import { getSalesOverview, getRevenueByMonth } from "@/lib/domain/sales/overview";
import { getAppSettings } from "@/lib/domain/config/app-settings";
import { countInactiveCustomers } from "@/lib/domain/sales/inactive-customers";
import { findTopAtRisk } from "@/lib/domain/sales/top-at-risk";
import { computeRfm, summarizeRfmSegments } from "@/lib/domain/sales/rfm-segmentation";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { SegmentDonutChart } from "@/components/charts/segment-donut-chart";
import { TopRiskPreview } from "@/components/sales/top-risk-preview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const settings = await getAppSettings();
  const [overview, revenueByMonth, inactiveCount, topRisk, rfmRows] = await Promise.all([
    getSalesOverview(),
    getRevenueByMonth(12),
    countInactiveCustomers({ thresholdDays: settings.inactivityThresholdDays }),
    findTopAtRisk({ thresholdDays: settings.inactivityThresholdDays, limit: 5 }),
    computeRfm({ windowMonths: settings.rfmWindowMonths }),
  ]);

  const segmentSummary = summarizeRfmSegments(rfmRows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Vista general de ventas y clientes que requieren seguimiento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Clientes activos</CardTitle>
            <CardValue>{fmtNumber(overview.totalCustomers)}</CardValue>
          </CardHeader>
          <CardFooter>
            {fmtNumber(overview.customersWithInvoices)} con facturas
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Inactivos &gt;{settings.inactivityThresholdDays}d
            </CardTitle>
            <CardValue className="text-amber-600 dark:text-amber-400">
              {fmtNumber(inactiveCount)}
            </CardValue>
          </CardHeader>
          <CardFooter>Sin compras recientes</CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue 30d</CardTitle>
            <CardValue className="text-base">
              {fmtMoneyMulti({ usd: overview.last30.usd, dop: overview.last30.dop })}
            </CardValue>
          </CardHeader>
          <CardFooter>
            90d:{" "}
            {fmtMoneyMulti({ usd: overview.last90.usd, dop: overview.last90.dop })}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue historico</CardTitle>
            <CardValue className="text-base">
              {fmtMoneyMulti({ usd: overview.lifetime.usd, dop: overview.lifetime.dop })}
            </CardValue>
          </CardHeader>
          <CardFooter>{fmtNumber(overview.totalInvoices)} facturas</CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue por mes (12 meses)</CardTitle>
          </CardHeader>
          <div className="px-2 pb-4 sm:px-6">
            <RevenueTrendChart data={revenueByMonth} />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribucion RFM</CardTitle>
          </CardHeader>
          <div className="px-2 pb-4 sm:px-6">
            <SegmentDonutChart data={segmentSummary} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top 5 clientes en riesgo</CardTitle>
          <a
            href="/dashboard/top-riesgo"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Ver todos →
          </a>
        </CardHeader>
        <TopRiskPreview data={topRisk} />
      </Card>
    </div>
  );
}
