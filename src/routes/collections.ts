Limport express from 'express';
import * as collectionService from '../services/collectionService';
import { validateAuth } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(validateAuth);

router.get('/', async (req, res) => {
  try {
    const collections = await collectionService.getCollectionsByUserId(req.user.id);
    res.json({ data: collections });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

router.get('/:collectionId/cards', async (req, res) => {
  try {
    const cards = await collectionService.getCollectionCards(req.params.collectionId);
    res.json({ data: cards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collection cards' });
  }
});

router.post('/', async (req, res) => {
  try {
    const collection = await collectionService.createCollection({
      ...req.body,
      user_id: req.user.id
    });
    res.status(201).json({ data: collection });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

router.post('/:collectionId/cards', async (req, res) => {
  try {
    const card = await collectionService.addCardToCollection({
      ...req.body,
      collection_id: req.params.collectionId
    });
    res.status(201).json({ data: card });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add card to collection' });
  }
});

router.delete('/:collectionId/cards/:cardId', async (req, res) => {
  try {
    await collectionService.removeCardFromCollection(req.params.cardId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove card from collection' });
  }
});