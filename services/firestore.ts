import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

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
