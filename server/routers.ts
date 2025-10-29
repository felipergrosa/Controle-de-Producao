import { COOKIE_NAME } from "@shared/const";
import { randomUUID } from "crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getProductByCode,
  searchProducts,
  searchProductsByDescription,
  getAllProducts,
  createOrUpdateProduct,
  getProductionEntriesByDate,
  getProductionEntryByProductAndDate,
  getTodayProductionSummary,
  getSnapshotByDate,
  getDb,
  addProductHistory,
  getProductHistory,
  updateProductStats,
  deleteProduct,
  updateProductByCode,
  getProductionByDateRange,
  getTopProductsByQuantity,
  getProductionStats,
  getDailyProductionTrend,
  getProductMovementHistory,
  getProductMovementByDateRange,
  getProductMovementSummary,
  getProductionByType,
} from "./db";
import { products, productionEntries, productionDaySnapshots, InsertProductionEntry, InsertProductionDaySnapshot } from "../drizzle/schema";


import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Products router
  products: router({
    list: protectedProcedure.query(async () => {
      return await getAllProducts();
    }),

    search: protectedProcedure
      .input(z.object({ query: z.string().min(0) }))
      .query(async ({ input }) => {
        if (input.query.length < 2) return [];
        return await searchProducts(input.query);
      }),

    searchByDescription: protectedProcedure
      .input(z.object({ query: z.string().min(0) }))
      .query(async ({ input }) => {
        if (input.query.length < 2) return [];
        return await searchProductsByDescription(input.query);
      }),

    searchCombined: protectedProcedure
      .input(z.object({ query: z.string().min(0) }))
      .query(async ({ input }) => {
        if (input.query.length < 2) return [];
        const byCode = await searchProducts(input.query);
        const byDescription = await searchProductsByDescription(input.query);
        const combined = [...byCode, ...byDescription];
        return Array.from(new Map(combined.map((item: any) => [item.id, item])).values());
      }),

    getByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await getProductByCode(input.code);
      }),

    createOrUpdate: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1),
          description: z.string().min(1),
          photoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createOrUpdateProduct(input.code, input.description, input.photoUrl);
      }),

    create: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1),
          description: z.string().min(1),
          photoUrl: z.string().optional(),
          barcode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const code = input.code.toUpperCase();
        const description = input.description.toUpperCase();
        return await createOrUpdateProduct(code, description, input.photoUrl, input.barcode);
      }),

    update: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1),
          description: z.string().min(1).optional(),
          photoUrl: z.string().optional(),
          barcode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const updates: any = {};
        if (input.description) updates.description = input.description.toUpperCase();
        if (input.photoUrl) updates.photoUrl = input.photoUrl;
        if (input.barcode) updates.barcode = input.barcode;
        return await updateProductByCode(input.code, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),

    getHistory: protectedProcedure
      .input(z.object({ productId: z.string() }))
      .query(async ({ input }) => {
        return await getProductHistory(input.productId);
      }),
  }),

  // Production entries router
  productionEntries: router({
    getByDate: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        const entries = await getProductionEntriesByDate(input.date);
        console.log('getByDate - Entries:', JSON.stringify(entries, null, 2));
        return entries || [];
      }),

    getSummary: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        const summary = await getTodayProductionSummary(input.date);
        return summary || { totalItems: 0, totalQuantity: 0 };
      }),

    add: protectedProcedure
      .input(
        z.object({
          productId: z.string(),
          productCode: z.string(),
          productDescription: z.string(),
          photoUrl: z.string().optional(),
          quantity: z.number().int().positive(),
          sessionDate: z.date(),
          grouping: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const dateStr = new Date(input.sessionDate).toISOString().split("T")[0];

        // Check if entry exists for this product and date
        if (input.grouping) {
          const existing = await getProductionEntryByProductAndDate(input.productId, input.sessionDate);
          if (existing) {
            // Update quantity
            await db
              .update(productionEntries)
              .set({ quantity: existing.quantity + input.quantity })
              .where(eq(productionEntries.id, existing.id));
            return existing;
          }
        }

        // Create new entry
        const id = randomUUID();
        const now = new Date();
        
        const newEntry: InsertProductionEntry = {
          id,
          productId: input.productId,
          productCode: input.productCode,
          productDescription: input.productDescription,
          photoUrl: input.photoUrl,
          quantity: input.quantity,
          insertedAt: now,
          sessionDate: dateStr as any,
          checked: false,
          createdBy: ctx.user?.id,
        };

        await db.insert(productionEntries).values(newEntry);
        return newEntry;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          quantity: z.number().int().positive().optional(),
          checked: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, any> = {};
        if (input.quantity !== undefined) updateData.quantity = input.quantity;
        if (input.checked !== undefined) updateData.checked = input.checked;

        await db
          .update(productionEntries)
          .set(updateData)
          .where(eq(productionEntries.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(productionEntries).where(eq(productionEntries.id, input.id));
        return { success: true };
      }),

    deleteAll: protectedProcedure
      .input(z.object({ sessionDate: z.date() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const dateStr = new Date(input.sessionDate).toISOString().split("T")[0];
        await db
          .delete(productionEntries)
          .where(eq(productionEntries.sessionDate, dateStr as any));

        return { success: true };
      }),
  }),

  // Product history router
  productHistory: router({
    add: protectedProcedure
      .input(
        z.object({
          productId: z.string(),
          productCode: z.string(),
          quantity: z.number().int(),
          type: z.enum(["production", "adjustment", "import"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await addProductHistory(
          input.productId,
          input.productCode,
          input.quantity,
          input.type,
          input.notes,
          ctx.user?.openId
        );
      }),

    getByProduct: protectedProcedure
      .input(z.object({ productId: z.string() }))
      .query(async ({ input }) => {
        return await getProductHistory(input.productId);
      }),
  }),

  // Product movements router
  movements: router({
    getByProduct: protectedProcedure
      .input(z.object({ productId: z.string() }))
      .query(async ({ input }) => {
        return await getProductMovementHistory(input.productId);
      }),

    getByDateRange: protectedProcedure
      .input(z.object({ productId: z.string(), startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await getProductMovementByDateRange(input.productId, input.startDate, input.endDate);
      }),

    getSummary: protectedProcedure
      .input(z.object({ productId: z.string() }))
      .query(async ({ input }) => {
        return await getProductMovementSummary(input.productId);
      }),

    getByType: protectedProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await getProductionByType(input.startDate, input.endDate);
      }),
  }),

  // Analytics router
  analytics: router({
    getProductionByDateRange: protectedProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await getProductionByDateRange(input.startDate, input.endDate);
      }),

    getTopProducts: protectedProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date(), limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return await getTopProductsByQuantity(input.startDate, input.endDate, input.limit);
      }),

    getStats: protectedProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await getProductionStats(input.startDate, input.endDate);
      }),

    getDailyTrend: protectedProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await getDailyProductionTrend(input.startDate, input.endDate);
      }),
  }),

  // Production day snapshots router
  snapshots: router({
    getByDate: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        return await getSnapshotByDate(input.date);
      }),

    finalize: protectedProcedure
      .input(
        z.object({
          sessionDate: z.date(),
          entries: z.array(
            z.object({
              photoUrl: z.string().optional(),
              code: z.string(),
              description: z.string(),
              quantity: z.number(),
              insertedAt: z.date(),
              checked: z.boolean(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const dateStr = new Date(input.sessionDate).toISOString().split("T")[0];

        // Check if snapshot already exists
        const existing = await getSnapshotByDate(input.sessionDate);
        if (existing) {
          throw new Error("Snapshot for this date already exists");
        }

        // Create snapshot
        const id = crypto.randomUUID();
        const snapshot: InsertProductionDaySnapshot = {
          id,
          sessionDate: dateStr as any,
          totalItems: input.entries.length,
          totalQuantity: input.entries.reduce((sum, e) => sum + e.quantity, 0),
          payloadJson: JSON.stringify(input.entries),
          createdBy: ctx.user?.id,
        };

        await db.insert(productionDaySnapshots).values(snapshot);

        // Delete production entries for this date
        await db
          .delete(productionEntries)
          .where(eq(productionEntries.sessionDate, dateStr as any));

        return snapshot;
      }),
  }),
});

export type AppRouter = typeof appRouter;
