import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

import { MealEntry } from '@/models/domain';
import { MacroGoals } from '@/store/app-store';
import { db } from './firebase';

export type PremiumAccessExperimentVariant = 'premium_access' | 'no_access';

export type PremiumAccessExperimentAssignment = {
  experimentId: 'premium_access_ab_test';
  variant: PremiumAccessExperimentVariant;
  assignedAt: string;
  updatedAt: string;
};

export type PremiumExperimentInteractionAction =
  | 'paywall_viewed'
  | 'paywall_dismissed'
  | 'switch_to_paid_alpha_clicked'
  | 'attach_photo_attempted'
  | 'attach_photo_selected'
  | 'favorites_unlock_clicked'
  | 'meal_rating_tapped'
  | 'favorite_toggled';

// ── Meals ──────────────────────────────────────────────────────────────────

export async function fetchMeals(uid: string): Promise<MealEntry[]> {
  const q = query(collection(db, 'users', uid, 'meals'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MealEntry);
}

export async function saveMeal(uid: string, meal: MealEntry): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'meals', meal.id), meal);
}

export async function deleteMeal(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'meals', id));
}

// ── Goals ──────────────────────────────────────────────────────────────────

export async function fetchGoals(uid: string): Promise<MacroGoals | null> {
  const snap = await getDocs(collection(db, 'users', uid, 'goals'));
  if (snap.empty) return null;
  return snap.docs[0].data() as MacroGoals;
}

export async function saveGoals(uid: string, goals: MacroGoals): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'goals', 'default'), goals);
}

// ── Notes ──────────────────────────────────────────────────────────────────

export async function fetchNotes(uid: string): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, 'users', uid, 'notes'));
  const notes: Record<string, string> = {};
  snap.docs.forEach((d) => {
    const data = d.data() as { text: string };
    notes[d.id] = data.text;
  });
  return notes;
}

export async function saveNote(uid: string, dateKey: string, text: string): Promise<void> {
  if (text.trim()) {
    await setDoc(doc(db, 'users', uid, 'notes', dateKey), { text: text.trim() });
  } else {
    await deleteDoc(doc(db, 'users', uid, 'notes', dateKey));
  }
}

// -- Experiments ----------------------------------------------------------------

function assignPremiumAccessVariant(uid: string): PremiumAccessExperimentVariant {
  let hash = 0;
  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) >>> 0;
  }
  return hash % 2 === 0 ? 'premium_access' : 'no_access';
}

export async function fetchOrAssignPremiumAccessExperiment(
  uid: string
): Promise<PremiumAccessExperimentAssignment> {
  const experimentRef = doc(db, 'users', uid, 'experiments', 'premium_access');
  const existing = await getDoc(experimentRef);

  if (existing.exists()) {
    const data = existing.data() as Partial<PremiumAccessExperimentAssignment>;
    if (
      data.experimentId === 'premium_access_ab_test' &&
      (data.variant === 'premium_access' || data.variant === 'no_access') &&
      typeof data.assignedAt === 'string' &&
      typeof data.updatedAt === 'string'
    ) {
      return data as PremiumAccessExperimentAssignment;
    }
  }

  const now = new Date().toISOString();
  const assignment: PremiumAccessExperimentAssignment = {
    experimentId: 'premium_access_ab_test',
    variant: assignPremiumAccessVariant(uid),
    assignedAt: now,
    updatedAt: now,
  };

  await Promise.all([
    setDoc(experimentRef, assignment),
    setDoc(
      doc(db, 'analytics_users', uid),
      {
        premiumAccessExperimentId: assignment.experimentId,
        premiumAccessVariant: assignment.variant,
        premiumAccessAssignedAt: assignment.assignedAt,
        lastActive: now,
      },
      { merge: true }
    ),
  ]);

  return assignment;
}

// ── Analytics writes ────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordSessionStart(uid: string, inputMethod: 'text' | 'voice', email?: string, variant?: PremiumAccessExperimentVariant): Promise<void> {
  const dateKey = todayKey();
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', dateKey), {
      sessionsStarted: increment(1),
      activeUsers: arrayUnion(uid),
      ...(inputMethod === 'voice' ? { voiceModeSessions: increment(1) } : {}),
      ...(variant ? { [`sessionsStarted_${variant}`]: increment(1) } : {}),
    }, { merge: true }),
    setDoc(doc(db, 'analytics_users', uid), {
      uid,
      ...(email ? { email } : {}),
      lastActive: new Date().toISOString(),
      totalSessions: increment(1),
      activeDates: arrayUnion(dateKey),
    }, { merge: true }),
  ]);
}

export async function recordSessionCompleted(uid: string, clarificationTurns: number, durationSeconds: number, variant?: PremiumAccessExperimentVariant): Promise<void> {
  const dateKey = todayKey();
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', dateKey), {
      sessionsCompleted: increment(1),
      clarificationsTotal: increment(clarificationTurns),
      totalSessionDuration: increment(durationSeconds),
      ...(variant ? {
        [`sessionsCompleted_${variant}`]: increment(1),
        [`totalSessionDuration_${variant}`]: increment(durationSeconds),
      } : {}),
    }, { merge: true }),
    setDoc(doc(db, 'analytics_users', uid), {
      totalSessionsCompleted: increment(1),
    }, { merge: true }),
  ]);
}

export async function recordSessionAbandoned(uid?: string): Promise<void> {
  const writes: Promise<void>[] = [
    setDoc(doc(db, 'analytics_daily', todayKey()), {
      sessionsAbandoned: increment(1),
    }, { merge: true }),
  ];
  if (uid) {
    writes.push(
      setDoc(doc(db, 'analytics_users', uid), {
        lastActive: new Date().toISOString(),
      }, { merge: true })
    );
  }
  await Promise.all(writes);
}

export async function recordMealSaved(uid: string, calories: number, variant?: PremiumAccessExperimentVariant): Promise<void> {
  const dateKey = todayKey();
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', dateKey), {
      mealsLogged: increment(1),
      totalCalories: increment(calories),
      activeUsers: arrayUnion(uid),
      ...(variant ? { [`mealsLogged_${variant}`]: increment(1) } : {}),
    }, { merge: true }),
    setDoc(doc(db, 'analytics_users', uid), {
      uid,
      lastActive: new Date().toISOString(),
      totalMeals: increment(1),
    }, { merge: true }),
  ]);
}

export async function recordPremiumUpsellClick(uid: string): Promise<void> {
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', todayKey()), {
      premiumUpsellClicks: increment(1),
    }, { merge: true }),
    setDoc(doc(db, 'analytics_users', uid), {
      premiumUpsellClicks: increment(1),
      lastActive: new Date().toISOString(),
    }, { merge: true }),
  ]);
}

function buildPremiumExperimentCounterField(
  variant: PremiumAccessExperimentVariant,
  action: PremiumExperimentInteractionAction
): string {
  return `premiumExperiment_${variant}_${action}`;
}

export async function recordPremiumExperimentInteraction(params: {
  uid: string;
  variant: PremiumAccessExperimentVariant;
  action: PremiumExperimentInteractionAction;
}): Promise<void> {
  const now = new Date().toISOString();
  const counterField = buildPremiumExperimentCounterField(params.variant, params.action);

  await Promise.all([
    setDoc(
      doc(db, 'analytics_daily', todayKey()),
      {
        [counterField]: increment(1),
      },
      { merge: true }
    ),
    setDoc(
      doc(db, 'analytics_users', params.uid),
      {
        [counterField]: increment(1),
        lastActive: now,
      },
      { merge: true }
    ),
  ]);
}

export async function recordVoiceToggle(): Promise<void> {
  await setDoc(doc(db, 'analytics_daily', todayKey()), {
    voiceToggles: increment(1),
  }, { merge: true });
}

