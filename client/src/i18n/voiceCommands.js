// Voice command phrases per language. English phrases are always merged in
// automatically (see getVoiceCommands) since Indian speakers commonly mix
// English words into another language mid-sentence ("Hinglish" etc.), so a
// command should still work even if only part of it was spoken in English.

// Shared BCP-47 language tags for both speech recognition (STT) and speech
// synthesis (TTS), tuned for Indian language/accent variants where available.
export const SPEECH_LANG_TAGS = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

// Chrome/Edge's SpeechRecognition often appends a trailing full stop (and
// occasionally extra whitespace) to a "final" one-shot result, even though
// nothing was actually dictated as punctuation. Left in place, that trailing
// character breaks every downstream `.includes()` comparison this file and
// AccessBar.jsx do (a job title never "includes" a query that ends in a
// stray period) — which is what made commands like "apply for <job>" and,
// less obviously, plain navigation phrases intermittently fail to match.
// Every raw transcript should be run through this before matching anything.
export function normalizeSpeech(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?؟।\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const VOICE_COMMANDS = {
  en: {
    readPage: ['read page', 'read this page', 'read the page', 'read aloud', 'read this'],
    stopReading: ['stop reading', 'stop speaking', 'stop'],
    logout: ['log out', 'logout', 'sign out', 'signout'],
    contrast: ['high contrast', 'contrast mode', 'toggle contrast'],
    biggerText: ['bigger text', 'increase text', 'zoom in', 'text bigger'],
    smallerText: ['smaller text', 'decrease text', 'zoom out', 'text smaller'],
    apply: ['apply', 'fill application', 'open the form', 'fill out the application'],
    submit: ['submit application', 'submit the application', 'send application', 'submit form', 'submit'],
    readJob: ['read job', 'read description', 'listen to job', 'read this job'],
    save: ['save profile', 'save my profile', 'find matches', 'find my matches', 'save'],
    login: ['log in', 'sign in'],
    signup: ['sign up', 'create account', 'register now'],
  },
  hi: {
    readPage: ['पेज पढ़ो', 'पेज पढ़ें', 'पूरा पेज पढ़ो', 'यह पेज पढ़ें'],
    stopReading: ['पढ़ना बंद करो', 'रुको', 'बंद करो'],
    logout: ['लॉग आउट करो', 'लॉग आउट', 'साइन आउट करो', 'साइन आउट'],
    contrast: ['हाई कॉन्ट्रास्ट', 'कॉन्ट्रास्ट'],
    biggerText: ['टेक्स्ट बड़ा करो', 'बड़ा टेक्स्ट', 'ज़ूम इन'],
    smallerText: ['टेक्स्ट छोटा करो', 'छोटा टेक्स्ट', 'ज़ूम आउट'],
    apply: ['आवेदन करो', 'अप्लाई करो', 'फॉर्म खोलो'],
    submit: ['आवेदन जमा करो', 'सबमिट करो', 'फॉर्म जमा करो'],
    readJob: ['नौकरी पढ़ो', 'विवरण पढ़ो', 'नौकरी सुनो'],
    save: ['प्रोफ़ाइल सहेजो', 'सेव करो', 'मिलान खोजो'],
    login: ['लॉग इन करो', 'साइन इन करो'],
    signup: ['साइन अप करो', 'खाता बनाओ', 'रजिस्टर करो'],
  },
  ta: {
    readPage: ['பக்கத்தை படி', 'பக்கத்தைப் படியுங்கள்', 'இதை படி'],
    stopReading: ['படிப்பதை நிறுத்து', 'நிறுத்து'],
    logout: ['வெளியேறு', 'லாக் அவுட்'],
    contrast: ['காண்ட்ராஸ்ட்', 'உயர் காண்ட்ராஸ்ட்'],
    biggerText: ['பெரிய எழுத்து', 'ஜூம் இன்'],
    smallerText: ['சிறிய எழுத்து', 'ஜூம் அவுட்'],
    apply: ['விண்ணப்பிக்க', 'படிவத்தைத் திற'],
    submit: ['விண்ணப்பத்தை சமர்ப்பிக்க', 'சமர்ப்பிக்க'],
    readJob: ['வேலையைப் படி', 'விளக்கத்தைப் படி'],
    save: ['சுயவிவரத்தை சேமி', 'சேமி', 'பொருத்தங்களைத் தேடு'],
    login: ['உள்நுழைய'],
    signup: ['பதிவு செய்ய', 'கணக்கு உருவாக்கு'],
  },
  te: {
    readPage: ['పేజీ చదవండి', 'ఈ పేజీ చదవండి'],
    stopReading: ['చదవడం ఆపండి', 'ఆపండి'],
    logout: ['లాగ్ అవుట్', 'సైన్ అవుట్'],
    contrast: ['కాంట్రాస్ట్', 'హై కాంట్రాస్ట్'],
    biggerText: ['పెద్ద అక్షరాలు', 'జూమ్ ఇన్'],
    smallerText: ['చిన్న అక్షరాలు', 'జూమ్ అవుట్'],
    apply: ['దరఖాస్తు చేయండి', 'ఫారం తెరవండి'],
    submit: ['దరఖాస్తు సమర్పించండి', 'సమర్పించండి'],
    readJob: ['ఉద్యోగం చదవండి', 'వివరణ చదవండి'],
    save: ['ప్రొఫైల్ సేవ్ చేయండి', 'సేవ్ చేయండి', 'సరిపోలికలు వెతకండి'],
    login: ['లాగిన్ చేయండి'],
    signup: ['సైన్ అప్ చేయండి', 'ఖాతా సృష్టించండి'],
  },
  kn: {
    readPage: ['ಪುಟ ಓದಿ', 'ಈ ಪುಟವನ್ನು ಓದಿ', 'ಪುಟವನ್ನು ಓದಿ'],
    stopReading: ['ಓದುವುದನ್ನು ನಿಲ್ಲಿಸಿ', 'ನಿಲ್ಲಿಸಿ'],
    logout: ['ಲಾಗ್ ಔಟ್ ಮಾಡಿ', 'ಲಾಗ್ ಔಟ್', 'ಸೈನ್ ಔಟ್ ಮಾಡಿ'],
    contrast: ['ಹೈ ಕಾಂಟ್ರಾಸ್ಟ್', 'ಕಾಂಟ್ರಾಸ್ಟ್'],
    biggerText: ['ದೊಡ್ಡ ಪಠ್ಯ', 'ಪಠ್ಯ ದೊಡ್ಡದು ಮಾಡಿ', 'ಜೂಮ್ ಇನ್'],
    smallerText: ['ಚಿಕ್ಕ ಪಠ್ಯ', 'ಪಠ್ಯ ಚಿಕ್ಕದು ಮಾಡಿ', 'ಜೂಮ್ ಔಟ್'],
    // "apply" and "submit" must not share phrases: on the job page "apply"
    // is checked first, so an overlapping phrase would only ever focus the
    // form and never submit it.
    apply: ['ಅರ್ಜಿ ಹಾಕಿ', 'ಅಪ್ಲೈ ಮಾಡಿ', 'ಫಾರ್ಮ್ ತೆರೆಯಿರಿ'],
    submit: ['ಅರ್ಜಿ ಸಲ್ಲಿಸಿ', 'ಸಲ್ಲಿಸಿ', 'ಸಬ್ಮಿಟ್ ಮಾಡಿ', 'ಫಾರ್ಮ್ ಸಲ್ಲಿಸಿ'],
    readJob: ['ಉದ್ಯೋಗ ಓದಿ', 'ವಿವರಣೆ ಓದಿ'],
    save: ['ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ', 'ಉಳಿಸಿ', 'ಹೊಂದಾಣಿಕೆಗಳನ್ನು ಹುಡುಕಿ'],
    login: ['ಲಾಗಿನ್ ಮಾಡಿ'],
    signup: ['ಸೈನ್ ಅಪ್ ಮಾಡಿ', 'ಖಾತೆ ರಚಿಸಿ'],
  },
  ml: {
    readPage: ['പേജ് വായിക്കൂ', 'ഈ പേജ് വായിക്കൂ'],
    stopReading: ['വായന നിർത്തുക', 'നിർത്തുക'],
    logout: ['ലോഗ് ഔട്ട് ചെയ്യൂ', 'ലോഗ് ഔട്ട്', 'സൈൻ ഔട്ട് ചെയ്യൂ'],
    contrast: ['ഹൈ കോൺട്രാസ്റ്റ്', 'കോൺട്രാസ്റ്റ്'],
    biggerText: ['വലിയ ടെക്സ്റ്റ്', 'ടെക്സ്റ്റ് വലുതാക്കൂ', 'സൂം ഇൻ'],
    smallerText: ['ചെറിയ ടെക്സ്റ്റ്', 'ടെക്സ്റ്റ് ചെറുതാക്കൂ', 'സൂം ഔട്ട്'],
    apply: ['അപേക്ഷിക്കുക', 'അപേക്ഷിക്കൂ', 'ഫോം തുറക്കൂ'],
    submit: ['അപേക്ഷ സമർപ്പിക്കൂ', 'സമർപ്പിക്കൂ', 'ഫോം സമർപ്പിക്കൂ'],
    readJob: ['ജോലി വായിക്കൂ', 'വിവരണം വായിക്കൂ'],
    save: ['പ്രൊഫൈൽ സേവ് ചെയ്യൂ', 'സേവ് ചെയ്യൂ', 'പൊരുത്തങ്ങൾ കണ്ടെത്തൂ'],
    login: ['ലോഗിൻ ചെയ്യൂ'],
    signup: ['സൈൻ അപ്പ് ചെയ്യൂ', 'അക്കൗണ്ട് ഉണ്ടാക്കൂ'],
  },
};

// "apply for X" needs to extract the job name from free text. English is a
// simple prefix ("apply for X"), but Hindi/Tamil/Telugu/Kannada/Malayalam
// are (at least partly) SOV languages where the object comes BEFORE the
// verb ("X के लिए आवेदन करो" = "for X, apply"), so each needs its own
// extraction pattern. These are approximations of natural speech, same as
// the original Hindi/Tamil/Telugu patterns — good enough to catch the
// common phrasing, not a full grammar parser.
const APPLY_REGEX = {
  en: /apply (?:for|to)\s+(.+)/,
  hi: /(.+?)\s*(?:के\s*लिए)\s*(?:आवेदन|अप्लाई)/,
  ta: /(.+?)\s*(?:க்கு|க்காக)\s*(?:விண்ணப்பிக்க)/,
  te: /(.+?)\s*(?:కి|కోసం)\s*(?:దరఖాస్తు)/,
  kn: /(.+?)\s*(?:ಗೆ|ಗಾಗಿ)\s*(?:ಅರ್ಜಿ|ಅಪ್ಲೈ)/,
  ml: /(.+?)\s*(?:ന്|ക്ക്)?\s*(?:അപേക്ഷിക്ക)/,
};

// Common filler words that naturally show up around a spoken job name
// ("apply for THE CASHIER JOB", "cashier POSITION") but aren't part of the
// job's actual title/category/company, so they should be stripped before
// searching — otherwise a perfectly recognized command fails to match any
// job because the extra word breaks a plain substring check.
const APPLY_FILLER_WORDS = /\b(a|an|the|job|jobs|position|positions|role|roles|posting|postings|vacancy|vacancies|please)\b/gi;

/**
 * Returns the patterns for one command intent in the given language, always
 * merged with the English phrasing as a fallback so mixed-language speech
 * still works.
 */
export function getCommandPatterns(lang, intent) {
  const localized = (VOICE_COMMANDS[lang] && VOICE_COMMANDS[lang][intent]) || [];
  const english = VOICE_COMMANDS.en[intent] || [];
  return lang === 'en' ? english : [...localized, ...english];
}

/**
 * Tries to pull a job-name query out of an "apply for X" style phrase,
 * trying the current language's word-order pattern first, then falling
 * back to the English prefix pattern (handles code-switched speech).
 * The result is cleaned of leading articles and common filler words so it
 * matches job titles more forgivingly (e.g. "the cashier job" -> "cashier").
 */
export function extractApplyQuery(lang, saidLower) {
  const langRegex = APPLY_REGEX[lang];
  let raw = null;
  if (langRegex) {
    const m = saidLower.match(langRegex);
    if (m && m[1] && m[1].trim()) raw = m[1].trim();
  }
  if (!raw) {
    const m = saidLower.match(APPLY_REGEX.en);
    if (m && m[1] && m[1].trim()) raw = m[1].trim();
  }
  if (!raw) return null;
  const cleaned = raw.replace(APPLY_FILLER_WORDS, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || raw;
}

// Spoken names for each supported UI language, merged across all
// languages, so saying "kannada", "ಕನ್ನಡ" or "മലയാളം" is recognized no
// matter which language is currently active.
export const LANGUAGE_NAME_WORDS = {
  // Each language's name is listed in every supported script, because the
  // speech recognizer transcribes a spoken name using the script of the
  // ACTIVE recognition language (e.g. saying "Malayalam" while the app is
  // in Kannada comes back as ಮಲಯಾಳಂ, not മലയാളം).
  en: ['english', 'अंग्रेज़ी', 'अंग्रेजी', 'ஆங்கிலம்', 'ఇంగ్లీష్', 'ಇಂಗ್ಲಿಷ್', 'ഇംഗ്ലീഷ്'],
  hi: ['hindi', 'हिंदी', 'हिन्दी', 'ஹிந்தி', 'இந்தி', 'హిందీ', 'ಹಿಂದಿ', 'ഹിന്ദി'],
  ta: ['tamil', 'तमिल', 'தமிழ்', 'తమిళం', 'ತಮಿಳು', 'തമിഴ്'],
  te: ['telugu', 'तेलुगु', 'தெலுங்கு', 'తెలుగు', 'ತೆಲುಗು', 'തെലുങ്ക്'],
  kn: ['kannada', 'कन्नड़', 'कन्नड', 'கன்னடம்', 'కన్నడ', 'ಕನ್ನಡ', 'കന്നഡ'],
  ml: ['malayalam', 'मलयालम', 'மலையாளம்', 'మలయాళం', 'ಮಲಯಾಳಂ', 'മലയാളം'],
};

// Phrases (across all supported languages, English always included) that
// signal "the user wants to switch the UI language" rather than just
// mentioning a language name in passing.
const CHANGE_LANGUAGE_TRIGGERS = [
  'change language', 'switch language', 'change the language', 'set language', 'change to',
  'भाषा बदलो', 'भाषा बदलें', 'भाषा बदल दो',
  'மொழியை மாற்று', 'மொழி மாற்று', 'மொழியை மாற்றவும்',
  'భాష మార్చు', 'భాషను మార్చండి', 'భాష మార్చండి',
  'ಭಾಷೆ ಬದಲಾಯಿಸಿ', 'ಭಾಷೆ ಬದಲಿಸಿ', 'ಭಾಷೆ ಬದಲಾಯಿಸು',
  'ഭാഷ മാറ്റുക', 'ഭാഷ മാറ്റൂ', 'ഭാഷ മാറ്റാൻ',
];

/**
 * Returns a supported language code if the utterance both names a
 * supported language AND includes a "change language" style trigger
 * phrase — requiring both avoids accidentally switching languages just
 * because a language's name happened to be mentioned for some other
 * reason. Returns null if no change should happen.
 */
export function extractLanguageChange(saidLower) {
  const hasTrigger = CHANGE_LANGUAGE_TRIGGERS.some((p) => saidLower.includes(p));
  if (!hasTrigger) return null;
  const match = Object.entries(LANGUAGE_NAME_WORDS).find(([, words]) =>
    words.some((w) => saidLower.includes(w))
  );
  return match ? match[0] : null;
}

export default VOICE_COMMANDS;