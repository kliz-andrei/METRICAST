import { Router } from "express";
import type { AnyZodObject } from "zod";
import { UserRole } from "@prisma/client";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as auth from "../controllers/auth.controller.js";
import * as users from "../controllers/users.controller.js";
import * as resources from "../controllers/resources.controller.js";
import * as imports from "../controllers/imports.controller.js";
import multer from "multer";
import dashboardRoutes from "./dashboard.routes.js";
import salesRoutes from "./sales-analytics.routes.js";
import customerAnalyticsRoutes from "./customer-analytics.routes.js";
import productAnalyticsRoutes from "./product-analytics.routes.js";
import operationalRoutes from "./operational.routes.js";
import forecastingRoutes from "./forecasting.routes.js";
import reportsRoutes from "./reports.routes.js";
import {
  categorySchema,
  changePasswordSchema,
  customerSchema,
  forgotPasswordSchema,
  idParams,
  loginSchema,
  paymentSchema,
  productSchema,
  refreshSchema,
  resetPasswordSchema,
  transactionSchema,
  userCreateSchema,
  userUpdateSchema,
} from "../validation/schemas.js";

const readRoles = [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.STAFF];
const writeRoles = [UserRole.ADMINISTRATOR, UserRole.MANAGER];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 3 },
});
const resourceRoutes = (
  router: Router,
  path: string,
  handlers: {
    list: typeof resources.listProducts;
    get: typeof resources.getProduct;
    create: typeof resources.createProduct;
    update: typeof resources.updateProduct;
    remove: typeof resources.deleteProduct;
  },
  schema: AnyZodObject,
) => {
  router.get(
    path,
    requireAuth,
    requireRole(...readRoles),
    asyncHandler(handlers.list),
  );
  router.get(
    `${path}/:id`,
    requireAuth,
    requireRole(...readRoles),
    validate(idParams, "params"),
    asyncHandler(handlers.get),
  );
  router.post(
    path,
    requireAuth,
    requireRole(...writeRoles),
    validate(schema),
    asyncHandler(handlers.create),
  );
  router.patch(
    `${path}/:id`,
    requireAuth,
    requireRole(...writeRoles),
    validate(idParams, "params"),
    validate(schema.partial()),
    asyncHandler(handlers.update),
  );
  router.delete(
    `${path}/:id`,
    requireAuth,
    requireRole(...writeRoles),
    validate(idParams, "params"),
    asyncHandler(handlers.remove),
  );
};

export const apiRouter = Router();
apiRouter.post("/auth/login", validate(loginSchema), asyncHandler(auth.login));
apiRouter.post(
  "/auth/refresh",
  validate(refreshSchema),
  asyncHandler(auth.refresh),
);
apiRouter.post(
  "/auth/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(auth.forgotPassword),
);
apiRouter.post(
  "/auth/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(auth.resetPassword),
);
apiRouter.post(
  "/auth/logout",
  requireAuth,
  validate(refreshSchema),
  asyncHandler(auth.logout),
);
apiRouter.get("/auth/me", requireAuth, asyncHandler(auth.me));
apiRouter.post(
  "/auth/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(auth.changePassword),
);
apiRouter.post(
  "/auth/register",
  requireAuth,
  requireRole(UserRole.ADMINISTRATOR),
  validate(userCreateSchema),
  asyncHandler(auth.register),
);
apiRouter.use("/dashboard", requireAuth, dashboardRoutes);
apiRouter.use("/sales", requireAuth, salesRoutes);
apiRouter.use("/analytics", requireAuth, customerAnalyticsRoutes);
apiRouter.use("/analytics", requireAuth, productAnalyticsRoutes);
apiRouter.use("/analytics", requireAuth, operationalRoutes);
apiRouter.use("/forecast", requireAuth, forecastingRoutes);
apiRouter.use("/reports", requireAuth, reportsRoutes);
apiRouter.get(
  "/imports",
  requireAuth,
  requireRole(...readRoles),
  asyncHandler(imports.listImports),
);
apiRouter.get(
  "/imports/overview",
  requireAuth,
  requireRole(...readRoles),
  asyncHandler(imports.importOverview),
);
apiRouter.get(
  "/imports/:id",
  requireAuth,
  requireRole(...readRoles),
  validate(idParams, "params"),
  asyncHandler(imports.getImport),
);
apiRouter.post(
  "/imports/pos",
  requireAuth,
  requireRole(...writeRoles),
  upload.fields([
    { name: "transactions", maxCount: 1 },
    { name: "productSales", maxCount: 1 },
    { name: "payments", maxCount: 1 },
  ]),
  asyncHandler(imports.uploadPos),
);
apiRouter.post(
  "/import/upload",
  requireAuth,
  requireRole(...writeRoles),
  upload.fields([
    { name: "transactions", maxCount: 1 },
    { name: "productSales", maxCount: 1 },
    { name: "payments", maxCount: 1 },
  ]),
  asyncHandler(imports.uploadPos),
);
apiRouter.get(
  "/users",
  requireAuth,
  requireRole(UserRole.ADMINISTRATOR),
  asyncHandler(users.listUsers),
);
apiRouter.get(
  "/users/:id",
  requireAuth,
  requireRole(UserRole.ADMINISTRATOR),
  validate(idParams, "params"),
  asyncHandler(users.getUser),
);
apiRouter.post(
  "/users",
  requireAuth,
  requireRole(UserRole.ADMINISTRATOR),
  validate(userCreateSchema),
  asyncHandler(users.createUser),
);
apiRouter.patch(
  "/users/:id",
  requireAuth,
  requireRole(UserRole.ADMINISTRATOR),
  validate(idParams, "params"),
  validate(userUpdateSchema),
  asyncHandler(users.updateUser),
);
apiRouter.delete(
  "/users/:id",
  requireAuth,
  requireRole(UserRole.ADMINISTRATOR),
  validate(idParams, "params"),
  asyncHandler(users.deleteUser),
);
resourceRoutes(
  apiRouter,
  "/categories",
  {
    list: resources.listCategories,
    get: resources.getCategory,
    create: resources.createCategory,
    update: resources.updateCategory,
    remove: resources.deleteCategory,
  },
  categorySchema,
);
resourceRoutes(
  apiRouter,
  "/products",
  {
    list: resources.listProducts,
    get: resources.getProduct,
    create: resources.createProduct,
    update: resources.updateProduct,
    remove: resources.deleteProduct,
  },
  productSchema,
);
resourceRoutes(
  apiRouter,
  "/customers",
  {
    list: resources.listCustomers,
    get: resources.getCustomer,
    create: resources.createCustomer,
    update: resources.updateCustomer,
    remove: resources.deleteCustomer,
  },
  customerSchema,
);
resourceRoutes(
  apiRouter,
  "/transactions",
  {
    list: resources.listTransactions,
    get: resources.getTransaction,
    create: resources.createTransaction,
    update: resources.updateTransaction,
    remove: resources.deleteTransaction,
  },
  transactionSchema,
);
resourceRoutes(
  apiRouter,
  "/payments",
  {
    list: resources.listPayments,
    get: resources.getPayment,
    create: resources.createPayment,
    update: resources.updatePayment,
    remove: resources.deletePayment,
  },
  paymentSchema,
);
