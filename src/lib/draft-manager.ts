import type { ResumeData } from "@/types/resume";

const DRAFT_KEY = "resume-draft";
const DRAFT_TIMESTAMP_KEY = "resume-draft-timestamp";

export const draftManager = {
  // Save draft to localStorage
  saveDraft: (data: ResumeData) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      localStorage.setItem(DRAFT_TIMESTAMP_KEY, new Date().toISOString());
      return true;
    } catch (error) {
      console.error("Failed to save draft:", error);
      return false;
    }
  },

  // Load draft from localStorage
  loadDraft: (): { data: ResumeData; timestamp: string } | null => {
    try {
      const draftData = localStorage.getItem(DRAFT_KEY);
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);

      if (!draftData) {
        return null;
      }

      return {
        data: JSON.parse(draftData) as ResumeData,
        timestamp: timestamp || "",
      };
    } catch (error) {
      console.error("Failed to load draft:", error);
      return null;
    }
  },

  // Clear draft from localStorage
  clearDraft: () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear draft:", error);
      return false;
    }
  },

  // Check if draft exists
  hasDraft: (): boolean => {
    try {
      return localStorage.getItem(DRAFT_KEY) !== null;
    } catch (error) {
      console.error("Failed to check draft:", error);
      return false;
    }
  },

  // Get draft age in minutes
  getDraftAge: (): number | null => {
    try {
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
      if (!timestamp) {
        return null;
      }

      const draftTime = new Date(timestamp).getTime();
      const now = new Date().getTime();
      const ageInMinutes = Math.floor((now - draftTime) / (1000 * 60));

      return ageInMinutes;
    } catch (error) {
      console.error("Failed to get draft age:", error);
      return null;
    }
  },
};
