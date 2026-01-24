import express from "express";
import { supabase } from "../db/supabase.mjs";

const router = express.Router();

/**
 * Helper: find ingredient by name (case-insensitive), else create it.
 * Assumes Ingredients has: IngredientID, name, userID (and other nullable fields).
 */
async function getOrCreateIngredientId({ name, userID }) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Ingredient name is required");

  // 1) Try find existing ingredient (case-insensitive) for this user
  const { data: existing, error: findErr } = await supabase
    .from("Ingredients")
    .select("IngredientID, name")
    .eq("userID", userID)
    .ilike("name", cleanName) // case-insensitive match
    .limit(1);

  if (findErr) throw findErr;

  if (existing && existing.length > 0) {
    return existing[0].IngredientID;
  }

  // 2) Create ingredient
  const { data: created, error: createErr } = await supabase
    .from("Ingredients")
    .insert([{ name: cleanName, userID }])
    .select("IngredientID")
    .single();

  if (createErr) throw createErr;

  return created.IngredientID;
}

/**
 * Create a new shopping list for a user
 * POST /api/shopping-lists
 * body: { userID }
 */
router.post("/shopping-lists", async (req, res) => {
  try {
    const userID = Number(req.body.userID ?? 1); // until auth exists
    const { data, error } = await supabase
      .from("ShoppingLists")
      .insert([{ userID }])
      .select("listID")
      .single();

    if (error) throw error;
    res.status(201).json({ listID: data.listID });
  } catch (err) {
    console.error("Create list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all items in a list (join Ingredients)
 * GET /api/shopping-lists/:listID
 */
router.get("/shopping-lists/:listID", async (req, res) => {
  try {
    const listID = Number(req.params.listID);

    const { data, error } = await supabase
      .from("ShoppingListItems")
      .select(`
        itemID,
        checked,
        quantity,
        ingredientID,
        Ingredients (
          IngredientID,
          name
        )
      `)
      .eq("listID", listID)
      .order("itemID", { ascending: true });

    if (error) throw error;

    // flatten Ingredients relation for frontend convenience
    const items = (data ?? []).map((row) => ({
      itemID: row.itemID,
      checked: row.checked,
      quantity: row.quantity,
      ingredientID: row.ingredientID,
      name: row.Ingredients?.name ?? "Unknown",
    }));

    res.json(items);
  } catch (err) {
    console.error("Get list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add an item by ingredient name:
 * - find ingredient by name, else create it
 * - add to ShoppingListItems (unique listID+ingredientID)
 *
 * POST /api/shopping-lists/:listID/items
 * body: { name, quantity?, userID }
 */
router.post("/shopping-lists/:listID/items", async (req, res) => {
  try {
    const listID = Number(req.params.listID);
    const userID = Number(req.body.userID ?? 1);
    const name = String(req.body.name ?? "");
    const quantity = req.body.quantity ?? null;

    const ingredientID = await getOrCreateIngredientId({ name, userID });

    // insert item (if exists already, update quantity instead)
    const { data, error } = await supabase
      .from("ShoppingListItems")
      .upsert(
        [{ listID, ingredientID, quantity }],
        { onConflict: "listID,ingredientID" }
      )
      .select("itemID, listID, ingredientID, quantity, checked")
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Add item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle check
 * PATCH /api/shopping-lists/:listID/items/:itemID
 * body: { checked: boolean }
 */
router.patch("/shopping-lists/:listID/items/:itemID", async (req, res) => {
  try {
    const itemID = Number(req.params.itemID);
    const checked = Boolean(req.body.checked);

    const { data, error } = await supabase
      .from("ShoppingListItems")
      .update({ checked })
      .eq("itemID", itemID)
      .select("itemID, checked")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Toggle item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete item
 * DELETE /api/shopping-lists/:listID/items/:itemID
 */
router.delete("/shopping-lists/:listID/items/:itemID", async (req, res) => {
  try {
    const itemID = Number(req.params.itemID);

    const { error } = await supabase
      .from("ShoppingListItems")
      .delete()
      .eq("itemID", itemID);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
