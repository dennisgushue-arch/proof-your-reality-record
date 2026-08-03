import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaptureModeSelector } from "../components/CaptureModeSelector";

describe("CaptureModeSelector", () => {
  it.each([
    ["Speak", "speak"],
    ["Type", "type"],
    ["Photo", "photo"],
    ["Location", "location"],
  ] as const)("activates %s mode", (label, mode) => {
    const onChange = vi.fn();
    render(<CaptureModeSelector mode="speak" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(label, "i") }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(mode);
  });
});