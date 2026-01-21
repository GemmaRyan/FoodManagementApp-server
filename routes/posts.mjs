import express from "express";
import { supabase } from "../db/supabase.mjs";

const router = express.Router();

// Get all ingredient names only
router.get("/names", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Ingredients')
      .select('id, name')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a list of 50 ingredients
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Ingredients')
      .select('*')
      .limit(50);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single ingredient by id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log("Fetching ingredient with id:", id);
    
    const { data, error } = await supabase
      .from('Ingredients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: "Ingredient not found" });
      }
      throw error;
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new ingredient to the table
router.post("/", async (req, res) => {
  try {
    // Extract only the fields that exist in Supabase table
    const { id, name, image, favourite } = req.body;
    
    // Validate required fields
    if (!id || !name || !image) {
      return res.status(400).send({ 
        error: "Missing required fields: id, name, and image are mandatory" 
      });
    }
    
    const newIngredient = {
      id: parseInt(id),
      name,
      image,
      favourite: favourite !== undefined ? favourite : null
    };
    
    const { data, error } = await supabase
      .from('Ingredients')
      .insert([newIngredient])
      .select();
    
    if (error) throw error;
    
    res.status(201).send(data);
  } catch (error) {
    console.error('Error inserting ingredient:', error);
    res.status(500).send({ error: error.message });
  }
});

// Delete an ingredient
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log("del : " + id);
    
    const { data, error } = await supabase
      .from('Ingredients')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      res.status(404).send({ message: "Ingredient not found" });
    } else {
      res.status(200).send({ message: "Deleted successfully", data });
    }
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).send({ error: error.message });
  }
});

export default router;