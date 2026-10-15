/**
 * Activity Logger Utility
 * 
 * Logs user activities to Firestore for display in the Command Center's Recent Activity section.
 * Call this function whenever a significant action occurs on the site.
 */

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS } from "./schema";

export type ActivityType = 
  | "call" 
  | "email" 
  | "meeting" 
  | "note" 
  | "stage-change" 
  | "document" 
  | "task"
  | "create"
  | "update"
  | "delete";

export type EntityType = 
  | "opportunity" 
  | "project" 
  | "organization"
  | "meeting"
  | "document"
  | "task"
  | "rock"
  | "affiliate"
  | "team-member"
  | "proposal"
  | "calendar"
  | "settings";

export interface LogActivityParams {
  type: ActivityType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  description: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity to Firestore
 * @param params - Activity parameters
 * @returns The ID of the created activity document, or null if failed
 */
export async function logActivity(params: LogActivityParams): Promise<string | null> {
  if (!db) {
    console.warn("Firebase not initialized, cannot log activity");
    return null;
  }

  try {
    const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
    
    const activityDoc = {
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName || "",
      description: params.description,
      userId: params.userId || "system",
      metadata: params.metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(activitiesRef, activityDoc);
    console.log("Activity logged:", params.description);
    return docRef.id;
  } catch (error) {
    console.error("Error logging activity:", error);
    return null;
  }
}

// Convenience functions for common activity types

export async function logOpportunityCreated(opportunityId: string, name: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "opportunity",
    entityId: opportunityId,
    entityName: name,
    description: `New opportunity created: ${name}`,
    userId,
  });
}

export async function logOpportunityUpdated(opportunityId: string, name: string, changes: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "opportunity",
    entityId: opportunityId,
    entityName: name,
    description: `Opportunity updated: ${name} - ${changes}`,
    userId,
  });
}

export async function logOpportunityStageChanged(opportunityId: string, name: string, fromStage: string, toStage: string, userId?: string) {
  return logActivity({
    type: "stage-change",
    entityType: "opportunity",
    entityId: opportunityId,
    entityName: name,
    description: `${name} moved from ${fromStage} to ${toStage}`,
    userId,
    metadata: { fromStage, toStage },
  });
}

export async function logProjectCreated(projectId: string, name: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "project",
    entityId: projectId,
    entityName: name,
    description: `New project created: ${name}`,
    userId,
  });
}

export async function logProjectUpdated(projectId: string, name: string, changes: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "project",
    entityId: projectId,
    entityName: name,
    description: `Project updated: ${name} - ${changes}`,
    userId,
  });
}

export async function logMeetingScheduled(meetingId: string, title: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "meeting",
    entityId: meetingId,
    entityName: title,
    description: `Meeting scheduled: ${title}`,
    userId,
  });
}

export async function logMeetingCompleted(meetingId: string, title: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "meeting",
    entityId: meetingId,
    entityName: title,
    description: `Meeting completed: ${title}`,
    userId,
  });
}

export async function logDocumentUploaded(documentId: string, name: string, userId?: string) {
  return logActivity({
    type: "document",
    entityType: "document",
    entityId: documentId,
    entityName: name,
    description: `Document uploaded: ${name}`,
    userId,
  });
}

export async function logDocumentDeleted(documentId: string, name: string, userId?: string) {
  return logActivity({
    type: "delete",
    entityType: "document",
    entityId: documentId,
    entityName: name,
    description: `Document deleted: ${name}`,
    userId,
  });
}

export async function logTaskCreated(taskId: string, title: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "task",
    entityId: taskId,
    entityName: title,
    description: `Task created: ${title}`,
    userId,
  });
}

export async function logTaskCompleted(taskId: string, title: string, userId?: string) {
  return logActivity({
    type: "task",
    entityType: "task",
    entityId: taskId,
    entityName: title,
    description: `Task completed: ${title}`,
    userId,
  });
}

export async function logRockCreated(rockId: string, title: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "rock",
    entityId: rockId,
    entityName: title,
    description: `Rock created: ${title}`,
    userId,
  });
}

export async function logRockUpdated(rockId: string, title: string, progress: number, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "rock",
    entityId: rockId,
    entityName: title,
    description: `Rock progress updated: ${title} (${progress}%)`,
    userId,
    metadata: { progress },
  });
}

export async function logRockCompleted(rockId: string, title: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "rock",
    entityId: rockId,
    entityName: title,
    description: `Rock completed: ${title}`,
    userId,
  });
}

export async function logProposalCreated(proposalId: string, name: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "proposal",
    entityId: proposalId,
    entityName: name,
    description: `Proposal created: ${name}`,
    userId,
  });
}

export async function logProposalUpdated(proposalId: string, name: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "proposal",
    entityId: proposalId,
    entityName: name,
    description: `Proposal updated: ${name}`,
    userId,
  });
}

export async function logCalendarEventCreated(eventId: string, title: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "calendar",
    entityId: eventId,
    entityName: title,
    description: `Calendar event created: ${title}`,
    userId,
  });
}

export async function logTeamMemberAdded(memberId: string, name: string, userId?: string) {
  return logActivity({
    type: "create",
    entityType: "team-member",
    entityId: memberId,
    entityName: name,
    description: `Team member added: ${name}`,
    userId,
  });
}

export async function logSettingsUpdated(settingType: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "settings",
    entityId: settingType,
    entityName: settingType,
    description: `Settings updated: ${settingType}`,
    userId,
  });
}

export async function logAffiliateProfileUpdated(affiliateId: string, name: string, section: string, userId?: string) {
  return logActivity({
    type: "update",
    entityType: "affiliate",
    entityId: affiliateId,
    entityName: name,
    description: `Affiliate profile updated: ${name} - ${section}`,
    userId,
  });
}

export async function logNoteAdded(entityType: EntityType, entityId: string, entityName: string, userId?: string) {
  return logActivity({
    type: "note",
    entityType,
    entityId,
    entityName,
    description: `Note added to ${entityName}`,
    userId,
  });
}
