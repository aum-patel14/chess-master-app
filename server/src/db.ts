import dotenv from 'dotenv';

dotenv.config();

const firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID || 'chess-masterpro';

// Parse Firestore Document Values to Plain JS
function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.mapValue !== undefined) {
    const obj: any = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map((v: any) => parseFirestoreValue(v));
  }
  return null;
}

function parseFirestoreDocument(doc: any): any {
  if (!doc || !doc.fields) return null;
  const obj: any = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = parseFirestoreValue(v);
  }
  return obj;
}

// Convert Plain JS Object to Firestore REST Payload Fields
function convertToFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (val === null) {
      fields[key] = { nullValue: null };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
            if (typeof v === 'boolean') return { booleanValue: v };
            return { nullValue: null };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = {
        mapValue: {
          fields: convertToFirestoreFields(val)
        }
      };
    }
  }
  return fields;
}

// REST helper to fetch user from Firestore
export async function getFirestoreUser(userId: string): Promise<any> {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/users/${userId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Firestore fetch status ${res.status}`);
    }
    const doc = await res.json();
    return parseFirestoreDocument(doc);
  } catch (err) {
    console.error(`[Firestore REST] Error fetching user ${userId}:`, err);
    return null;
  }
}

// REST helper to update user in Firestore (patches fields)
export async function updateFirestoreUser(userId: string, fieldsToUpdate: any): Promise<boolean> {
  const maskParams = Object.keys(fieldsToUpdate)
    .map(k => `updateMask.fieldPaths=${k}`)
    .join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/users/${userId}?${maskParams}`;
  
  const fields = convertToFirestoreFields(fieldsToUpdate);

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      console.warn(`[Firestore REST] Update failed for user ${userId}: status ${res.status}`);
      return false;
    }
    console.log(`[Firestore REST] Updated user ${userId} fields:`, Object.keys(fieldsToUpdate));
    return true;
  } catch (err) {
    console.error(`[Firestore REST] Error updating user ${userId}:`, err);
    return false;
  }
}

// REST helper to save a game in Firestore
export async function saveGameToFirestore(gameData: any): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/games`;
  const fields = convertToFirestoreFields(gameData);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      console.warn(`[Firestore REST] Save game failed: status ${res.status}`);
      return false;
    }
    console.log(`[Firestore REST] Game record saved successfully.`);
    return true;
  } catch (err) {
    console.error(`[Firestore REST] Error saving game:`, err);
    return false;
  }
}
