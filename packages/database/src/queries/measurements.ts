import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import { measurements, clients } from "../schema";

/**
 * Get measurements with client info (supports pagination and versioning)
 * By default returns all measurements (all versions)
 */
export async function getMeasurementsWithClient(
  db: DbClient,
  params: { 
    teamId: string; 
    limit?: number; 
    offset?: number;
    activeOnly?: boolean; // Filter to show only active versions
  },
) {
  const { teamId, limit = 50, offset = 0, activeOnly = false } = params;
  
  const conditions = [
    eq(measurements.teamId, teamId), 
    isNull(measurements.deletedAt)
  ];
  
  // Optionally filter to active versions only
  if (activeOnly) {
    conditions.push(eq(measurements.isActive, true));
  }
  
  return await db
    .select({ measurement: measurements, client: clients })
    .from(measurements)
    .leftJoin(clients, eq(measurements.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(measurements.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getMeasurementById(db: DbClient, id: string, teamId: string) {
  const rows = await db
    .select({ measurement: measurements, client: clients })
    .from(measurements)
    .leftJoin(clients, eq(measurements.clientId, clients.id))
    .where(
      and(eq(measurements.id, id), eq(measurements.teamId, teamId), isNull(measurements.deletedAt)),
    )
    .limit(1);
  return rows[0] || null;
}

/**
 * Create a new measurement (initializes versioning fields)
 * Sets version=1, measurementGroupId=id (self-reference), isActive=true
 */
export async function createMeasurement(db: DbClient, data: typeof measurements.$inferInsert) {
  const res = await db.insert(measurements).values(data).returning();
  const newMeasurement = res[0];
  
  // Initialize versioning: set measurementGroupId to own ID if not provided
  if (newMeasurement && !data.measurementGroupId) {
    const updated = await db
      .update(measurements)
      .set({ measurementGroupId: newMeasurement.id })
      .where(eq(measurements.id, newMeasurement.id))
      .returning();
    return updated[0];
  }
  
  return newMeasurement;
}

export async function updateMeasurement(
  db: DbClient,
  id: string,
  teamId: string,
  data: Partial<typeof measurements.$inferInsert>,
) {
  const res = await db
    .update(measurements)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(measurements.id, id), eq(measurements.teamId, teamId)))
    .returning();
  return res[0] || null;
}

export async function deleteMeasurement(db: DbClient, id: string, teamId: string) {
  const res = await db
    .update(measurements)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(measurements.id, id), eq(measurements.teamId, teamId)))
    .returning();
  return res[0] || null;
}

// ============================================================================
// VERSIONING QUERIES
// ============================================================================

/**
 * Get all versions of a measurement (grouped by measurementGroupId)
 */
export async function getMeasurementVersions(
  db: DbClient,
  params: { 
    teamId: string; 
    measurementGroupId: string;
  },
) {
  const { teamId, measurementGroupId } = params;
  
  return await db
    .select({ measurement: measurements, client: clients })
    .from(measurements)
    .leftJoin(clients, eq(measurements.clientId, clients.id))
    .where(
      and(
        eq(measurements.teamId, teamId),
        eq(measurements.measurementGroupId, measurementGroupId),
        isNull(measurements.deletedAt)
      )
    )
    .orderBy(desc(measurements.version));
}

/**
 * Get the active (current) measurement for a client
 */
export async function getActiveMeasurement(
  db: DbClient,
  params: { teamId: string; clientId: string },
) {
  const { teamId, clientId } = params;
  
  const rows = await db
    .select({ measurement: measurements, client: clients })
    .from(measurements)
    .leftJoin(clients, eq(measurements.clientId, clients.id))
    .where(
      and(
        eq(measurements.teamId, teamId),
        eq(measurements.clientId, clientId),
        eq(measurements.isActive, true),
        isNull(measurements.deletedAt)
      )
    )
    .limit(1);
    
  return rows[0] || null;
}

/**
 * Get measurement history for a client (all measurement groups with their latest versions)
 */
export async function getMeasurementHistory(
  db: DbClient,
  params: { teamId: string; clientId: string },
) {
  const { teamId, clientId } = params;
  
  return await db
    .select({ measurement: measurements, client: clients })
    .from(measurements)
    .leftJoin(clients, eq(measurements.clientId, clients.id))
    .where(
      and(
        eq(measurements.teamId, teamId),
        eq(measurements.clientId, clientId),
        isNull(measurements.deletedAt)
      )
    )
    .orderBy(desc(measurements.createdAt));
}

/**
 * Create a new version from an existing measurement
 * Clones the measurement, increments version, links to previous version
 */
export async function createMeasurementVersion(
  db: DbClient,
  params: {
    existingMeasurementId: string;
    teamId: string;
    newData?: Partial<typeof measurements.$inferInsert>;
    setAsActive?: boolean;
  },
) {
  const { existingMeasurementId, teamId, newData = {}, setAsActive = true } = params;
  
  // Get existing measurement
  const existing = await getMeasurementById(db, existingMeasurementId, teamId);
  if (!existing?.measurement) {
    throw new Error("Measurement not found");
  }
  
  const existingMeas = existing.measurement;
  
  // If setting new version as active, deactivate all others in the group
  if (setAsActive && existingMeas.measurementGroupId) {
    await db
      .update(measurements)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(measurements.teamId, teamId),
          eq(measurements.measurementGroupId, existingMeas.measurementGroupId),
          isNull(measurements.deletedAt)
        )
      );
  }
  
  // Create new version
  const newVersion = await db.insert(measurements).values({
    teamId: existingMeas.teamId,
    clientId: existingMeas.clientId,
    recordName: newData.recordName || `${existingMeas.recordName || 'Measurement'} - Version ${(existingMeas.version || 1) + 1}`,
    measurements: newData.measurements || existingMeas.measurements,
    notes: newData.notes !== undefined ? newData.notes : existingMeas.notes,
    tags: newData.tags !== undefined ? newData.tags : existingMeas.tags,
    takenAt: newData.takenAt || new Date(),
    version: (existingMeas.version || 1) + 1,
    measurementGroupId: existingMeas.measurementGroupId,
    previousVersionId: existingMeas.id,
    isActive: setAsActive,
  }).returning();
  
  return newVersion[0];
}

/**
 * Set a measurement version as active (deactivates all others in the group)
 */
export async function setActiveMeasurementVersion(
  db: DbClient,
  params: { measurementId: string; teamId: string },
) {
  const { measurementId, teamId } = params;
  
  // Get the measurement to find its group
  const measurement = await getMeasurementById(db, measurementId, teamId);
  if (!measurement?.measurement) {
    throw new Error("Measurement not found");
  }
  
  const groupId = measurement.measurement.measurementGroupId;
  if (!groupId) {
    throw new Error("Measurement does not belong to a group");
  }
  
  // Deactivate all in group
  await db
    .update(measurements)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(measurements.teamId, teamId),
        eq(measurements.measurementGroupId, groupId),
        isNull(measurements.deletedAt)
      )
    );
  
  // Activate the specified one
  const res = await db
    .update(measurements)
    .set({ isActive: true, updatedAt: new Date() })
    .where(
      and(
        eq(measurements.id, measurementId),
        eq(measurements.teamId, teamId)
      )
    )
    .returning();
    
  return res[0] || null;
}

/**
 * Compare two measurement versions (returns diff)
 */
export async function compareMeasurementVersions(
  db: DbClient,
  params: { 
    versionId1: string; 
    versionId2: string; 
    teamId: string;
  },
) {
  const { versionId1, versionId2, teamId } = params;
  
  const v1 = await getMeasurementById(db, versionId1, teamId);
  const v2 = await getMeasurementById(db, versionId2, teamId);
  
  if (!v1?.measurement || !v2?.measurement) {
    throw new Error("One or both measurements not found");
  }
  
  // Calculate differences in measurements
  const m1 = v1.measurement.measurements as Record<string, string>;
  const m2 = v2.measurement.measurements as Record<string, string>;
  
  const allKeys = new Set([...Object.keys(m1 || {}), ...Object.keys(m2 || {})]);
  
  const diff = Array.from(allKeys).map(key => ({
    field: key,
    version1: m1?.[key] || null,
    version2: m2?.[key] || null,
    changed: m1?.[key] !== m2?.[key],
  }));
  
  return {
    version1: v1.measurement,
    version2: v2.measurement,
    client: v1.client,
    diff,
  };
}
