import { describe, expect, it } from "vitest";

import { buildUserAgent } from "@/lib/http/user-agent";

describe("buildUserAgent", () => {
  it("inclui produto, URL e contacto", () => {
    expect(
      buildUserAgent({ siteUrl: "https://portugalagora.pt", contactEmail: "ola@portugalagora.pt" }),
    ).toBe("PortugalAgora/1.0 (+https://portugalagora.pt; ola@portugalagora.pt)");
  });

  it("funciona sem contacto", () => {
    expect(buildUserAgent({ siteUrl: "http://localhost:3000" })).toBe(
      "PortugalAgora/1.0 (+http://localhost:3000)",
    );
  });
});
