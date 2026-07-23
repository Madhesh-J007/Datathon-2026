import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "../../locales/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  translateData: (text?: string) => string;
}

const dataDictionary: Record<string, string> = {
  // --- Crime Types ---
  "BURGLARY": "ಕನ್ನಗಳವು (ಮನೆಯಲ್ಲಿ ಕಳವು)",
  "Burglary": "ಕನ್ನಗಳವು (ಮನೆಯಲ್ಲಿ ಕಳವು)",
  "Burglary By Night": "ರಾತ್ರಿ ವೇಳೆಯ ಕನ್ನಗಳವು",
  "ROBBERY": "ದರೋಡೆ ಪ್ರಕರಣ",
  "Robbery": "ದರೋಡೆ ಪ್ರಕರಣ",
  "MURDER": "ಕೊಲೆ ಪ್ರಕರಣ",
  "Murder": "ಕೊಲೆ ಪ್ರಕರಣ",
  "CYBER CRIME": "ಸೈಬರ್ ಅಪರಾಧ",
  "Cyber Crime": "ಸೈಬರ್ ಅಪರಾಧ",
  "MOTOR VEHICLE THEFT": "ಮೋಟಾರು ವಾಹನ ಕಳವು",
  "Motor Vehicle Theft": "ಮೋಟಾರು ವಾಹನ ಕಳವು",
  "CHEATING": "ವಂಚನೆ ಪ್ರಕರಣ",
  "Cheating": "ವಂಚನೆ ಪ್ರಕರಣ",
  "CHAIN SNATCHING": "ಚೈನ್ ಕಸಿ ಪ್ರಕರಣ",
  "Chain Snatching": "ಚೈನ್ ಕಸಿ ಪ್ರಕರಣ",
  "KIDNAPPING": "ಅಪಹರಣ ಪ್ರಕರಣ",
  "Kidnapping": "ಅಪಹರಣ ಪ್ರಕರಣ",
  "RIOTS": "ಗಲಭೆ / ಕೋಮು ಗಲಭೆ",
  "Riots": "ಗಲಭೆ / ಕೋಮು ಗಲಭೆ",
  "POCSO": "ಪೋಕ್ಸೊ ಕಾಯ್ದೆ",
  "THEFT": "ಕಳವು / ಕಳ್ಳತನ",
  "Theft": "ಕಳವು / ಕಳ್ಳತನ",
  "NDPS": "ಮಾದಕ ದ್ರವ್ಯ ನಿಗ್ರಹ ಕಾಯ್ದೆ (NDPS)",

  // --- Districts ---
  "Bengaluru City": "ಬೆಂಗಳೂರು ನಗರ",
  "Mysuru City": "ಮೈಸೂರು ನಗರ",
  "Hubballi-Dharwad": "ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ",
  "Mangaluru City": "ಮಂಗಳೂರು ನಗರ",
  "Belagavi": "ಬೆಳಗಾವಿ",
  "Kalaburagi": "ಕಲಬುರಗಿ",
  "Ballari": "ಬಳ್ಳಾರಿ",
  "Shivamogga": "ಶಿವಮೊಗ್ಗ",
  "Tumakuru": "ತುಮಕೂರು",
  "Udupi": "ಉಡುಪಿ",
  "Kolar": "ಕೋಲಾರ",
  "Davanagere": "ದಾವಣಗೆರೆ",

  // --- Statuses & Priorities ---
  "Under Investigation": "ತನಿಖೆಯ ಹಂತದಲ್ಲಿದೆ",
  "Chargesheeted": "ದೋಷಾರೋಪಣೆ ಪಟ್ಟಿ ಸಲ್ಲಿಕೆ",
  "Pending Review": "ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ ಇದೆ",
  "Pending Approval": "ಅನುಮೋದನೆಗೆ ಬಾಕಿ ಇದೆ",
  "Closed": "ಪ್ರಕರಣ ಮುಕ್ತಾಯಗೊಂಡಿದೆ",
  "High": "ಹೆಚ್ಚಿನ ಆದ್ಯತೆ",
  "Medium": "ಮಧ್ಯಮ ಆದ್ಯತೆ",
  "Low": "ಕಡಿಮೆ ಆದ್ಯತೆ",
  "Active": "ಸಕ್ರಿಯ",

  // --- Victim & Accused Relations ---
  "Stranger": "ಅಪರಿಚಿತ ವ್ಯಕ್ತಿ",
  "Friend": "ಸ್ನೇಹಿತ",
  "Relative": "ಸಂಬಂಧಿ",
  "Acquaintance": "ಪರಿಚಿತ ವ್ಯಕ್ತಿ",

  // --- Evidence Types ---
  "CCTV Footage": "ಸಿಸಿಟಿವಿ ದೃಶ್ಯಾವಳಿ",
  "Crime Scene Picture": "ಅಪರಾಧ ಸ್ಥಳದ ಛಾಯಾಚಿತ್ರ",
  "Legal Document": "ಕಾನೂನು ದಾಖಲೆ / ಎಫ್.ಐ.ಆರ್",
  "Forensic DNA Report": "ವಿಧಿವಿಜ್ಞಾನ ಡಿಎನ್‌ಎ ವರದಿ",
  "Recovered Weapon": "ವಶಪಡಿಸಿಕೊಂಡ ಮಾರಕ ಆಯುಧ",
  "Mobile Telemetry": "ಮೊಬೈಲ್ ಕರೆ ವಿವರಗಳ ದಾಖಲೆ",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("ksp_language");
    return saved === "kn" || saved === "en" ? saved : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ksp_language", lang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    if (translations["en"][key]) {
      return translations["en"][key];
    }
    return fallback || key;
  };

  const translateData = (text?: string): string => {
    if (!text) return "";
    if (language === "en") return text;

    const trimmed = text.trim();
    if (dataDictionary[trimmed]) {
      return dataDictionary[trimmed];
    }

    let translated = text;
    translated = translated.replace(/The complainant reported that/gi, "ದೂರುದಾರರು ತಿಳಿಸಿದಂತೆ");
    translated = translated.replace(/unknown miscreants/gi, "ಅಪರಿಚಿತ ದುಷ್ಕರ್ಮಿಗಳು");
    translated = translated.replace(/broke into/gi, "ಅಕ್ರಮವಾಗಿ ಪ್ರವೇಶಿಸಿ");
    translated = translated.replace(/stolen gold ornaments/gi, "ಬಂಗಾರದ ಆಭರಣಗಳನ್ನು ಕಳವು ಮಾಡಿದ್ದಾರೆ");
    translated = translated.replace(/CCTV footage captured/gi, "ಸಿಸಿಟಿವಿ ದೃಶ್ಯಾವಳಿಯಲ್ಲಿ ದಾಖಲಾಗಿದೆ");
    translated = translated.replace(/Accused arrested/gi, "ಆರೋಪಿಯನ್ನು ಬಂಧಿಸಲಾಗಿದೆ");
    translated = translated.replace(/Seized weapon/gi, "ಮಾರಕ ಆಯುಧವನ್ನು ವಶಪಡಿಸಿಕೊಳ್ಳಲಾಗಿದೆ");
    translated = translated.replace(/Under Investigation/gi, "ತನಿಖೆಯಲ್ಲಿದೆ");
    translated = translated.replace(/Chargesheeted/gi, "ದೋಷಾರೋಪಣೆ ಪಟ್ಟಿ ಸಲ್ಲಿಕೆ");

    return translated;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateData }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
