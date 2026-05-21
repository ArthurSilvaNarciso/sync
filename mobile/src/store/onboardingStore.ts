import { create } from 'zustand';
import { SportLevel, OnboardingData } from '../types';

interface OnboardingState extends OnboardingData {
  setSports: (sports: string[]) => void;
  setLevel: (level: SportLevel) => void;
  setObjectives: (objectives: string[]) => void;
  setAvailability: (availability: string[]) => void;
  setLocation: (lat: number, lng: number, city?: string) => void;
  getData: () => OnboardingData;
  reset: () => void;
}

const initialState: OnboardingData = {
  sports: [],
  level: SportLevel.BEGINNER,
  objectives: [],
  availability: [],
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,

  setSports: (sports) => set({ sports }),
  setLevel: (level) => set({ level }),
  setObjectives: (objectives) => set({ objectives }),
  setAvailability: (availability) => set({ availability }),
  setLocation: (latitude, longitude, city) =>
    set({ latitude, longitude, city }),

  getData: () => {
    const state = get();
    return {
      sports: state.sports,
      level: state.level,
      objectives: state.objectives,
      availability: state.availability,
      latitude: state.latitude,
      longitude: state.longitude,
      city: state.city,
    };
  },

  reset: () => set(initialState),
}));
