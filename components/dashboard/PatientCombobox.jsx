"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2, UserPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { t as tHelper } from "@/lib/i18n";

export default function PatientCombobox({ value, onChange, dict }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }, [search]);

  const handleSelect = useCallback((patient) => {
    onChange({
      _id: patient._id,
      name: patient.name,
      phone: patient.phone,
      language: patient.language,
    });
    setQuery(patient.name);
    setOpen(false);
  }, [onChange]);

  const handleCreateNew = useCallback(() => {
    onChange({ name: query, phone: "", language: "es", _id: null });
    setOpen(false);
  }, [query, onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between input-aruba h-10 sm:h-11 font-normal"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className={query ? "" : "text-muted-foreground"}>
              {query || (dict ? tHelper(dict, "searchExisting") : "Buscar paciente existente...")}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={dict ? tHelper(dict, "searchExisting") : "Buscar..."}
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {query.length >= 2 ? (
                    <button
                      onClick={handleCreateNew}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-[var(--aruba-turquoise)] hover:bg-accent w-full rounded-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      {dict
                        ? tHelper(dict, "createNew", { name: query.length > 20 ? query.slice(0, 20) + "..." : query })
                        : `Crear "${query}" como nuevo paciente`}
                    </button>
                  ) : (
                    dict ? tHelper(dict, "noResults") : "Sin resultados"
                  )}
                </CommandEmpty>
                {results.map((patient) => (
                  <CommandItem
                    key={patient._id}
                    value={patient._id}
                    onSelect={() => handleSelect(patient)}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aruba-turquoise)] to-[var(--aruba-turquoise-light)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.phone}
                        {patient.lastVisitDate && (
                          <> · {dict ? "Última visita" : "Last visit"}: {new Date(patient.lastVisitDate).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
