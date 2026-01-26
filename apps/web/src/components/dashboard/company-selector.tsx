import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/lib/company-context";
import { Link } from "react-router";

export function CompanySelector() {
  const { company, companies, selectCompany, isLoading } = useCompany();

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-[200px] justify-between">
        Loading...
      </Button>
    );
  }

  if (companies.length === 0) {
    return (
      <Button variant="outline" asChild>
        <Link to="/dashboard/new-company">
          <Plus className="mr-2 h-4 w-4" />
          Create Company
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{company?.name ?? "Select company"}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {companies.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onSelect={() => selectCompany(c.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{c.name}</span>
            {c.id === company?.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/new-company" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            New Company
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
