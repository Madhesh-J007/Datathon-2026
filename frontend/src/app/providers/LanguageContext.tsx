import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "../../locales/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  translateData: (text?: string) => string;
}

// Extensive dictionary for dynamic database data, terms, locations & statuses
const dataDictionary: Record<string, string> = {
  // --- Crime Head & Group Names ---
  "BURGLARY": "ಕನ್ನಗಳವು (ಮನೆಯಲ್ಲಿ ಕಳವು)",
  "Burglary": "ಕನ್ನಗಳವು (ಮನೆಯಲ್ಲಿ ಕಳವು)",
  "Burglary By Night": "ರಾತ್ರಿ ವೇಳೆಯ ಕನ್ನಗಳವು",
  "Burglary By Day": "ಹಗಲು ವೇಳೆಯ ಕನ್ನಗಳವು",
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
  "POCSO": "ಪೋಕ್ಸೊ (ಮಕ್ಕಳ ಮೇಲಿನ ಲೈಂಗಿಕ ದೌರ್ಜನ್ಯ ತಡೆ ಕಾಯ್ದೆ)",
  "THEFT": "ಕಳವು / ಕಳ್ಳತನ",
  "Theft": "ಕಳವು / ಕಳ್ಳತನ",
  "NDPS": "ಮಾದಕ ದ್ರವ್ಯ ನಿಗ್ರಹ ಕಾಯ್ದೆ (NDPS)",
  "ARSON": "ಬೆಂಕಿ ಅವಘಡ / ದುಷ್ಕೃತ್ಯ",
  "ASSAULT": "ಹಲ್ಲೆ ಪ್ರಕರಣ",
  "DOWRY DEATH": "ವರದಕ್ಷಿಣೆ ಸಾವು",
  "EXTORTION": "ಹಪ್ತಾ ವಸೂಲಿ / ಹೆದರಿಸಿ ಹಣ ಕಸಿಯುವುದು",

  // --- Districts & Locations ---
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
  "Vijayapura": "ವಿಜಯಪುರ",
  "Hassan": "ಹಾಸನ",
  "Chikkamagaluru": "ಚಿಕ್ಕಮಗಳೂರು",
  "Mandya": "ಮಂಡ್ಯ",
  "Ramanagara": "ರಾಮನಗರ",
  "Bagalkot": "ಬಾಗಲಕೋಟೆ",
  "Bidar": "ಬೀದರ್",
  "Chitradurga": "ಚಿತ್ರದುರ್ಗ",
  "Chamarajanagar": "ಚಾಮರಾಜನಗರ",
  "Gadag": "ಗದಗ",
  "Haveri": "ಹಾವೇರಿ",
  "Kodagu": "ಕೊಡಗು",
  "Koppal": "ಕೊಪ್ಪಳ",
  "Raichur": "ರಾಯಚೂರು",
  "Yadgir": "ಯಾದಗಿರಿ",
  "Uttara Kannada": "ಉತ್ತರ ಕನ್ನಡ",
  "Dakshina Kannada": "ದಕ್ಷಿಣ ಕನ್ನಡ",

  // --- Police Stations ---
  "Koramangala PS": "ಕೋರಮಂಗಲ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Jayanagar PS": "ಜಯನಗರ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Indiranagar PS": "ಇಂದಿರಾನಗರ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Electronic City PS": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Whitefield PS": "ವೈಟ್‌ಫೀಲ್ಡ್ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Cubbon Park PS": "ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Commercial Street PS": "ಕಮರ್ಷಿಯಲ್ ಸ್ಟ್ರೀಟ್ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Malleswaram PS": "ಮಲ್ಲೇಶ್ವರಂ ಪೊಲೀಸ್ ಠಾಣೆ",
  "Rajajinagar PS": "ರಾಜಾಜಿನಗರ ಪೊಲೀಸ್ ಠಾಣೆ",

  // --- Statuses & Priorities ---
  "Under Investigation": "ತನಿಖೆಯ ಹಂತದಲ್ಲಿದೆ",
  "Chargesheeted": "ದೋಷಾರೋಪಣೆ ಪಟ್ಟಿ ಸಲ್ಲಿಕೆ (ಚಾರ್ಜ್‌ಶೀಟ್)",
  "Pending Review": "ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ ಇದೆ",
  "Pending Approval": "ಅನುಮೋದನೆಗೆ ಬಾಕಿ ಇದೆ",
  "Closed": "ಪ್ರಕರಣ ಮುಕ್ತಾಯಗೊಂಡಿದೆ",
  "High": "ಹೆಚ್ಚಿನ ಆದ್ಯತೆ",
  "Medium": "ಮಧ್ಯಮ ಆದ್ಯತೆ",
  "Low": "ಕಡಿಮೆ ಆದ್ಯತೆ",
  "Active": "ಸಕ್ರಿಯ ತನಿಖೆ",
  "Critical": "ಗಂಭೀರ ರಿಸ್ಕ್ 🔴",
  "Standard": "ಸಾಮಾನ್ಯ",
  "Overdue": "ಸಮಯ ಮೀರಿದೆ",
  "Completed": "ಪೂರ್ಣಗೊಂಡಿದೆ",

  // --- Victim & Accused Relations ---
  "Stranger": "ಅಪರಿಚಿತ ವ್ಯಕ್ತಿ",
  "Friend": "ಸ್ನೇಹಿತ",
  "Relative": "ಸಂಬಂಧಿಕರು",
  "Acquaintance": "ಪರಿಚಿತ ವ್ಯಕ್ತಿ",
  "Co-worker": "ಸಹೋದ್ಯೋಗಿ",
  "Neighbor": "ನೆರೆಹೊರೆಯವರು",
  "Spouse": "ಪತಿ/ಪತ್ನಿ",

  // --- Evidence Types ---
  "CCTV Footage": "📹 ಸಿಸಿಟಿವಿ ದೃಶ್ಯಾವಳಿ",
  "Crime Scene Picture": "🖼️ ಅಪರಾಧ ಸ್ಥಳದ ಛಾಯಾಚಿತ್ರ",
  "Legal Document": "📄 ಕಾನೂನು ದಾಖಲೆ / ಎಫ್.ಐ.ಆರ್",
  "Forensic DNA Report": "🧪 ವಿಧಿವಿಜ್ಞಾನ ಡಿಎನ್‌ಎ ವರದಿ",
  "Recovered Weapon": "🔪 ವಶಪಡಿಸಿಕೊಂಡ ಮಾರಕ ಆಯುಧ",
  "Mobile Telemetry": "📱 ಮೊಬೈಲ್ ಕರೆ ವಿವರಗಳ ದಾಖಲೆ",

  // --- Officer Ranks ---
  "DGP — Director General of Police": "ಡಿಜಿಪಿ — ಪೊಲೀಸ್ ಮಹಾನಿರ್ದೇಶಕರು",
  "ADGP — Addl. Director General": "ಎಡಿಜಿಪಿ — ಹೆಚ್ಚುವರಿ ಪೊಲೀಸ್ ಮಹಾನಿರ್ದೇಶಕರು",
  "IGP — Inspector General": "ಐಜಿಪಿ — ಪೊಲೀಸ್ ಮಹಾನಿರೀಕ್ಷಕರು",
  "DIGP — Deputy Inspector General": "ಡಿಐಜಿಪಿ — ಉಪ ಪೊಲೀಸ್ ಮಹಾನಿರೀಕ್ಷಕರು",
  "SP — Superintendent of Police": "ಎಸ್ಪಿ — ಪೊಲೀಸ್ ವರಿಷ್ಠಾಧಿಕಾರಿ",
  "DySP — Deputy Superintendent": "ಡಿವೈಎಸ್ಪಿ — ಉಪ ಪೊಲೀಸ್ ವರಿಷ್ಠಾಧಿಕಾರಿ",
  "PI — Police Inspector": "ಪಿಐ — ಪೊಲೀಸ್ ಇನ್ಸ್‌ಪೆಕ್ಟರ್",
  "PSI — Sub Inspector of Police": "ಪಿಎಸ್‌ಐ — ಪೊಲೀಸ್ ಸಬ್ ಇನ್ಸ್‌ಪೆಕ್ಟರ್",
  "ASI — Assistant Sub Inspector": "ಎಎಸ್‌ಐ — ಸಹಾಯಕ ಸಬ್ ಇನ್ಸ್‌ಪೆಕ್ಟರ್",
  "HC — Head Constable": "ಹೆಚ್‌ಸಿ — ಹೆಡ್ ಕಾನ್‌ಸ್ಟೇಬಲ್",
  "PC — Police Constable": "ಪಿಸಿ — ಪೊಲೀಸ್ ಕಾನ್‌ಸ್ಟೇಬಲ್",
  "System Administrator": "ಸಿಸ್ಟಮ್ ನಿರ್ವಾಹಕರು",

  // --- UI Action Phrases & Summaries ---
  "Directly assigned investigations.": "ನಿಮಗೆ ನೇರವಾಗಿ ನಿಯೋಜಿಸಲಾದ ತನಿಖೆಗಳು.",
  "Required chargesheet submissions.": "ಸಲ್ಲಿಸಬೇಕಾದ ಕಡ್ಡಾಯ ದೋಷಾರೋಪಣೆ ಪಟ್ಟಿಗಳು.",
  "Successfully closed cases.": "ಯಶಸ್ವಿಯಾಗಿ ಮುಕ್ತಾಯಗೊಂಡ ಪ್ರಕರಣಗಳು.",
  "Overall investigator capacity.": "ಒಟ್ಟಾರೆ ತನಿಖಾಧಿಕಾರಿಗಳ ಕಾರ್ಯಾಚರಣೆಯ ಸಾಮರ್ಥ್ಯ.",
  "Total ongoing cases registered across Karnataka.": "ಕರ್ನಾಟಕದಾದ್ಯಂತ ನೋಂದಾಯಿಸಲಾದ ಒಟ್ಟು ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು.",
  "High severity risk score classifications.": "ಹೆಚ್ಚಿನ ತೀವ್ರತೆಯ ರಿಸ್ಕ್ ವರ್ಗೀಕರಣಗಳು.",
  "Real-time situational intelligence and proactive decision support": "ನೈಜ ಸಮಯದ ತನಿಖಾ ಗುಪ್ತಚರ ಮತ್ತು ನಿರ್ಧಾರ ಬೆಂಬಲ ವ್ಯವಸ್ಥೆ",
  "Mission Critical Alerts Queue": "ಅತ್ಯಂತ ತುರ್ತು ಕಾರ್ಯಾಚರಣೆಯ ಸೂಚನೆಗಳು",
  "AI Recommended Actions Center": "ಎಐ ತನಿಖಾ ಶಿಫಾರಸುಗಳ ಕೇಂದ್ರ",
  "Chronological Mission Timeline": "ಕಾಲಾನುಕ್ರಮದ ತನಿಖಾ ಟೈಮ್‌ಲೈನ್",
  "Repeat Offender Match": "ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿ ಗುರುತು ಹಚ್ಚಲಾಗಿದೆ",
  "Hotspot Re-calculated": "ಹಾಟ್‌ಸ್ಪಾಟ್ ವಲಯಗಳನ್ನು ಮರು-ಲೆಕ್ಕಾಚಾರ ಮಾಡಲಾಗಿದೆ",
  "Case Similarity Identified": "ಹೋಲುವ ಪ್ರಕರಣದ ವೆಕ್ಟರ್ ಗುರುತಿಸಲಾಗಿದೆ",
  "Dossier Assignment Alert": "ಕೇಸ್ ಫೈಲ್ ನಿಯೋಜನೆಯ ಸೂಚನೆ",
  "Risk Score Elevated": "ಅಪರಾಧ ರಿಸ್ಕ್ ಸ್ಕೋರ್ ಹೆಚ್ಚಿಸಲಾಗಿದೆ"
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
    
    // 1. Direct dictionary match
    if (dataDictionary[trimmed]) {
      return dataDictionary[trimmed];
    }

    // 2. Pattern sentence replacements for FIR descriptions & AI narratives
    let translated = text;

    // Sentence structure replacements
    translated = translated.replace(/The complainant reported that/gi, "ದೂರುದಾರರು ಸಲ್ಲಿಸಿದ ದೂರಿನಂತೆ");
    translated = translated.replace(/unknown miscreants/gi, "ಅಪರಿಚಿತ ದುಷ್ಕರ್ಮಿಗಳು");
    translated = translated.replace(/broke into/gi, "ಅಕ್ರಮವಾಗಿ ಪ್ರವೇಶಿಸಿ");
    translated = translated.replace(/residential house/gi, "ವಾಸದ ಮನೆಗೆ");
    translated = translated.replace(/stolen gold ornaments/gi, "ಬಂಗಾರದ ಆಭರಣಗಳನ್ನು ಕಳವು ಮಾಡಿದ್ದಾರೆ");
    translated = translated.replace(/stolen vehicle/gi, "ಕಳುವಾದ ವಾಹನದಲ್ಲಿ");
    translated = translated.replace(/during night hours/gi, "ರಾತ್ರಿ ವೇಳೆಯಲ್ಲಿ");
    translated = translated.replace(/CCTV footage captured/gi, "ಸಿಸಿಟಿವಿ ದೃಶ್ಯಾವಳಿಯಲ್ಲಿ ಶಂಕಿತನ ಚಲನವಲನ ದಾಖಲಾಗಿದೆ");
    translated = translated.replace(/Accused arrested by/gi, "ಆರೋಪಿಯನ್ನು ಬಂಧಿಸಲಾಗಿದೆ");
    translated = translated.replace(/Seized weapon/gi, "ಮಾರಕ ಆಯುಧವನ್ನು ವಶಪಡಿಸಿಕೊಳ್ಳಲಾಗಿದೆ");
    translated = translated.replace(/Under Investigation/gi, "ತನಿಖೆಯಲ್ಲಿದೆ");
    translated = translated.replace(/Chargesheeted/gi, "ದೋಷಾರೋಪಣೆ ಪಟ್ಟಿ ಸಲ್ಲಿಕೆ");
    translated = translated.replace(/AI recommended action/gi, "ಎಐ ಕಾರ್ಯಾಚರಣೆಯ ಶಿಫಾರಸು");
    translated = translated.replace(/Patrol deployments reinforcement suggested/gi, "ಗಸ್ತು ಪಡೆ ಹೆಚ್ಚಳಕ್ಕೆ ಎಐ ಶಿಫಾರಸು ಮಾಡಿದೆ");
    translated = translated.replace(/Security protocols active/gi, "ಸುರಕ್ಷತಾ ಪ್ರೋಟೋಕಾಲ್ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ");
    translated = translated.replace(/Escalated case file/gi, "ಉನ್ನತ ಮಟ್ಟದ ತನಿಖೆಗೆ ವರ್ಗಾಯಿಸಲಾಗಿದೆ");
    translated = translated.replace(/Vector pgvector similarity indices mapped/gi, "ವೆಕ್ಟರ್ ಹೋಲಿಕೆ ಆಧಾರಿತ ಶಂಕಿತರ ಪಟ್ಟಿ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ");
    translated = translated.replace(/Burglary probability spikes/gi, "ಕಳವು ಕೃತ್ಯ ನಡೆಯುವ ಸಂಭವನೀಯತೆ ಹೆಚ್ಚಾಗಿದೆ");
    translated = translated.replace(/Telemetry received/gi, "ಟೆಲಿಮೆಟ್ರಿ ಮಾಹಿತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ");

    // Word-level fallback replacements for keywords inside strings
    Object.keys(dataDictionary).forEach((key) => {
      if (key.length > 3 && translated.includes(key)) {
        translated = translated.split(key).join(dataDictionary[key]);
      }
    });

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
