"use client";

import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t as tHelper } from "@/lib/i18n";

const STATUS_OPTIONS = [
  { value: "all", key: "all", color: "default" },
  { value: "pending", key: "pending", color: "pending" },
  { value: "confirmed", key: "confirmed", color: "confirmed" },
  { value: "cancelled", key: "cancelled", color: "cancelled" },
];

export default function PatientFilters({ searchQuery, onSearchChange, filterStatus, onFilterChange, dict }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={dict ? tHelper(dict, "searchPatients") : "Buscar paciente..."}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 input-aruba h-10"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={filterStatus} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[140px] sm:w-[160px] h-10">
            <SelectValue placeholder={dict ? tHelper(dict, "filterByStatus") : "Filtrar"} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {dict ? tHelper(dict, opt.key) : opt.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
