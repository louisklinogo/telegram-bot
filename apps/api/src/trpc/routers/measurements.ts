import {
  compareMeasurementVersions,
  createMeasurement,
  createMeasurementVersion,
  deleteMeasurement,
  getActiveMeasurement,
  getMeasurementById,
  getMeasurementHistory,
  getMeasurementsWithClient,
  getMeasurementVersions,
  setActiveMeasurementVersion,
  updateMeasurement,
} from "@Faworra/database/queries";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

export const measurementsRouter = createTRPCRouter({
  list: teamProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
          activeOnly: z.boolean().optional(), // Filter to show only active versions
        })
        .optional()
    )
    .query(async ({ ctx, input }) =>
      getMeasurementsWithClient(ctx.db, {
        teamId: ctx.teamId,
        limit: input?.limit,
        offset: input?.offset,
        activeOnly: input?.activeOnly,
      })
    ),

  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getMeasurementById(ctx.db, input.id, ctx.teamId)),

  create: teamProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        recordName: z.string().optional(),
        garmentType: z.string().optional(), // DEPRECATED: Use tags instead
        measurements: z.record(z.string(), z.string()).default({}),
        notes: z.string().nullable().optional(),
        takenAt: z.string().datetime().nullable().optional(),
        // Versioning fields (optional, auto-initialized if not provided)
        version: z.number().optional(),
        measurementGroupId: z.string().uuid().optional(),
        previousVersionId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Convert takenAt string to Date object for Drizzle
      const data = {
        ...input,
        teamId: ctx.teamId,
        takenAt: input.takenAt ? new Date(input.takenAt) : null,
      };
      return createMeasurement(ctx.db, data as any);
    }),

  update: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        clientId: z.string().uuid().optional(),
        recordName: z.string().optional(),
        garmentType: z.string().optional(), // DEPRECATED: Use tags instead
        measurements: z.record(z.string(), z.string()).optional(),
        notes: z.string().nullable().optional(),
        takenAt: z.string().datetime().nullable().optional(),
        // Versioning fields
        tags: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, takenAt, ...rest } = input;
      // Convert takenAt string to Date object for Drizzle
      const data = {
        ...rest,
        takenAt: takenAt ? new Date(takenAt) : undefined,
      };
      return updateMeasurement(ctx.db, id, ctx.teamId, data as any);
    }),

  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteMeasurement(ctx.db, input.id, ctx.teamId);
      return { id: res?.id ?? input.id };
    }),

  // ============================================================================
  // VERSIONING PROCEDURES
  // ============================================================================

  /**
   * Get all versions of a measurement (by measurement group ID)
   */
  getVersions: teamProcedure
    .input(
      z.object({
        measurementGroupId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) =>
      getMeasurementVersions(ctx.db, {
        teamId: ctx.teamId,
        measurementGroupId: input.measurementGroupId,
      })
    ),

  /**
   * Get the active (current) measurement for a client
   */
  getActive: teamProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) =>
      getActiveMeasurement(ctx.db, {
        teamId: ctx.teamId,
        clientId: input.clientId,
      })
    ),

  /**
   * Get measurement history for a client (all measurement groups)
   */
  getHistory: teamProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) =>
      getMeasurementHistory(ctx.db, {
        teamId: ctx.teamId,
        clientId: input.clientId,
      })
    ),

  /**
   * Create a new version from an existing measurement
   */
  createVersion: teamProcedure
    .input(
      z.object({
        existingMeasurementId: z.string().uuid(),
        recordName: z.string().optional(),
        measurements: z.record(z.string(), z.string()).optional(),
        notes: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        takenAt: z.string().datetime().optional(),
        setAsActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { existingMeasurementId, setAsActive, ...newData } = input;
      return createMeasurementVersion(ctx.db, {
        existingMeasurementId,
        teamId: ctx.teamId,
        newData: newData as any,
        setAsActive,
      });
    }),

  /**
   * Set a measurement version as active
   */
  setActiveVersion: teamProcedure
    .input(
      z.object({
        measurementId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      setActiveMeasurementVersion(ctx.db, {
        measurementId: input.measurementId,
        teamId: ctx.teamId,
      })
    ),

  /**
   * Compare two measurement versions
   */
  compareVersions: teamProcedure
    .input(
      z.object({
        versionId1: z.string().uuid(),
        versionId2: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) =>
      compareMeasurementVersions(ctx.db, {
        versionId1: input.versionId1,
        versionId2: input.versionId2,
        teamId: ctx.teamId,
      })
    ),
});
