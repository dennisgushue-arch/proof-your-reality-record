import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ActivationChecklist, type ActivationStep } from "../components/ActivationChecklist";

const createSteps = (completed: number): ActivationStep[] =>
  [
    ["case", "Create your first case"],
    ["incident", "Add your first incident"],
    ["evidence", "Upload evidence"],
    ["ai", "Run AI Analysis"],
    ["entities", "Run Entity Analysis"],
  ].map(([id, label], index) => ({
    id,
    label,
    description: `${label} description`,
    complete: index < completed,
    href: `/${id}`,
    actionLabel: label,
  }));

const renderChecklist = (completed: number) =>
  render(<MemoryRouter><ActivationChecklist steps={createSteps(completed)} /></MemoryRouter>);

describe("ActivationChecklist", () => {
  it("shows all five steps and zero progress for a new account", () => {
    renderChecklist(0);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("0 / 5 Completed")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Run Entity Analysis")).toBeInTheDocument();
  });

  it("updates progress and suggests the next logical action", () => {
    renderChecklist(2);
    expect(screen.getByText("2 / 5 Completed")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("Nice work. Add a photo, message, or document.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Upload evidence/i })).toHaveAttribute("href", "/evidence");
  });

  it("renders all steps in their completed state", () => {
    const { container } = renderChecklist(5);
    expect(screen.getByText("5 / 5 Completed")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(container.querySelectorAll(".bg-emerald-400")).toHaveLength(5);
  });
});