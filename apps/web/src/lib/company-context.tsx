import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface Company {
  id: string;
  name: string;
  stage: string;
  role: string;
}

interface CompanyContextType {
  company: Company | null;
  companies: Company[];
  isLoading: boolean;
  selectCompany: (companyId: string) => void;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedCompanyId");
    }
    return null;
  });

  const { data: companies = [], isLoading } = useQuery(
    trpc.company.list.queryOptions()
  );

  const company = companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;

  useEffect(() => {
    if (company && company.id !== selectedCompanyId) {
      setSelectedCompanyId(company.id);
      localStorage.setItem("selectedCompanyId", company.id);
    }
  }, [company, selectedCompanyId]);

  const selectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    localStorage.setItem("selectedCompanyId", companyId);
  };

  return (
    <CompanyContext.Provider value={{ company, companies, isLoading, selectCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}
