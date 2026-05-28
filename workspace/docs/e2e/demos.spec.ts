import { expect, test, type Locator } from "@playwright/test";

test("inventory docs demo routes exercise real React and Preact embeds", async ({
  page,
}) => {
  await page.goto("/demos/");

  await expect(
    page.getByRole("heading", {
      name: "Playable examples, real framework edges.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start with the inventory table." }),
  ).toBeVisible();

  const inventoryCard = page.getByRole("link", { name: /Inventory table/u });

  await expect(inventoryCard).toBeVisible();
  await inventoryCard.click();

  await expect(page).toHaveURL(/\/demos\/inventory-table\/$/u);
  await expect(
    page.getByRole("heading", {
      name: "One table model, multiple framework edges.",
    }),
  ).toBeVisible();

  await openSourceDisclosure(page.locator("body"), "Table model");
  await expect(
    page.getByRole("link", {
      name: "Open @starbeam-demos/table-core/src/table.ts on GitHub",
    }),
  ).toBeVisible();
  const precomputedCode = page.locator("[data-precomputed-code]");

  await expect(precomputedCode).toHaveCount(3);
  await expect(
    precomputedCode.first().locator(".expressive-code").first(),
  ).toBeAttached();
  await expect(
    precomputedCode.first().locator(".twoslash-hover").first(),
  ).toBeAttached();

  const reactTab = page.getByRole("tab", { exact: true, name: "React" });
  const reactPanel = page.getByRole("tabpanel", {
    exact: true,
    name: "React",
  });

  await expect(reactTab).toHaveAttribute("aria-selected", "true");
  await expect(reactPanel).toBeVisible();
  await expect(
    reactPanel.getByRole("heading", { name: "Reactive inventory table" }),
  ).toBeVisible();

  await addInventoryItem(reactPanel, "Smoke React Lentils");
  await openSourceDisclosure(reactPanel, "React shell");
  await expect(
    reactPanel.getByRole("link", {
      name: "Open @starbeam-demos/table-react/src/App.tsx on GitHub",
    }),
  ).toBeVisible();

  await page.getByRole("tab", { exact: true, name: "Preact" }).click();

  const preactTab = page.getByRole("tab", { exact: true, name: "Preact" });
  const preactPanel = page.getByRole("tabpanel", {
    exact: true,
    name: "Preact",
  });

  await expect(preactTab).toHaveAttribute("aria-selected", "true");
  await expect(preactPanel).toBeVisible();
  await expect(
    preactPanel.getByRole("heading", { name: "Reactive inventory table" }),
  ).toBeVisible();

  await addInventoryItem(preactPanel, "Smoke Preact Lentils");
  await openSourceDisclosure(preactPanel, "Preact shell");
  await expect(
    preactPanel.getByRole("link", {
      name: "Open @starbeam-demos/table-preact/src/App.tsx on GitHub",
    }),
  ).toBeVisible();
});

async function openSourceDisclosure(
  container: Locator,
  title: string,
): Promise<void> {
  await container.locator("summary").filter({ hasText: title }).click();
}

async function addInventoryItem(
  panel: Locator,
  itemName: string,
): Promise<void> {
  const addItemRegion = panel.getByRole("region", {
    name: "Add inventory item",
  });

  await addItemRegion.getByLabel("Add an item").fill(itemName);
  await addItemRegion.getByRole("button", { name: "Add" }).click();

  await expect(
    panel.getByRole("textbox", { name: `${itemName} name` }),
  ).toHaveValue(itemName);
}
