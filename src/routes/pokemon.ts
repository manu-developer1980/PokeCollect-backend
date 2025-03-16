import express from 'express';
import * as pokemonService from '../services/pokemonService';

const router = express.Router();

router.get('/cards', async (req, res) => {
  try {
    const params = {
      q: req.query.q as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      orderBy: req.query.orderBy as string
    };
    
    const result = await pokemonService.searchCards(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

router.get('/cards/:id', async (req, res) => {
  try {
    const card = await pokemonService.getCardById(req.params.id);
    res.json({ data: card });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

router.get('/sets', async (req, res) => {
  try {
    const sets = await pokemonService.getSets();
    res.json({ data: sets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

router.get('/types', async (req, res) => {
  try {
    const types = await pokemonService.getTypes();
    res.json({ data: types });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch types' });
  }
});

router.get('/rarities', async (req, res) => {
  try {
    const rarities = await pokemonService.getRarities();
    res.json({ data: rarities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rarities' });
  }
});

export default router;