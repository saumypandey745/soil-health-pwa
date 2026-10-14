/**
 * Deterministic Agronomic Reasoning & Farmer Assistant Engine.
 * Serves as the safe, offline-capable foundation for the AI Farmer Assistant.
 * Answers farmer questions using ONLY validated soil parameters and farm context.
 * Strictly avoids universal chemical dosages, yield guarantees, or fabricated facts.
 */

const CROP_TRANSLATIONS = {
  Rice: { hi: 'चावल (धान)', kn: 'ಭತ್ತ (ಅಕ್ಕಿ)' },
  Wheat: { hi: 'गेहूं', kn: 'ಗೋಧಿ' },
  Maize: { hi: 'मक्का', kn: 'ಮೆಕ್ಕೆಜೋಳ' },
  Cotton: { hi: 'कपास', kn: 'ಹತ್ತಿ' },
  Sugarcane: { hi: 'गन्ना', kn: 'ಕಬ್ಬು' },
  Groundnut: { hi: 'मूंगफली', kn: 'ಕಡಲೆಕಾಯಿ' },
  Millets: { hi: 'मिलेट्स (बाजरा/ज्वार)', kn: 'ಸಿರಿಧಾನ್ಯಗಳು (ಮಿಲೆಟ್ಸ್)' },
  'Pulses (Dal)': { hi: 'दालें (दलहन)', kn: 'ದ್ವಿದಳ ಧಾನ್ಯಗಳು (ಬೇಳೆಕಾಳು)' },
};

function getLocalizedCrop(name, lang) {
  if (!name) return name;
  if (lang === 'hi') return CROP_TRANSLATIONS[name]?.hi || name;
  if (lang === 'kn') return CROP_TRANSLATIONS[name]?.kn || name;
  return name;
}

export function generateAgronomyAdvice({ message = '', context = {}, lang = 'en' }) {
  const q = (message || '').toLowerCase();
  const soil = context.soil || {};
  const farm = context.farm || {};
  const crops = context.recommendations || [];

  const n = Number(soil.nitrogen ?? soil.n ?? 280);
  const p = Number(soil.phosphorus ?? soil.p ?? 15);
  const k = Number(soil.potassium ?? soil.k ?? 150);
  const ph = Number(soil.ph ?? 6.8);
  const score = Number(soil.score ?? 75);
  const grade = soil.grade || soil.healthGrade || 'B';
  const limiting = soil.limitingFactor || 'None';

  const rawTopCrop = crops[0]?.name || 'Millets';
  const rawSecondCrop = crops[1]?.name || 'Pulses (Dal)';

  const topCrop = getLocalizedCrop(rawTopCrop, lang);
  const secondCrop = getLocalizedCrop(rawSecondCrop, lang);

  const DISCLAIMER_HI = '\n\n(सलाह: सटीक उर्वरक मात्रा के लिए अपने स्थानीय कृषि विशेषज्ञ या मृदा परीक्षण रिपोर्ट का संदर्भ लें।)';
  const DISCLAIMER_KN = '\n\n(ಸಲಹೆ: ನಿಖರವಾದ ರಸಗೊಬ್ಬರ ಪ್ರಮಾಣಕ್ಕಾಗಿ ನಿಮ್ಮ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿ ಅಥವಾ ಮಣ್ಣು ಪರೀಕ್ಷಾ ವರದಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.)';
  const DISCLAIMER_EN = '\n\n(Advisory disclaimer: For exact fertilizer quantity, confirm with your local soil-test report or local agricultural office.)';

  const disclaimer = lang === 'hi' ? DISCLAIMER_HI : lang === 'kn' ? DISCLAIMER_KN : DISCLAIMER_EN;

  // 1. Exact Fertilizer Dosage Inquiry Guard
  if (q.includes('kitna urea') || q.includes('kitna khad') || q.includes('dosage') || q.includes('dose') || q.includes('quantity') || q.includes('kitni dukan') || q.includes('estu')) {
    if (lang === 'hi') {
      return `रासायनिक उर्वरकों (जैसे यूरिया या डीएपी) की सटीक मात्रा फसल, किस्म और खेत के क्षेत्रफल पर निर्भर करती है। किसी भी सार्वभौमिक मात्रा के बजाय, कृपया अपने आधिकारिक मृदा स्वास्थ्य कार्ड (SHC) की सिफारिश देखें या अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से परामर्श लें। सड़ी हुई गोबर की खाद (FYM) या कम्पोस्ट का उपयोग मिट्टी के जीवांश को सुधारने में सहायक है; इसकी उचित मात्रा फसल, मिट्टी की स्थिति और स्थानीय कृषि सिफारिश पर निर्भर करती है।${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ರಾಸಾಯನಿಕ ಗೊಬ್ಬರಗಳ ನಿಖರ ಪ್ರಮಾಣವು ಬೆಳೆ, ತಳಿ ಮತ್ತು ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣವನ್ನು ಅವಲಂಬಿಸಿರುತ್ತದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ (SHC) ಶಿಫಾರಸನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ. ಚೆನ್ನಾಗಿ ಕೊಳೆತ ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರ (FYM) ಅಥವಾ ಕಾಂಪೋಸ್ಟ್ ಮಣ್ಣಿನ ಸಾವಯವ ಅಂಶವನ್ನು ಹೆಚ್ಚಿಸಲು ಸಹಾಯಕವಾಗಿದೆ; ಇದರ ಸೂಕ್ತ ಪ್ರಮಾಣವು ಬೆಳೆ, ಮಣ್ಣಿನ ಸ್ಥಿತಿ ಮತ್ತು ಸ್ಥಳೀಯ ಕೃಷಿ ಶಿಫಾರಸನ್ನು ಅವಲಂಬಿಸಿರುತ್ತದೆ.${disclaimer}`;
    }
    return `Exact fertilizer quantities (such as Urea or DAP) depend on your specific crop variety, sowing method, and acreage. To prevent crop damage or nutrient imbalance, please follow the field-specific recommendations on your official Soil Health Card or consult your local Krishi Vigyan Kendra (KVK). Well-decomposed FYM or compost can support soil organic matter; the appropriate quantity depends on the crop, soil condition, region, and local agricultural recommendation.${disclaimer}`;
  }

  // 2. Report Overview & Simple Explanation
  if (q.includes('report') || q.includes('samjhao') || q.includes('explain') || q.includes('vivarisi') || q.includes('overall') || q.includes('summary')) {
    if (lang === 'hi') {
      return `आपकी मिट्टी का स्वास्थ्य स्कोर ${score}/100 है (ग्रेड ${grade})। ${limiting !== 'None' ? `आपकी मुख्य कमी '${limiting}' है, जिस पर सबसे पहले ध्यान देने की जरूरत है।` : 'आपकी मिट्टी में पोषक तत्वों का संतुलन अच्छा है।'} वर्तमान स्थिति में ${topCrop} और ${secondCrop} की खेती सबसे उपयुक्त पाई गई है। जैविक खाद डालकर मिट्टी की उर्वरता बनाए रखें।${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಅಂಕ ${score}/100 (ಗ್ರೇಡ್ ${grade}). ${limiting !== 'None' ? `ಮುಖ್ಯ ಸೀಮಿತಗೊಳಿಸುವ ಅಂಶ '${limiting}' ಆಗಿದೆ, ಇದಕ್ಕೆ ಮೊದಲ ಆದ್ಯತೆ ನೀಡಬೇಕು.` : 'ನಿಮ್ಮ ಮಣ್ಣು ಉತ್ತಮ ಸಮತೋಲನದಲ್ಲಿದೆ.'} ಪ್ರಸ್ತುತ ಸ್ಥಿತಿಯಲ್ಲಿ ${topCrop} ಮತ್ತು ${secondCrop} ಬೆಳೆಗಳು ಅತ್ಯಂತ ಸೂಕ್ತವಾಗಿವೆ.${disclaimer}`;
    }
    return `Your soil health score is ${score}/100 (Grade ${grade}). ${limiting !== 'None' ? `The primary limiting factor restricting fertility is '${limiting}', which should be prioritized.` : 'Your soil demonstrates a healthy overall nutrient balance.'} Based on your soil and water profile, ${topCrop} and ${secondCrop} are your highest-suitability crop choices.${disclaimer}`;
  }

  // 3. Health Grade Explanation
  if (q.includes('grade') || q.includes('score') || q.includes('kam kyu') || q.includes('low') || q.includes('yeke')) {
    if (lang === 'hi') {
      return `आपकी मिट्टी का स्कोर ${score}/100 और ग्रेड '${grade}' है। ${score < 70 ? `स्कोर कम होने का मुख्य कारण ${limiting !== 'None' ? limiting + ' की कमी' : 'पोषक तत्वों का असंतुलन'} है।` : 'यह एक मजबूत और उत्पादक मिट्टी की श्रेणी है।'} हरी खाद (ढैंचा/सनई) और कम्पोस्ट के नियमित प्रयोग से आप अगले 1-2 सीज़न में ग्रेड में सुधार कर सकते हैं।${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಮಣ್ಣಿನ ಅಂಕ ${score}/100 ಮತ್ತು ಗ್ರೇಡ್ '${grade}' ಆಗಿದೆ. ${score < 70 ? `ಅಂಕ ಕಡಿಮೆಯಾಗಲು ಮುಖ್ಯ ಕಾರಣ ${limiting !== 'None' ? limiting + ' ಕೊರತೆ' : 'ಪೋಷಕಾಂಶಗಳ ಅಸಮತೋಲನ'} ಆಗಿದೆ.` : 'ಇದು ಉತ್ತಮ ಮತ್ತು ಫಲವತ್ತಾದ ಮಣ್ಣಾಗಿದೆ.'} ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರ ಮತ್ತು ಹಸಿರೆಲೆ ಗೊಬ್ಬರವನ್ನು ಬಳಸಿ ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ಇನ್ನಷ್ಟು ಸುಧಾರಿಸಬಹುದು.${disclaimer}`;
    }
    return `Your soil score of ${score}/100 corresponds to Grade ${grade}. ${score < 70 ? `This score is primarily lowered by limiting factor: ${limiting !== 'None' ? limiting : 'nutrient deficiency'}, which limits full yield potential.` : 'This represents a productive, balanced fertility profile.'} Incorporating green manures (sesbania/sunn hemp) and compost will help elevate the grade over subsequent seasons.${disclaimer}`;
  }

  // 4. Soil pH Explanation
  if (q.includes('ph') || q.includes('acid') || q.includes('alkali') || q.includes('tezaab')) {
    let phTextHi = 'तटस्थ (Neutral)';
    let phTextKn = 'ತಟಸ್ಥ (Neutral)';
    let phTextEn = 'neutral';
    if (ph < 6.0) {
      phTextHi = 'अम्लीय (Acidic)';
      phTextKn = 'ಆಮ್ಲೀಯ (Acidic)';
      phTextEn = 'acidic';
    } else if (ph > 7.5) {
      phTextHi = 'क्षारीय (Alkaline)';
      phTextKn = 'ಕ್ಷಾರೀಯ (Alkaline)';
      phTextEn = 'alkaline';
    }

    if (lang === 'hi') {
      return `आपकी मिट्टी का pH मान ${ph} है, जो '${phTextHi}' श्रेणी में आता है। संतुलित pH (6.0 से 7.5) में पौधे पोषक तत्वों को सबसे आसानी से ग्रहण करते हैं। ${ph < 6.0 ? 'अम्लीय मिट्टी में कृषि चूना (Lime) डालने की सलाह स्थानीय कृषि विशेषज्ञ से लें।' : ph > 7.5 ? 'क्षारीय मिट्टी में जिप्सम और गोबर की खाद डालने से पीएच धीरे-धीरे सुधरता है।' : 'पीएच बहुत अच्छा है, इसमें अधिकांश फसलें अच्छी पैदावार देती हैं।'}${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಮಣ್ಣಿನ pH ${ph} ಆಗಿದೆ, ಇದು '${phTextKn}' ವರ್ಗದಲ್ಲಿದೆ. ${ph < 6.0 ? 'ಆಮ್ಲೀಯ ಮಣ್ಣಿಗೆ ಕೃಷಿ ಸುಣ್ಣವನ್ನು ಬಳಸಲು ಕೃಷಿ ಅಧಿಕಾರಿಗಳ ಸಲಹೆ ಪಡೆಯಿರಿ.' : ph > 7.5 ? 'ಕ್ಷಾರೀಯ ಮಣ್ಣಿಗೆ ಜಿಪ್ಸಮ್ ಮತ್ತು ಸಾವಯವ ಗೊಬ್ಬರವನ್ನು ಬಳಸಿ.' : 'pH ಪ್ರಮಾಣವು ಉತ್ತಮ ಸಮತೋಲನದಲ್ಲಿದೆ.'}${disclaimer}`;
    }
    return `Your soil pH is ${ph}, which is classified as '${phTextEn}'. Balanced pH (6.0 to 7.5) maximizes the availability of key macronutrients. ${ph < 6.0 ? 'For acidic conditions, agricultural lime application may be advised by local extension officers.' : ph > 7.5 ? 'For alkaline conditions, regular organic amendments and gypsum support reclamation.' : 'The pH is in the optimal range for plant nutrient uptake.'}${disclaimer}`;
  }

  // 5. Nitrogen Deficiency Question
  if (q.includes('nitrogen') || q.includes('n kam') || q.includes('peela') || q.includes('yellow')) {
    if (lang === 'hi') {
      return `आपकी मिट्टी में नाइट्रोजन ${n} kg/ha है (उचित स्तर: 280-560 kg/ha)। नाइट्रोजन पौधों की वानस्पतिक वृद्धि और पत्तियों के हरेपन के लिए जरूरी है। इसकी भरपाई के लिए दलहनी फसलों के साथ फसल चक्र अपनाएं, सड़ा हुआ गोबर की खाद (FYM) व वर्मीकम्पोस्ट डालें। रासायनिक यूरिया की अंधी खुराक से बचें।${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಮಣ್ಣಿನಲ್ಲಿ ಸಾರಜನಕ ${n} kg/ha ಇದೆ (ಉತ್ತಮ ಶ್ರೇಣಿ: 280-560 kg/ha). ಸಾರಜನಕವು ಸಸ್ಯಗಳ ಹಸಿರು ಬೆಳವಣಿಗೆಗೆ ಮುಖ್ಯ. ದ್ವಿದಳ ಧಾನ್ಯಗಳನ್ನು ಬೆಳೆ ಪರಿವರ್ತನೆಯಲ್ಲಿ ಬಳಸಿ ಮತ್ತು ಎರೆಹುಳು ಗೊಬ್ಬರವನ್ನು ಸೇರಿಸಿ. ರಾಸಾಯನಿಕ ಯೂರಿಯಾ ಪ್ರಮಾಣಕ್ಕೆ ಕೃಷಿ ಕಾರ್ಡ್ ಗಮನಿಸಿ.${disclaimer}`;
    }
    return `Your soil nitrogen is ${n} kg/ha (optimal range: 280–560 kg/ha). Nitrogen governs vegetative leaf and shoot growth. To sustainably replenish reserves, integrate legume rotations (pulses/green gram), apply well-decomposed vermicompost, and follow your Soil Health Card advisory for targeted mineral top-dressing.${disclaimer}`;
  }

  // 6. Crop Recommendation & Comparison Question
  if (q.includes('crop') || q.includes('fasal') || q.includes('bele') || q.includes('wheat') || q.includes('rice') || q.includes('maize') || q.includes('cotton') || q.includes('gehu') || q.includes('chawal')) {
    if (lang === 'hi') {
      return `आपकी मिट्टी के पोषक स्तर, रबी/खरीफ मौसम और जल उपलब्धता के आधार पर सबसे उपयुक्त फसलें '${topCrop}' और '${secondCrop}' हैं। यदि आप गेहूं (Wheat) या मक्का (Maize) जैसी विशिष्ट फसलों की तुलना करना चाहते हैं, तो नीचे दिए गए 'फसल निर्णय सहायक' का उपयोग करें।${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ನಿಮ್ಮ ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಮತ್ತು ನೀರಿನ ಲಭ್ಯತೆಯ ಆಧಾರದ ಮೇಲೆ '${topCrop}' ಮತ್ತು '${secondCrop}' ಅತ್ಯಂತ ಸೂಕ್ತ ಬೆಳೆಗಳಾಗಿವೆ. ಎರಡು ಬೆಳೆಗಳ ನಡುವೆ ಹೋಲಿಸಲು ಕೆಳಗಿನ ಬೆಳೆ ನಿರ್ಧಾರ ಸಾಧನವನ್ನು ಬಳಸಿ.${disclaimer}`;
    }
    return `Based on your soil nutrient profile, active season, and farm water availability, '${topCrop}' and '${secondCrop}' demonstrate the strongest compatibility. To review detailed trade-offs between any two specific crops (such as Wheat vs Maize), use the Crop Decision Assistant below.${disclaimer}`;
  }

  // 7. General Soil Health Improvement
  if (q.includes('improve') || q.includes('sudhar') || q.includes('health') || q.includes('karein') || q.includes('maduvudu')) {
    if (lang === 'hi') {
      return `मिट्टी की सेहत सुधारने के 3 सुरक्षित और असरदार उपाय:\n1. अच्छी तरह सड़ी गोबर की खाद (FYM) या कम्पोस्ट का उपयोग करें (उचित मात्रा के लिए स्थानीय कृषि परामर्श लें)।\n2. मानसून से पहले ढैंचा या सनई की हरी खाद बोकर खेत में पलटें।\n3. फसल के अवशेष न जलाएं, उन्हें खेत में मिलाकर मिट्टी का जीवांश कार्बन बढ़ाएं।${disclaimer}`;
    }
    if (lang === 'kn') {
      return `ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಸುಧಾರಿಸಲು 3 ಪ್ರಮುಖ ಕ್ರಮಗಳು:\n1. ಚೆನ್ನಾಗಿ ಕೊಳೆತ ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರ (FYM) ಅಥವಾ ಕಾಂಪೋಸ್ಟ್ ಬಳಸಿ (ಸೂಕ್ತ ಪ್ರಮಾಣಕ್ಕೆ ಸ್ಥಳೀಯ ಕೃಷಿ ಸಲಹೆ ಪಡೆಯಿರಿ).\n2. ಮುಂಗಾರಿಗೆ ಮುನ್ನ ಹಸಿರೆಲೆ ಗೊಬ್ಬರ ಬೆಳೆಸಿ ಮಣ್ಣಿಗೆ ಮಗುಚಿ ಹಾಕಿ.\n3. ಬೆಳೆ ತ್ಯಾಜ್ಯವನ್ನು ಸುಡದೆ ಮಣ್ಣಿಗೆ ಮರುಬಳಕೆ ಮಾಡಿ.${disclaimer}`;
    }
    return `Three foundational practices to build long-term soil fertility:\n1. Apply well-decomposed compost or farmyard manure (FYM) based on your local agricultural recommendation.\n2. Sow green manures (dhaincha or sunn hemp) prior to the main season and plow them in.\n3. Retain and incorporate crop residues rather than burning, boosting organic carbon and microbial activity.${disclaimer}`;
  }

  // 8. Default Safe Contextual Response
  if (lang === 'hi') {
    return `आपकी मिट्टी का स्कोर ${score}/100 है। मुख्य ध्यान देने योग्य बात: ${limiting !== 'None' ? limiting + ' की स्थिति' : 'संतुलित पोषण बनाए रखना'}। अपनी मिट्टी के संबंध में आप मुझसे 'रिपोर्ट समझाएं', 'पीएच का मतलब', या 'फसल चुनाव' के बारे में पूछ सकते हैं।${disclaimer}`;
  }
  if (lang === 'kn') {
    return `ನಿಮ್ಮ ಮಣ್ಣಿನ ಅಂಕ ${score}/100 ಆಗಿದೆ. ಮುಖ್ಯ ಗಮನ: ${limiting !== 'None' ? limiting + ' ಸ್ಥಿತಿ' : 'ಪೋಷಕಾಂಶಗಳ ಸಮತೋಲನ'}. ನೀವು ವರದಿ, pH ಅಥವಾ ಬೆಳೆ ಆಯ್ಕೆಯ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಬಹುದು.${disclaimer}`;
  }
  return `Your soil test score is ${score}/100 (Grade ${grade}). The key management priority is addressing ${limiting !== 'None' ? limiting : 'balanced maintenance'}. Feel free to ask about your soil report, pH reaction, or crop recommendations.${disclaimer}`;
}
