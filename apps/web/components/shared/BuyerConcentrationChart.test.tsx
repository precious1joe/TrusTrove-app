import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { BuyerConcentrationChart } from "./BuyerConcentrationChart";
import type { Invoice } from "@/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>;
    }) => <>{React.cloneElement(children, { width: 600, height: 280 })}</>,
  };
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const mockInvoices: Invoice[] = [
  {
    invoiceId: "inv-1",
    issuer: "issuer-addr",
    buyer: "GDSCOJVNZ4JUVWZ5O6VBTUGOH4ZE22QJ6WMOYWHB3FEDQ2APJ2RQEIHY",
    status: "Funded",
    dueDate: 1798675200,
    createdAt: 1790763125,
    faceValue: "1000000000",
    discountBps: 250,
    fundedAmount: "600000000",
  },
  {
    invoiceId: "inv-2",
    issuer: "issuer-addr",
    buyer: "GCV5ODH3SMUDETURTOQPQ7TD2YI4YS6DZMMXDFLSWLGBFZTCHYL6LDNW",
    status: "Funded",
    dueDate: 1798675200,
    createdAt: 1790763125,
    faceValue: "1000000000",
    discountBps: 250,
    fundedAmount: "400000000",
  },
];

describe("BuyerConcentrationChart", () => {
  it("renders loading skeleton when loading", () => {
    renderWithClient(<BuyerConcentrationChart isLoading />);
    expect(screen.getByTestId("buyer-concentration-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when no invoices are funded", () => {
    renderWithClient(<BuyerConcentrationChart invoices={[]} />);
    expect(screen.getByText(/no funded buyer exposure recorded yet/i)).toBeInTheDocument();
  });

  it("renders error state gracefully", () => {
    renderWithClient(<BuyerConcentrationChart error={new Error("fail")} />);
    expect(screen.getByText(/buyer exposure data is temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders buyer concentration data with exact totals and percentages", () => {
    renderWithClient(<BuyerConcentrationChart invoices={mockInvoices} />);

    expect(screen.getByRole("heading", { name: "Buyer Concentration" })).toBeInTheDocument();
    expect(screen.getByText(/Total Funded: 100 USDC/i)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Buyer Concentration chart"),
    );
  });

  it("shows unavailable/missing identity warning boundary when buyer identity data is missing", () => {
    const invoicesWithMissingBuyer: Invoice[] = [
      {
        invoiceId: "inv-3",
        issuer: "issuer-addr",
        buyer: "",
        status: "Funded",
        dueDate: 1798675200,
        createdAt: 1790763125,
        faceValue: "1000000000",
        discountBps: 250,
        fundedAmount: "500000000",
      },
    ];

    renderWithClient(<BuyerConcentrationChart invoices={invoicesWithMissingBuyer} />);
    expect(
      screen.getByText(/Notice: Some funded exposure lacks complete buyer identity data/i),
    ).toBeInTheDocument();
  });
});
