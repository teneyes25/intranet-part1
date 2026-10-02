import assert from "node:assert/strict";
import test from "node:test";

import { userContextFromSession } from "./auth-context";

test("staff groups are explicit and missing account status is fail-closed", () => {
  const unassigned = userContextFromSession({
    id: "admin-user",
    isActive: true,
    approvalStatus: "APPROVED",
  });
  assert.deepEqual(unassigned.groups, []);
  assert.equal(unassigned.active, true);

  const assigned = userContextFromSession({
    id: "staff",
    isActive: true,
    approvalStatus: "APPROVED",
    groups: ["design"],
  });
  assert.deepEqual(assigned.groups, ["design"]);

  assert.equal(
    userContextFromSession({ id: "u", approvalStatus: "APPROVED" }).active,
    false,
  );
  assert.equal(
    userContextFromSession({ id: "u", isActive: true }).active,
    false,
  );
  assert.equal(
    userContextFromSession({
      id: "u",
      isActive: false,
      approvalStatus: "APPROVED",
      groups: ["sales"],
    }).active,
    false,
  );
  assert.equal(
    userContextFromSession({
      id: "u",
      isActive: true,
      approvalStatus: "PENDING",
      groups: ["sales"],
    }).active,
    false,
  );
});
