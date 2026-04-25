import twilio from 'twilio';

import type { MealEntry } from '@/models/domain';
import {
  buildReminderMessage,
  getCurrentReminderSlot,
  getLocalDateKey,
  hasBeenInactive,
  type ReminderPreferences,
} from '@/models/reminders';
import { getAdminDb } from '../_lib/firebase-admin';

type GoalDoc = {
  calories?: number;
  protein?: number;
};

type ReminderRunResult = {
  uid: string;
  status: 'sent' | 'skipped' | 'error';
  reason: string;
};

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function GET(request: Request) {
  try {
    authorizeRequest(request);

    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    const now = new Date();
    const db = getAdminDb();
    const settingsSnapshot = await db.collectionGroup('settings').where('enabled', '==', true).get();
    const results: ReminderRunResult[] = [];

    for (const snapshot of settingsSnapshot.docs) {
      if (snapshot.id !== 'reminders') continue;

      const uid = snapshot.ref.parent.parent?.id;
      if (!uid) {
        results.push({ uid: 'unknown', status: 'error', reason: 'Could not resolve uid from reminder document.' });
        continue;
      }

      const preferences = snapshot.data() as ReminderPreferences;
      const result = await processUserReminder({
        db,
        uid,
        now,
        preferences,
        dryRun,
      });
      results.push(result);
    }

    return Response.json(
      {
        ok: true,
        dryRun,
        processed: results.length,
        sent: results.filter((result) => result.status === 'sent').length,
        skipped: results.filter((result) => result.status === 'skipped').length,
        errors: results.filter((result) => result.status === 'error').length,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

async function processUserReminder(params: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  now: Date;
  preferences: ReminderPreferences;
  dryRun: boolean;
}): Promise<ReminderRunResult> {
  const { db, uid, now, preferences, dryRun } = params;

  if (!preferences.phoneNumber || !preferences.timezone) {
    return { uid, status: 'skipped', reason: 'Missing phone number or timezone.' };
  }

  const slot = getCurrentReminderSlot(now, preferences.timezone);
  if (!slot) {
    return { uid, status: 'skipped', reason: 'Outside reminder window.' };
  }

  const localDateKey = getLocalDateKey(now, preferences.timezone);
  if (preferences.lastSentLocalDate === localDateKey && preferences.lastSentSlotKey === slot.key) {
    return { uid, status: 'skipped', reason: 'Already sent for this slot.' };
  }

  if (!hasBeenInactive(preferences.lastActivityAt, now)) {
    return { uid, status: 'skipped', reason: 'User has been active recently.' };
  }

  const [goalsSnapshot, mealsSnapshot] = await Promise.all([
    db.doc(`users/${uid}/goals/default`).get(),
    db.collection(`users/${uid}/meals`)
      .where('timestamp', '>=', new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString())
      .orderBy('timestamp', 'desc')
      .get(),
  ]);

  const goals = (goalsSnapshot.data() ?? {}) as GoalDoc;
  const todaysMeals = mealsSnapshot.docs
    .map((doc) => doc.data() as MealEntry)
    .filter((meal) => getLocalDateKey(new Date(meal.timestamp), preferences.timezone) === localDateKey);

  const consumedCalories = todaysMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const consumedProtein = todaysMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const remainingCalories = Math.max(0, (goals.calories ?? 0) - consumedCalories);
  const remainingProtein = Math.max(0, (goals.protein ?? 0) - consumedProtein);

  if (remainingCalories <= 0 && remainingProtein <= 0) {
    return { uid, status: 'skipped', reason: 'Goals already met for calories and protein.' };
  }

  if (!dryRun) {
    await twilioClient.messages.create({
      to: preferences.phoneNumber,
      from: requireEnv('TWILIO_FROM_NUMBER'),
      body: buildReminderMessage(remainingCalories, remainingProtein, slot.label),
    });

    await db.doc(`users/${uid}/settings/reminders`).set(
      {
        lastSentAt: now.toISOString(),
        lastSentSlotKey: slot.key,
        lastSentLocalDate: localDateKey,
      },
      { merge: true }
    );
  }

  return {
    uid,
    status: 'sent',
    reason: dryRun ? 'Eligible reminder found (dry run).' : `Sent SMS for ${slot.key}.`,
  };
}

function authorizeRequest(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) return;

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) {
    return;
  }

  const urlSecret = new URL(request.url).searchParams.get('secret');
  if (urlSecret === secret) {
    return;
  }

  throw new Error('Unauthorized reminder request.');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
