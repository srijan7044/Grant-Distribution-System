import { describe, expect, it } from "vitest";
import { normalizeGrant } from "../soroban";

describe("normalizeGrant", () => {
  it("normalizes array grant payload", () => {
    const result = normalizeGrant([
      101,
      "GCREATORADDRESS111111111111111111111111111111111111",
      2500n,
      "GRECIPIENTADDRESS1111111111111111111111111111111111",
      true,
    ]);

    expect(result).toEqual({
      id: 101,
      creator: "GCREATORADDRESS111111111111111111111111111111111111",
      amount: "2500",
      recipient: "GRECIPIENTADDRESS1111111111111111111111111111111111",
      approved: true,
    });
  });

  it("normalizes map grant payload", () => {
    const grantMap = new Map([
      ["id", 7],
      ["creator", "GCREATOR22222222222222222222222222222222222222222"],
      ["amount", 99n],
      ["recipient", null],
      ["approved", false],
    ]);

    const result = normalizeGrant(grantMap);

    expect(result).toEqual({
      id: 7,
      creator: "GCREATOR22222222222222222222222222222222222222222",
      amount: "99",
      recipient: null,
      approved: false,
    });
  });

  it("normalizes object grant payload and coerces id", () => {
    const result = normalizeGrant({
      id: "15",
      creator: "GCREATOR33333333333333333333333333333333333333333",
      amount: 1234,
      recipient: "GRECIPIENT333333333333333333333333333333333333333",
      approved: 1,
    });

    expect(result).toEqual({
      id: 15,
      creator: "GCREATOR33333333333333333333333333333333333333333",
      amount: "1234",
      recipient: "GRECIPIENT333333333333333333333333333333333333333",
      approved: true,
    });
  });

  it("returns null for empty payload", () => {
    expect(normalizeGrant(null)).toBeNull();
  });
});
