import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  query, 
  where, 
  Timestamp,
  deleteDoc
} from "firebase/firestore";
import { COLLECTIONS, type SoftwareKeyDoc, type ToolType } from "@/lib/schema";

// Tool definitions for display
export const TOOL_DEFINITIONS: Record<ToolType, { name: string; description: string; icon: string }> = {
  'apollo-search': { 
    name: 'Apollo Search', 
    description: 'Search and enrich contact data from Apollo.io',
    icon: 'Search'
  },
  'supplier-search': { 
    name: 'Supplier Search', 
    description: 'Search ThomasNet for manufacturing suppliers',
    icon: 'Factory'
  },
  'ai-workforce': { 
    name: 'AI Workforce', 
    description: 'AI-powered virtual team members and assistants',
    icon: 'Bot'
  },
  'proposal-creator': { 
    name: 'Proposal Creator', 
    description: 'Create and manage professional proposals',
    icon: 'FileText'
  },
  'docuseal': { 
    name: 'DocuSeal', 
    description: 'Electronic document signing and management',
    icon: 'PenTool'
  },
  'gohighlevel': { 
    name: 'GoHighLevel CRM', 
    description: 'CRM integration with GoHighLevel',
    icon: 'Users'
  },
  'linkedin-content': { 
    name: 'LinkedIn Content', 
    description: 'AI-powered LinkedIn content generation',
    icon: 'Linkedin'
  },
  'bug-tracker': { 
    name: 'Bug Tracker', 
    description: 'Track and manage software bugs and issues',
    icon: 'Bug'
  },
  'traction': { 
    name: 'Traction/EOS', 
    description: 'EOS Traction tools for business management',
    icon: 'Target'
  },
  'networking': { 
    name: 'Networking', 
    description: 'Affiliate networking and referral system',
    icon: 'Network'
  },
  'calendar': { 
    name: 'Calendar', 
    description: 'Built-in calendar and scheduling',
    icon: 'Calendar'
  },
  'all-tools': { 
    name: 'All Tools', 
    description: 'Access to all platform tools',
    icon: 'Layers'
  },
};

/**
 * Generate a random software key in format: ADAMS-XXXX-XXXX-XXXX
 */
export function generateKeyString(prefix: string = "Adams"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (0, O, 1, I)
  const segments: string[] = [];
  
  for (let s = 0; s < 3; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return `${prefix}-${segments.join("-")}`;
}

/**
 * Create a new software key
 */
export async function createSoftwareKey(params: {
  name: string;
  description?: string;
  tools: ToolType[];
  expiresAt?: Date;
  maxActivations?: number;
  assignedTo?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignmentType?: 'user' | 'organization' | 'affiliate';
  createdBy: string;
  notes?: string;
}): Promise<{ success: boolean; key?: SoftwareKeyDoc; error?: string }> {
  if (!db) {
    return { success: false, error: "Database not initialized" };
  }

  try {
    const keyString = generateKeyString();
    
    const keyData: Omit<SoftwareKeyDoc, 'id'> = {
      key: keyString,
      name: params.name,
      description: params.description,
      tools: params.tools,
      assignedTo: params.assignedTo,
      assignedToName: params.assignedToName,
      assignedToEmail: params.assignedToEmail,
      assignmentType: params.assignmentType,
      status: 'active',
      expiresAt: params.expiresAt ? Timestamp.fromDate(params.expiresAt) : undefined,
      maxActivations: params.maxActivations,
      currentActivations: 0,
      createdBy: params.createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      notes: params.notes,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.SOFTWARE_KEYS), keyData);
    
    return { 
      success: true, 
      key: { ...keyData, id: docRef.id } as SoftwareKeyDoc 
    };
  } catch (error) {
    console.error("Error creating software key:", error);
    return { success: false, error: "Failed to create software key" };
  }
}

/**
 * Validate a software key
 */
export async function validateSoftwareKey(keyString: string): Promise<{
  valid: boolean;
  key?: SoftwareKeyDoc;
  error?: string;
}> {
  if (!db) {
    return { valid: false, error: "Database not initialized" };
  }

  try {
    const keysRef = collection(db, COLLECTIONS.SOFTWARE_KEYS);
    const q = query(keysRef, where("key", "==", keyString.toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { valid: false, error: "Invalid license key" };
    }

    const keyDoc = snapshot.docs[0];
    const keyData = { id: keyDoc.id, ...keyDoc.data() } as SoftwareKeyDoc;

    // Check status
    if (keyData.status !== 'active') {
      return { valid: false, error: `License key is ${keyData.status}` };
    }

    // Check expiration
    if (keyData.expiresAt) {
      const expiresAt = keyData.expiresAt.toDate();
      if (expiresAt < new Date()) {
        // Update status to expired
        await updateDoc(doc(db, COLLECTIONS.SOFTWARE_KEYS, keyDoc.id), {
          status: 'expired',
          updatedAt: Timestamp.now(),
        });
        return { valid: false, error: "License key has expired" };
      }
    }

    // Check activation limit
    if (keyData.maxActivations && keyData.currentActivations >= keyData.maxActivations) {
      return { valid: false, error: "Maximum activations reached" };
    }

    return { valid: true, key: keyData };
  } catch (error) {
    console.error("Error validating software key:", error);
    return { valid: false, error: "Failed to validate license key" };
  }
}

/**
 * Get all software keys
 */
export async function getAllSoftwareKeys(): Promise<SoftwareKeyDoc[]> {
  if (!db) return [];

  try {
    const keysRef = collection(db, COLLECTIONS.SOFTWARE_KEYS);
    const snapshot = await getDocs(keysRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SoftwareKeyDoc[];
  } catch (error) {
    console.error("Error fetching software keys:", error);
    return [];
  }
}

/**
 * Get software key by ID
 */
export async function getSoftwareKeyById(keyId: string): Promise<SoftwareKeyDoc | null> {
  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTIONS.SOFTWARE_KEYS, keyId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as SoftwareKeyDoc;
  } catch (error) {
    console.error("Error fetching software key:", error);
    return null;
  }
}

/**
 * Update software key status
 */
export async function updateKeyStatus(
  keyId: string, 
  status: SoftwareKeyDoc['status']
): Promise<boolean> {
  if (!db) return false;

  try {
    const docRef = doc(db, COLLECTIONS.SOFTWARE_KEYS, keyId);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error("Error updating key status:", error);
    return false;
  }
}

/**
 * Revoke a software key
 */
export async function revokeSoftwareKey(keyId: string): Promise<boolean> {
  return updateKeyStatus(keyId, 'revoked');
}

/**
 * Delete a software key
 */
export async function deleteSoftwareKey(keyId: string): Promise<boolean> {
  if (!db) return false;

  try {
    await deleteDoc(doc(db, COLLECTIONS.SOFTWARE_KEYS, keyId));
    return true;
  } catch (error) {
    console.error("Error deleting software key:", error);
    return false;
  }
}

/**
 * Get keys assigned to a user or organization
 */
export async function getKeysForAssignee(assigneeId: string): Promise<SoftwareKeyDoc[]> {
  if (!db) return [];

  try {
    const keysRef = collection(db, COLLECTIONS.SOFTWARE_KEYS);
    const q = query(keysRef, where("assignedTo", "==", assigneeId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SoftwareKeyDoc[];
  } catch (error) {
    console.error("Error fetching keys for assignee:", error);
    return [];
  }
}

/**
 * Check if user has access to a specific tool
 */
export async function hasToolAccess(userId: string, tool: ToolType): Promise<boolean> {
  const keys = await getKeysForAssignee(userId);
  
  for (const key of keys) {
    if (key.status !== 'active') continue;
    
    // Check expiration
    if (key.expiresAt && key.expiresAt.toDate() < new Date()) continue;
    
    // Check if key grants access to this tool or all tools
    if (key.tools.includes(tool) || key.tools.includes('all-tools')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all tools a user has access to
 */
export async function getUserToolAccess(userId: string): Promise<ToolType[]> {
  const keys = await getKeysForAssignee(userId);
  const tools = new Set<ToolType>();
  
  for (const key of keys) {
    if (key.status !== 'active') continue;
    
    // Check expiration
    if (key.expiresAt && key.expiresAt.toDate() < new Date()) continue;
    
    // Add all tools from this key
    for (const tool of key.tools) {
      if (tool === 'all-tools') {
        // Return all tool types
        return Object.keys(TOOL_DEFINITIONS) as ToolType[];
      }
      tools.add(tool);
    }
  }
  
  return Array.from(tools);
}
