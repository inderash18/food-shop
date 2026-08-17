import { Router } from 'express';
import {
  getCategories,
  getCategoryDetail,
  getProducts,
  getProductDetail,
  getAdminProducts,
  postCreateCategory,
  patchUpdateCategory,
  deleteCategory,
  postCreateProduct,
  patchUpdateProduct,
  deleteProduct,
  postStockChange,
  getInventory,
  getTransactions,
  patchMinimumStock,
} from '../controllers/catalog.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  productListQuerySchema,
  stockChangeSchema,
  minimumStockSchema,
} from '../validators/catalog.schema';
import { ROLE } from '../constants';

// ---- Public catalog ----
export const publicCatalogRoutes = Router();

publicCatalogRoutes.get('/categories', getCategories);
publicCatalogRoutes.get('/categories/:idOrSlug', getCategoryDetail);
publicCatalogRoutes.get('/products', validate(productListQuerySchema, 'query'), getProducts);
publicCatalogRoutes.get('/products/:id', getProductDetail);

// ---- Admin catalog management ----
export const adminCatalogRoutes = Router();

adminCatalogRoutes.use(requireAuth(), loadUser(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN));

adminCatalogRoutes.get('/products', getAdminProducts);
adminCatalogRoutes.post('/products', validate(productCreateSchema), postCreateProduct);
adminCatalogRoutes.patch('/products/:id', validate(productUpdateSchema), patchUpdateProduct);
adminCatalogRoutes.delete('/products/:id', deleteProduct);

adminCatalogRoutes.post('/categories', validate(categoryCreateSchema), postCreateCategory);
adminCatalogRoutes.patch('/categories/:id', validate(categoryUpdateSchema), patchUpdateCategory);
adminCatalogRoutes.delete('/categories/:id', deleteCategory);

adminCatalogRoutes.get('/inventory', getInventory);
adminCatalogRoutes.post('/inventory/:productId/stock', validate(stockChangeSchema), postStockChange);
adminCatalogRoutes.patch('/inventory/:productId/minimum', validate(minimumStockSchema), patchMinimumStock);
adminCatalogRoutes.get('/inventory/:productId/transactions', getTransactions);
adminCatalogRoutes.get('/inventory-transactions', getTransactions);
