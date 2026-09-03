import test from "node:test";
import assert from "node:assert/strict";
import { computeResponsiveLayout } from "../index.ts";
import { getPreset } from "../presets.ts";
import { parsePowerlineConfig } from "../powerline-config.ts";
import type { SegmentContext, StatusLineSegmentOptions } from "../types.ts";

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function createTestContext(): SegmentContext {
  return {
    model: { id: "test-model", name: "Test Model" },
    thinkingLevel: "off",
    sessionId: "12345678abcdef",
    sessionName: "test-session",
    cwd: "/Users/test/project",
    usageStats: { input: 1000, output: 500, cacheRead: 4000, cacheWrite: 200, cost: 0.05, subagentCost: 0 },
    contextTokens: 1500,
    contextPercent: 15,
    contextWindow: 100000,
    contextApproximate: false,
    autoCompactEnabled: true,
    customCompactionEnabled: false,
    usingSubscription: false,
    queueSummary: { queueCount: 0, blockedCount: 0, compacting: false, leadingText: null, leadingIntent: null, leadingStatus: null },
    sessionStartTime: Date.now() - 60000,
    shellModeActive: false,
    shellRunning: false,
    shellName: null,
    shellCwd: null,
    git: { branch: "main", ahead: 1, behind: 0, modified: 2, untracked: 0 },
    extensionStatuses: new Map(),
    hiddenExtensionStatusKeys: new Set(),
    customItemsById: new Map(),
    options: {},
    theme: {
      fg: (_color: string, text: string) => text,
      bg: (_color: string, text: string) => text,
      bold: (text: string) => text,
    },
    colors: {} as any,
  };
}

test("computeResponsiveLayout: wide terminal fits segments into topContent", () => {
  const ctx = createTestContext();
  const presetDef = getPreset("default");
  const layout = computeResponsiveLayout(ctx, presetDef, 500);

  assert.ok(layout.topContent.length > 0);
  assert.equal(layout.secondaryLines.length, 0);
});

test("computeResponsiveLayout: narrow terminal wraps overflow into multiple secondary lines without dropping segments", () => {
  const ctx = createTestContext();
  const presetDef = getPreset("default");

  // First check in wide terminal which segments are visible
  const wideLayout = computeResponsiveLayout(ctx, presetDef, 500);
  assert.ok(wideLayout.topContent.includes("Test Model"));
  assert.ok(wideLayout.topContent.includes("main"));

  // Now test in narrow terminal (width 35)
  const narrowLayout = computeResponsiveLayout(ctx, presetDef, 35);

  assert.ok(narrowLayout.secondaryLines.length >= 2, `Expected >= 2 secondary lines, got ${narrowLayout.secondaryLines.length}`);

  // Combine all lines in narrow layout
  const allNarrowClean = [
    stripAnsi(narrowLayout.topContent),
    ...narrowLayout.secondaryLines.map(stripAnsi),
  ].join(" ");

  // Ensure key segments (model, git branch, cost) are preserved across the lines without being dropped
  assert.ok(allNarrowClean.includes("Test Model"), "model segment must be present");
  assert.ok(allNarrowClean.includes("main"), "git branch must be present");
});

test("computeResponsiveLayout: extremely narrow terminal wraps all overflow segments across rows", () => {
  const ctx = createTestContext();
  const presetDef = getPreset("default");

  const narrowLayout = computeResponsiveLayout(ctx, presetDef, 25);
  // All overflow lines should exist and secondaryLines count should accommodate all items
  assert.ok(narrowLayout.secondaryLines.length >= 3, `Expected >= 3 secondary lines for width 25, got ${narrowLayout.secondaryLines.length}`);
});
