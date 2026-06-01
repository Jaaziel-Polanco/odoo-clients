"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoneyMulti, fmtNumber } from "@/lib/format";
import type { RfmRow, RfmSegment } from "@/lib/domain/sales/rfm-segmentation";

const SEGMENT_TONE: Record<RfmSegment, "success" | "info" | "warning" | "danger" | "neutral"> = {
  Campeones: "success",
  Leales: "success",
  Potenciales: "info",
  Nuevos: "info",
  Prometedores: "info",
  "Necesitan atencion": "warning",
  "A punto de dormir": "warning",
  "En riesgo": "danger",
  "No los podemos perder": "danger",
  Hibernando: "neutral",
  Perdidos: "neutral",
};

export const RfmTable = ({ data }: { data: RfmRow[] }) => {
  const router = useRouter();
  const [segmentFilter, setSegmentFilter] = useState<RfmSegment | "all">("all");

  const segments = useMemo(() => {
    const set = new Set<RfmSegment>();
    for (const row of data) set.add(row.segment);
    return Array.from(set);
  }, [data]);

  const filtered = useMemo(
    () => (segmentFilter === "all" ? data : data.filter((r) => r.segment === segmentFilter)),
    [data, segmentFilter],
  );

  const columns = useMemo<ColumnDef<RfmRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {row.original.name}
            </span>
            {row.original.country ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {row.original.country}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "segment",
        header: "Segmento",
        cell: ({ row }) => (
          <Badge tone={SEGMENT_TONE[row.original.segment]}>
            {row.original.segment}
          </Badge>
        ),
      },
      {
        accessorKey: "rScore",
        header: "R",
      },
      {
        accessorKey: "fScore",
        header: "F",
      },
      {
        accessorKey: "mScore",
        header: "M",
      },
      {
        accessorKey: "recencyDays",
        header: "Ultima",
        cell: ({ row }) => `${row.original.recencyDays}d`,
      },
      {
        accessorKey: "frequency",
        header: "Compras",
        cell: ({ row }) => fmtNumber(row.original.frequency),
      },
      {
        accessorKey: "monetaryUsd",
        header: "Monto",
        cell: ({ row }) =>
          fmtMoneyMulti({
            usd: row.original.monetaryUsd,
            dop: row.original.monetaryDop,
          }),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Filtrar segmento:
        </span>
        <Button
          size="sm"
          variant={segmentFilter === "all" ? "primary" : "secondary"}
          onClick={() => setSegmentFilter("all")}
        >
          Todos ({data.length})
        </Button>
        {segments.map((seg) => {
          const count = data.filter((r) => r.segment === seg).length;
          return (
            <Button
              key={seg}
              size="sm"
              variant={segmentFilter === seg ? "primary" : "secondary"}
              onClick={() => setSegmentFilter(seg)}
            >
              {seg} ({count})
            </Button>
          );
        })}
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        rowKey="partnerId"
        onRowClick={(row) => router.push(`/dashboard/cliente/${row.partnerId}` as Route)}
        emptyTitle="Sin clientes en este segmento"
        csvFilename="rfm-segmentos.csv"
        csvHeaders={{
          name: "Cliente",
          email: "Email",
          phone: "Telefono",
          mobile: "Celular",
          vat: "RNC/Cedula",
          country: "Pais",
          city: "Ciudad",
          segment: "Segmento",
          rScore: "R",
          fScore: "F",
          mScore: "M",
          recencyDays: "Dias ultima",
          frequency: "Frecuencia",
          monetaryUsd: "Monto USD",
          monetaryDop: "Monto DOP",
        }}
      />
    </div>
  );
};
