/**
 * Monday.com to Mailchimp Contact Sync Script
 * 
 * This script:
 * 1. Finds the "Contacts" board in monday.com by name
 * 2. Extracts contact data (Item name, Email column, type column)
 * 3. Syncs contacts to Mailchimp, matching by email address
 * 4. Adds "type" values as tags in Mailchimp
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mondaySdk from 'monday-sdk-js';
import mailchimp from '@mailchimp/mailchimp_marketing';
import crypto from 'crypto';

// Load .env file from project root (not from scripts directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log(`📁 Loading .env from: ${envPath}`);

// Environment variables - sanitize to remove whitespace, newlines, and quotes
const sanitizeEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.trim().replace(/^["']|["']$/g, '').replace(/\n|\r/g, '');
};

const MONDAY_API_TOKEN = sanitizeEnvVar(process.env.MONDAY_API_TOKEN);
const MAILCHIMP_API_KEY = sanitizeEnvVar(process.env.MAILCHIMP_API_KEY);
const MAILCHIMP_LIST_ID = sanitizeEnvVar(process.env.MAILCHIMP_LIST_ID);
const MAILCHIMP_DATACENTER = sanitizeEnvVar(process.env.MAILCHIMP_DATACENTER); // Optional: override datacenter
const MONDAY_BOARD_NAME = sanitizeEnvVar(process.env.MONDAY_BOARD_NAME) || 'Contacts Test';

// Validate environment variables
if (!MONDAY_API_TOKEN) {
  console.error('❌ Error: MONDAY_API_TOKEN is not set in .env file');
  process.exit(1);
}

if (!MAILCHIMP_API_KEY) {
  console.error('❌ Error: MAILCHIMP_API_KEY is not set in .env file');
  process.exit(1);
}

if (!MAILCHIMP_LIST_ID) {
  console.error('❌ Error: MAILCHIMP_LIST_ID is not set in .env file');
  process.exit(1);
}

// Initialize Monday.com SDK (will be set up after token validation)
const monday = mondaySdk();
monday.setApiVersion('2023-10');

// Set token if available (will be validated in verifyConnection)
if (MONDAY_API_TOKEN) {
  monday.setToken(MONDAY_API_TOKEN);
}

// Initialize Mailchimp SDK
// Extract datacenter from API key (format: {dc}-{key})
// Example: us1-abc123def456... -> datacenter is "us1"
let mailchimpDatacenter = '';

// If datacenter is explicitly set in env, use it
if (MAILCHIMP_DATACENTER) {
  mailchimpDatacenter = MAILCHIMP_DATACENTER;
  console.log(`📧 Using datacenter from MAILCHIMP_DATACENTER: ${mailchimpDatacenter}`);
} else if (MAILCHIMP_API_KEY && MAILCHIMP_API_KEY.includes('-')) {
  // Extract from API key format: {dc}-{key}
  const parts = MAILCHIMP_API_KEY.split('-');
  mailchimpDatacenter = parts[0];
  console.log(`📧 Extracted datacenter from API key: ${mailchimpDatacenter}`);
} else {
  // If no datacenter can be determined, show error
  console.error('❌ Error: Cannot determine Mailchimp datacenter.');
  console.error('   Your MAILCHIMP_API_KEY should be in format: {dc}-{key}');
  console.error('   Example: us1-abc123def456...');
  console.error('   Or set MAILCHIMP_DATACENTER in .env (e.g., MAILCHIMP_DATACENTER=us1)');
  console.error(`   Current key preview: ${MAILCHIMP_API_KEY?.substring(0, 20) || 'not set'}...`);
  process.exit(1);
}

console.log(`📧 Mailchimp configuration:`);
console.log(`   Datacenter: ${mailchimpDatacenter}`);
console.log(`   API Key preview: ${MAILCHIMP_API_KEY.substring(0, 15)}...`);

mailchimp.setConfig({
  apiKey: MAILCHIMP_API_KEY,
  server: mailchimpDatacenter,
});

interface Contact {
  name: string;
  email: string;
  type: string;
}

interface BoardColumn {
  id: string;
  title: string;
  type: string;
}

interface ColumnMapping {
  emailColumnId: string | null;
  typeColumnId: string | null;
}

/**
 * Generate MD5 hash for Mailchimp subscriber hash
 */
function getSubscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Find board by name
 */
async function findBoardByName(boardName: string): Promise<{ id: string; name: string } | null> {
  console.log(`🔍 Searching for board: "${boardName}"...`);
  
  // First, try to get all workspaces
  const workspacesQuery = `query {
    workspaces {
      id
      name
      kind
    }
  }`;

  try {
    // Get workspaces first
    const workspacesResponse = await monday.api(workspacesQuery);
    
    // Debug: Log raw response structure
    if (!workspacesResponse.data) {
      console.error('❌ No data in API response');
      console.error('   Full response:', JSON.stringify(workspacesResponse, null, 2));
      return null;
    }
    
    const workspaces = workspacesResponse.data?.workspaces || [];
    
    console.log(`📁 Found ${workspaces.length} workspace(s)`);
    
    if (workspaces.length === 0) {
      console.warn('⚠️  No workspaces returned. Checking API response...');
      console.log('   Response keys:', Object.keys(workspacesResponse.data || {}));
    }
    
    // Collect boards from all workspaces
    const allBoards: Array<{ id: string; name: string }> = [];
    
    for (const workspace of workspaces) {
      const boardsQuery = `query ($workspaceId: [ID!]) {
        workspaces(ids: $workspaceId) {
          boards {
            id
            name
            state
          }
        }
      }`;
      
      try {
        const boardsResponse = await monday.api(boardsQuery, {
          variables: { workspaceId: [workspace.id] }
        });
        const workspaceBoards = boardsResponse.data?.workspaces[0]?.boards || [];
        
        // Filter out archived boards
        const activeBoards = workspaceBoards.filter(
          (b: { state: string }) => b.state === 'active'
        );
        
        allBoards.push(...activeBoards.map((b: { id: string; name: string }) => ({
          id: b.id,
          name: b.name
        })));
        
        console.log(`   📋 Workspace "${workspace.name}": ${activeBoards.length} active board(s)`);
      } catch (error: any) {
        console.warn(`   ⚠️  Could not fetch boards from workspace "${workspace.name}": ${error.message}`);
      }
    }
    
    // Also try direct boards query as fallback
    const directBoardsQuery = `query {
      boards(limit: 100) {
        id
        name
        state
      }
    }`;
    
    try {
      const directResponse = await monday.api(directBoardsQuery);
      const directBoards = directResponse.data?.boards || [];
      const activeDirectBoards = directBoards.filter(
        (b: { state: string }) => b.state === 'active'
      );
      
      // Merge with workspace boards (avoid duplicates)
      activeDirectBoards.forEach((b: { id: string; name: string }) => {
        if (!allBoards.find(existing => existing.id === b.id)) {
          allBoards.push({ id: b.id, name: b.name });
        }
      });
    } catch (error: any) {
      console.warn(`⚠️  Direct boards query failed: ${error.message}`);
    }
    
    console.log(`📊 Total boards found: ${allBoards.length}`);
    
    if (allBoards.length === 0) {
      console.error('❌ No boards found. Possible issues:');
      console.error('   1. API token may not have access to boards');
      console.error('   2. All boards may be archived');
      console.error('   3. Account may not have any boards');
      return null;
    }
    
    // Case-insensitive search
    const board = allBoards.find((b: { name: string }) => 
      b.name.toLowerCase() === boardName.toLowerCase()
    );

    if (board) {
      console.log(`✅ Found board: "${board.name}" (ID: ${board.id})`);
      return board;
    } else {
      console.error(`❌ Board "${boardName}" not found. Available boards:`);
      allBoards.forEach((b: { name: string }) => console.log(`   - ${b.name}`));
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error fetching boards:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    throw error;
  }
}

/**
 * Get board columns and find Email and type columns
 */
async function getColumnMapping(boardId: string): Promise<ColumnMapping> {
  console.log(`📋 Fetching columns for board ${boardId}...`);
  
  const query = `query ($boardId: [ID!]) {
    boards(ids: $boardId) {
      columns {
        id
        title
        type
      }
    }
  }`;

  try {
    const response = await monday.api(query, { variables: { boardId: [boardId] } });
    const columns: BoardColumn[] = response.data?.boards[0]?.columns || [];
    
    // Find Email column (case-insensitive)
    const emailColumn = columns.find(col => 
      col.title.toLowerCase() === 'email'
    );
    
    // Find type column (case-insensitive)
    const typeColumn = columns.find(col => 
      col.title.toLowerCase() === 'type'
    );

    const mapping: ColumnMapping = {
      emailColumnId: emailColumn?.id || null,
      typeColumnId: typeColumn?.id || null,
    };

    if (!mapping.emailColumnId) {
      console.error('❌ Error: "Email" column not found. Available columns:');
      columns.forEach(col => console.log(`   - ${col.title} (${col.type})`));
      throw new Error('Email column not found');
    }

    if (!mapping.typeColumnId) {
      console.error('❌ Error: "type" column not found. This column is required for syncing.');
      console.error('   Available columns:', columns.map(col => col.title).join(', '));
      throw new Error('type column not found');
    } else {
      console.log(`✅ Found columns: Email (${mapping.emailColumnId}), type (${mapping.typeColumnId})`);
    }

    return mapping;
  } catch (error: any) {
    console.error('❌ Error fetching columns:', error.message);
    throw error;
  }
}

/**
 * Extract contacts from board items
 */
async function extractContacts(boardId: string, columnMapping: ColumnMapping): Promise<Contact[]> {
  console.log(`📥 Extracting contacts from board ${boardId}...`);
  
  // Query board items_page (simplified to avoid complexity issues)
  const boardItemsQuery = `query ($boardId: [ID!], $limit: Int, $cursor: String) {
    boards(ids: $boardId) {
      id
      name
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            type
          }
        }
      }
    }
  }`;

  // Query groups separately
  const groupsQuery = `query ($boardId: [ID!]) {
    boards(ids: $boardId) {
      groups {
        id
        title
      }
    }
  }`;

  // Query group items separately
  const groupItemsQuery = `query ($boardId: [ID!], $groupId: String!, $limit: Int, $cursor: String) {
    boards(ids: $boardId) {
      groups(ids: [$groupId]) {
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values {
              id
              text
              value
              type
            }
          }
        }
      }
    }
  }`;

  try {
    let allItems: any[] = [];
    const limit = 500;
    
    // Step 1: Fetch board-level items
    console.log(`   Fetching board-level items...`);
    let cursor: string | null = null;
    do {
      const response = await monday.api(boardItemsQuery, { 
        variables: { 
          boardId: [boardId],
          limit: limit,
          cursor: cursor || undefined
        } 
      });
      
      if (response.errors) {
        console.error('❌ GraphQL Errors:', JSON.stringify(response.errors, null, 2));
        return [];
      }
      
      const board = response.data?.boards?.[0];
      if (!board) {
        console.error('❌ Board not found in response');
        return [];
      }
      
      const itemsPage = board.items_page;
      if (itemsPage && itemsPage.items) {
        allItems = allItems.concat(itemsPage.items);
        cursor = itemsPage.cursor || null;
        console.log(`   Fetched board page: ${itemsPage.items.length} items (total: ${allItems.length})`);
      } else {
        cursor = null;
      }
    } while (cursor);
    
    // Step 2: Fetch group items (if any)
    const groupsResponse = await monday.api(groupsQuery, {
      variables: { boardId: [boardId] }
    });
    
    const groups = groupsResponse.data?.boards?.[0]?.groups || [];
    if (groups.length > 0) {
      console.log(`   Found ${groups.length} group(s), fetching group items...`);
      
      for (const group of groups) {
        let groupCursor: string | null = null;
        do {
          const groupResponse = await monday.api(groupItemsQuery, {
            variables: {
              boardId: [boardId],
              groupId: group.id,
              limit: limit,
              cursor: groupCursor || undefined
            }
          });
          
          if (groupResponse.errors) {
            console.warn(`   ⚠️  Error fetching items from group "${group.title}":`, groupResponse.errors[0]?.message);
            break;
          }
          
          const groupData = groupResponse.data?.boards?.[0]?.groups?.[0];
          if (groupData?.items_page?.items) {
            const groupItems = groupData.items_page.items;
            // Merge group items, avoiding duplicates
            const existingIds = new Set(allItems.map((i: any) => i.id));
            const newItems = groupItems.filter((item: any) => !existingIds.has(item.id));
            allItems = allItems.concat(newItems);
            groupCursor = groupData.items_page.cursor || null;
            if (newItems.length > 0) {
              console.log(`   - Group "${group.title}": ${newItems.length} new items (total: ${allItems.length})`);
            }
          } else {
            groupCursor = null;
          }
        } while (groupCursor);
      }
    }
    
    const items = allItems;
    console.log(`   Found ${items.length} total items in board`);
    
    const contacts: Contact[] = [];
    let skippedCount = 0;
    let skippedReasons: Record<string, number> = {
      noName: 0,
      noEmail: 0,
      invalidEmail: 0,
      noType: 0,
    };

    // Debug: Show column mapping
    console.log(`   Column mapping:`);
    console.log(`   - Email column ID: ${columnMapping.emailColumnId}`);
    console.log(`   - type column ID: ${columnMapping.typeColumnId}`);
    
    // Debug: Show first item's column structure (if items exist)
    if (items.length > 0) {
      const firstItem = items[0];
      console.log(`\n   First item sample:`);
      console.log(`   - Item name: "${firstItem.name}"`);
      console.log(`   - Column values (${firstItem.column_values.length} columns):`);
      firstItem.column_values.forEach((cv: any, idx: number) => {
        const isEmail = cv.id === columnMapping.emailColumnId;
        const isType = cv.id === columnMapping.typeColumnId;
        const marker = isEmail ? ' ← EMAIL' : isType ? ' ← TYPE' : '';
        console.log(`     ${idx + 1}. ID: ${cv.id}, Text: "${cv.text}", Value: "${cv.value}", Type: ${cv.type}${marker}`);
      });
    }

    for (const item of items) {
      // Get Item name (required)
      const itemName = item.name?.trim() || '';
      
      // Get email from column values (required)
      const emailColumn = item.column_values.find((cv: any) => cv.id === columnMapping.emailColumnId);
      const email = emailColumn?.text?.trim() || '';

      // Get type from column values (required)
      const typeColumn = item.column_values.find((cv: any) => cv.id === columnMapping.typeColumnId);
      const type = typeColumn?.text?.trim() || '';

      // Skip if any of the three required fields are empty
      if (!itemName) {
        skippedCount++;
        skippedReasons.noName++;
        if (skippedCount <= 5) {
          console.log(`⚠️  Skipping item (ID: ${item.id}) - Item name is empty`);
        }
        continue;
      }
      
      if (!email) {
        skippedCount++;
        skippedReasons.noEmail++;
        if (skippedCount <= 5) {
          console.log(`⚠️  Skipping item "${itemName}" - Email is empty`);
        }
        continue;
      }
      
      if (!email.includes('@')) {
        skippedCount++;
        skippedReasons.invalidEmail++;
        if (skippedCount <= 5) {
          console.log(`⚠️  Skipping item "${itemName}" - Email is invalid: "${email}"`);
        }
        continue;
      }
      
      if (!type) {
        skippedCount++;
        skippedReasons.noType++;
        if (skippedCount <= 5) {
          console.log(`⚠️  Skipping item "${itemName}" (${email}) - type is empty`);
        }
        continue;
      }

      contacts.push({
        name: itemName,
        email: email.toLowerCase().trim(),
        type: type,
      });
    }

    console.log(`✅ Extracted ${contacts.length} contacts`);
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} items:`);
      console.log(`   - No name: ${skippedReasons.noName}`);
      console.log(`   - No email: ${skippedReasons.noEmail}`);
      console.log(`   - Invalid email: ${skippedReasons.invalidEmail}`);
      console.log(`   - No type: ${skippedReasons.noType}`);
    }
    
    // Show sample of extracted contacts (first 3)
    if (contacts.length > 0) {
      console.log(`\n📋 Sample contacts (first 3):`);
      contacts.slice(0, 3).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.email}) - type: "${c.type}"`);
      });
    }
    
    return contacts;
  } catch (error: any) {
    console.error('❌ Error extracting contacts:', error.message);
    throw error;
  }
}

/**
 * Check if member exists in Mailchimp
 */
async function getMailchimpMember(email: string): Promise<any | null> {
  const subscriberHash = getSubscriberHash(email);
  
  try {
    const member = await mailchimp.lists.getListMember(
      MAILCHIMP_LIST_ID!,
      subscriberHash
    );
    return member;
  } catch (error: any) {
    if (error.status === 404) {
      return null; // Member doesn't exist
    }
    // Log more details about the error
    console.error(`   Mailchimp API Error: ${error.message}`);
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response.body || error.response, null, 2)}`);
    }
    throw error;
  }
}

/**
 * Create or update member in Mailchimp
 */
async function upsertMailchimpMember(contact: Contact): Promise<void> {
  const subscriberHash = getSubscriberHash(contact.email);
  
  try {
    await mailchimp.lists.setListMember(MAILCHIMP_LIST_ID!, subscriberHash, {
      email_address: contact.email,
      status_if_new: 'subscribed',
      merge_fields: {
        FNAME: contact.name.split(' ')[0] || contact.name,
        LNAME: contact.name.split(' ').slice(1).join(' ') || '',
      },
    });
  } catch (error: any) {
    console.error(`❌ Error upserting member ${contact.email}:`, error.message);
    throw error;
  }
}

/**
 * Add tags to Mailchimp member (only adds tags that don't already exist)
 * This function double-checks existing tags to prevent duplicates
 */
async function addTagsToMember(email: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;

  const subscriberHash = getSubscriberHash(email);
  
  // Get current tags first - always fetch fresh to ensure accuracy
  let currentTags: string[];
  try {
    currentTags = await getMemberTags(email);
  } catch (error: any) {
    console.error(`   ⚠️  Could not fetch existing tags for ${email}, proceeding with caution`);
    currentTags = [];
  }
  
  // Normalize current tags (lowercase, trimmed) for comparison
  const currentTagNames = new Set(
    currentTags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0)
  );
  
  // Filter out tags that already exist (case-insensitive comparison)
  const newTags = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .filter(tag => {
      const tagLower = tag.toLowerCase();
      const exists = currentTagNames.has(tagLower);
      if (exists) {
        // Tag already exists, skip it
        return false;
      }
      return true;
    });
  
  // Also deduplicate within the newTags array itself (in case caller passed duplicates)
  const uniqueNewTags: string[] = [];
  const seenNewTags = new Set<string>();
  for (const tag of newTags) {
    const tagLower = tag.toLowerCase();
    if (!seenNewTags.has(tagLower)) {
      seenNewTags.add(tagLower);
      uniqueNewTags.push(tag);
    }
  }
  
  if (uniqueNewTags.length === 0) {
    // All tags already exist, skip API call
    return;
  }
  
  // Format new tags for Mailchimp API
  const tagObjects = uniqueNewTags.map(tag => ({
    name: tag.trim(),
    status: 'active' as const,
  }));

  try {
    await mailchimp.lists.updateListMemberTags(
      MAILCHIMP_LIST_ID!,
      subscriberHash,
      {
        tags: tagObjects,
      }
    );
  } catch (error: any) {
    // If error is about duplicate tags, that's okay - tag already exists
    if (error.status === 400 && error.response?.body?.title?.includes('duplicate')) {
      console.warn(`   ⚠️  Tag already exists (Mailchimp confirmed): ${uniqueNewTags.join(', ')}`);
      return;
    }
    console.error(`❌ Error adding tags to ${email}:`, error.message);
    throw error;
  }
}

/**
 * Get current tags for a member
 */
async function getMemberTags(email: string): Promise<string[]> {
  const subscriberHash = getSubscriberHash(email);
  
  try {
    const response = await mailchimp.lists.getListMemberTags(
      MAILCHIMP_LIST_ID!,
      subscriberHash
    );
    return response.tags.map((tag: any) => tag.name);
  } catch (error: any) {
    console.error(`❌ Error getting tags for ${email}:`, error.message);
    return [];
  }
}

/**
 * Sync a single contact to Mailchimp
 */
async function syncContact(contact: Contact): Promise<{ success: boolean; action: string }> {
  try {
    // Check if member exists
    const existingMember = await getMailchimpMember(contact.email);
    
    if (!existingMember) {
      // Create new member
      await upsertMailchimpMember(contact);
      console.log(`✅ Created: ${contact.email}`);
    } else {
      // Update existing member
      await upsertMailchimpMember(contact);
      console.log(`✅ Updated: ${contact.email}`);
    }

    // Add type as tag (type is always required, so this always runs)
    // Handle comma-separated types (e.g., "Donor, Volunteer" -> ["Donor", "Volunteer"])
    // Split by comma, trim, filter empty, and deduplicate
    const typeTags = contact.type
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    // Deduplicate type tags (case-insensitive)
    const uniqueTypeTags: string[] = [];
    const seenTags = new Set<string>();
    for (const tag of typeTags) {
      const tagLower = tag.toLowerCase();
      if (!seenTags.has(tagLower)) {
        seenTags.add(tagLower);
        uniqueTypeTags.push(tag);
      }
    }
    
    // Get current tags to check what we're adding
    const currentTagsBefore = await getMemberTags(contact.email);
    const currentTagNames = new Set(currentTagsBefore.map(t => t.toLowerCase().trim()));
    
    // Filter out tags that already exist
    const newTagsToAdd = uniqueTypeTags.filter(tag => 
      !currentTagNames.has(tag.toLowerCase().trim())
    );
    
    if (newTagsToAdd.length > 0) {
      await addTagsToMember(contact.email, newTagsToAdd);
      console.log(`   📌 Added ${newTagsToAdd.length} new tag(s): ${newTagsToAdd.join(', ')}`);
    } else {
      // All tags already exist
      const existingTags = uniqueTypeTags.filter(tag => 
        currentTagNames.has(tag.toLowerCase().trim())
      );
      console.log(`   📌 All tags already exist: ${existingTags.join(', ')}`);
    }

    return { success: true, action: existingMember ? 'updated' : 'created' };
  } catch (error: any) {
    console.error(`❌ Failed to sync ${contact.email}:`, error.message);
    return { success: false, action: 'error' };
  }
}

/**
 * Test Mailchimp connection and configuration
 */
async function testMailchimpConnection(): Promise<boolean> {
  console.log('🔌 Testing Mailchimp connection...\n');
  
  try {
    // Test 1: Verify API key and server configuration
    console.log('   Test 1: Verifying API configuration...');
    const pingResponse = await mailchimp.ping.get();
    console.log(`   ✅ API connection successful: ${pingResponse.health_status || 'OK'}`);
    
    // Test 2: Verify list exists and is accessible
    console.log('   Test 2: Verifying list access...');
    try {
      const listResponse = await mailchimp.lists.getList(MAILCHIMP_LIST_ID!);
      console.log(`   ✅ List found: "${listResponse.name}"`);
      console.log(`      List ID: ${listResponse.id}`);
      console.log(`      Member count: ${listResponse.stats?.member_count || 0}`);
    } catch (error: any) {
      if (error.status === 404) {
        console.error(`   ❌ List not found. Check your MAILCHIMP_LIST_ID: ${MAILCHIMP_LIST_ID}`);
        return false;
      }
      throw error;
    }
    
    // Test 3: Try to get list members (test pagination)
    console.log('   Test 3: Testing member access...');
    try {
      const membersResponse = await mailchimp.lists.getListMembersInfo(MAILCHIMP_LIST_ID!, {
        count: 1,
      });
      console.log(`   ✅ Member access successful (can read ${membersResponse.total_items || 0} total members)`);
    } catch (error: any) {
      console.warn(`   ⚠️  Warning: Could not access members: ${error.message}`);
      // Don't fail on this, might be permissions issue
    }
    
    console.log('\n✅ All Mailchimp tests passed!\n');
    return true;
  } catch (error: any) {
    console.error('\n❌ Mailchimp connection test failed:', error.message);
    
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
    
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response.body || error.response, null, 2)}`);
    }
    
    // Common error messages
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n   💡 This usually means:');
      console.error('      - The datacenter/server is incorrect');
      console.error('      - Check MAILCHIMP_DATACENTER in .env');
      console.error('      - Or ensure API key format is: {dc}-{key} (e.g., us1-abc123...)');
    } else if (error.status === 401) {
      console.error('\n   💡 This usually means:');
      console.error('      - The API key is invalid or expired');
      console.error('      - Check MAILCHIMP_API_KEY in .env');
    }
    
    return false;
  }
}

/**
 * Verify connection to monday.com API
 */
async function verifyConnection(): Promise<boolean> {
  console.log('🔌 Verifying monday.com API connection...\n');
  
  // Check if token is set
  if (!MONDAY_API_TOKEN) {
    console.error('❌ MONDAY_API_TOKEN is not set');
    return false;
  }
  
  // Validate token format (should be a valid string without newlines)
  if (MONDAY_API_TOKEN.includes('\n') || MONDAY_API_TOKEN.includes('\r')) {
    console.error('❌ MONDAY_API_TOKEN contains invalid characters (newlines)');
    console.error('   Please check your GitHub secret - it may have extra whitespace');
    return false;
  }
  
  // Check for common invalid characters in HTTP headers
  const invalidChars = /[\x00-\x1F\x7F]/;
  if (invalidChars.test(MONDAY_API_TOKEN)) {
    console.error('❌ MONDAY_API_TOKEN contains invalid characters for HTTP headers');
    return false;
  }
  
  console.log(`   Token length: ${MONDAY_API_TOKEN.length} characters`);
  console.log(`   Token preview: ${MONDAY_API_TOKEN.substring(0, 10)}...`);
  console.log(`   Token format: ${MONDAY_API_TOKEN.startsWith('eyJ') ? 'JWT format' : 'Other format'}\n`);
  
  try {
    // Test with a simple "me" query to verify authentication
    const meQuery = `query {
      me {
        id
        name
        email
      }
    }`;
    
    console.log('   Sending API request...');
    const response = await monday.api(meQuery);
    
    // Debug: Show full response structure
    console.log('   Response received. Structure:');
    console.log('   - response keys:', Object.keys(response));
    
    // Check for GraphQL errors first
    if ((response as any).errors && Array.isArray((response as any).errors)) {
      console.error('   ❌ GraphQL Errors:', JSON.stringify((response as any).errors, null, 2));
      return false;
    }
    
    console.log('   - response.data:', response.data ? 'exists' : 'missing');
    console.log('   - response.data keys:', response.data ? Object.keys(response.data) : 'N/A');
    
    if (response.data) {
      console.log('   - Full response.data:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('   - Full response:', JSON.stringify(response, null, 2));
    }
    
    const user = response.data?.me;
    
    if (user) {
      console.log(`\n✅ Connected to monday.com as: ${user.name} (${user.email})`);
      console.log(`   User ID: ${user.id}\n`);
      return true;
    } else {
      console.error('\n❌ Connection failed: No user data returned');
      console.error('   Expected: response.data.me');
      console.error('   Got:', JSON.stringify(response, null, 2));
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Connection failed with error:', error.message);
    console.error('   Error type:', error.constructor.name);
    
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    if (error.errors) {
      console.error('   GraphQL Errors:', JSON.stringify(error.errors, null, 2));
    }
    if (error.data) {
      console.error('   Error data:', JSON.stringify(error.data, null, 2));
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return false;
  }
}

/**
 * Main sync function
 */
async function syncContacts(): Promise<void> {
  console.log('🚀 Starting Monday.com to Mailchimp sync...\n');

  try {
    // Step 0: Verify monday.com connection
    const mondayConnected = await verifyConnection();
    if (!mondayConnected) {
      console.error('\n❌ Cannot proceed without a valid monday.com connection.');
      console.error('   Please check your MONDAY_API_TOKEN in .env file.');
      process.exit(1);
    }

    // Step 0.5: Test Mailchimp connection
    const mailchimpConnected = await testMailchimpConnection();
    if (!mailchimpConnected) {
      console.error('\n❌ Cannot proceed without a valid Mailchimp connection.');
      console.error('   Please check your Mailchimp configuration in .env file.');
      process.exit(1);
    }

    // Step 1: Find the Contacts board
    const board = await findBoardByName(MONDAY_BOARD_NAME);
    if (!board) {
      process.exit(1);
    }

    // Step 2: Get column mapping
    const columnMapping = await getColumnMapping(board.id);

    // Step 3: Extract contacts
    const contacts = await extractContacts(board.id, columnMapping);
    
    if (contacts.length === 0) {
      console.log('⚠️  No contacts found to sync.');
      return;
    }

    // Step 4: Sync each contact
    console.log(`\n📤 Syncing ${contacts.length} contacts to Mailchimp...\n`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const contact of contacts) {
      const result = await syncContact(contact);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Successfully synced: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total contacts: ${contacts.length}`);
    
  } catch (error: any) {
    console.error('\n❌ Fatal error during sync:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncContacts().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

