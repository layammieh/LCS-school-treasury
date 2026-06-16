import { create } from 'zustand';

interface SchoolYearState {
  schoolYear: string;
  setSchoolYear: (year: string) => void;
  getSchoolYear: () => string;
}

export const useSchoolYearStore = create<SchoolYearState>((set, get) => ({
  schoolYear: localStorage.getItem('selected_school_year') || '2026-2027',

  setSchoolYear: (year: string) => {
    localStorage.setItem('selected_school_year', year);
    set({ schoolYear: year });
  },

  getSchoolYear: () => {
    return get().schoolYear;
  },
}));
