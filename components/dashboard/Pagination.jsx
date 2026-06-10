"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";
import { t as tHelper } from "@/lib/i18n";

export default function Pagination({ cursor, hasMore, loading, onLoadMore, dict }) {
  if (!hasMore && !cursor) return null;

  return (
    <div className="flex flex-col items-center gap-3 mt-6">
      {hasMore ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={loading}
          className="gap-2 text-xs sm:text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {dict ? tHelper(dict, "loading") : "Cargando..."}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {dict ? "Cargar más" : "Cargar más"}
            </>
          )}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          {dict ? "Mostrando todos los pacientes" : "Mostrando todos los pacientes"}
        </p>
      )}
    </div>
  );
}
