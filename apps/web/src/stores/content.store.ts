import { create } from "zustand";

export interface ContentStoreState {
  activeContentId: string | null;
  selectedAiProvider: "openai" | "ollama" | "huggingface";
  isAiGenerating: boolean;
  setActiveContentId: (id: string | null) => void;
  setAiProvider: (provider: "openai" | "ollama" | "huggingface") => void;
  setIsAiGenerating: (loading: boolean) => void;
}

export const useContentStore = create<ContentStoreState>((set) => ({
  activeContentId: null,
  selectedAiProvider: "ollama",
  isAiGenerating: false,
  setActiveContentId: (id) => set({ activeContentId: id }),
  setAiProvider: (provider) => set({ selectedAiProvider: provider }),
  setIsAiGenerating: (loading) => set({ isAiGenerating: loading }),
}));
