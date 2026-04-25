import {
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { DailyAnalytics, UserAnalytics } from '@/models/analytics';
import { MealEntry } from '@/models/domain';
import { MacroGoals } from '@/store/app-store';
import { db } from './firebase';

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

// ── Analytics writes ────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordSessionStart(uid: string, inputMethod: 'text' | 'voice', email?: string): Promise<void> {
  const dateKey = todayKey();
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', dateKey), {
      sessionsStarted: increment(1),
      activeUsers: arrayUnion(uid),
      ...(inputMethod === 'voice' ? { voiceModeSessions: increment(1) } : {}),
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

export async function recordSessionCompleted(uid: string, clarificationTurns: number, durationSeconds: number): Promise<void> {
  const dateKey = todayKey();
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', dateKey), {
      sessionsCompleted: increment(1),
      clarificationsTotal: increment(clarificationTurns),
      totalSessionDuration: increment(durationSeconds),
    }, { merge: true }),
    setDoc(doc(db, 'analytics_users', uid), {
      totalSessionsCompleted: increment(1),
    }, { merge: true }),
  ]);
}

export async function recordSessionAbandoned(): Promise<void> {
  await setDoc(doc(db, 'analytics_daily', todayKey()), {
    sessionsAbandoned: increment(1),
  }, { merge: true });
}

export async function recordMealSaved(uid: string, calories: number): Promise<void> {
  const dateKey = todayKey();
  await Promise.all([
    setDoc(doc(db, 'analytics_daily', dateKey), {
      mealsLogged: increment(1),
      totalCalories: increment(calories),
      activeUsers: arrayUnion(uid),
    }, { merge: true }),
    setDoc(doc(db, 'analytics_users', uid), {
      uid,
      lastActive: new Date().toISOString(),
      totalMeals: increment(1),
    }, { merge: true }),
  ]);
}

// ── Analytics reads ─────────────────────────────────────────────────────────

export async function fetchDailyAnalytics(days: number): Promise<DailyAnalytics[]> {
  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dateKeys.push(d.toISOString().slice(0, 10));
  }
  const snaps = await Promise.all(dateKeys.map((key) => getDoc(doc(db, 'analytics_daily', key))));
  return snaps.map((snap, idx) => ({
    date: dateKeys[idx],
    mealsLogged: 0,
    sessionsStarted: 0,
    sessionsCompleted: 0,
    sessionsAbandoned: 0,
    clarificationsTotal: 0,
    voiceModeSessions: 0,
    totalCalories: 0,
    totalSessionDuration: 0,
    activeUsers: [],
    ...snap.data(),
  }));
}

export async function fetchAllUserAnalytics(): Promise<UserAnalytics[]> {
  const snap = await getDocs(collection(db, 'analytics_users'));
  return snap.docs.map((d) => d.data() as UserAnalytics);
}

type MealDayAggregate = { meals: number; calories: number; uids: Set<string> };

export async function fetchMealHistory(days: number): Promise<Map<string, MealDayAggregate>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString();

  const snap = await getDocs(
    query(collectionGroup(db, 'meals'), where('timestamp', '>=', cutoffISO))
  );

  const map = new Map<string, MealDayAggregate>();
  snap.docs.forEach((d) => {
    const data = d.data() as { timestamp: string; calories: number };
    const dateKey = data.timestamp.slice(0, 10);
    // Extract uid from path: users/{uid}/meals/{mealId}
    const uid = d.ref.parent.parent?.id ?? 'unknown';
    const existing = map.get(dateKey) ?? { meals: 0, calories: 0, uids: new Set<string>() };
    existing.meals += 1;
    existing.calories += data.calories ?? 0;
    existing.uids.add(uid);
    map.set(dateKey, existing);
  });

  return map;
}
